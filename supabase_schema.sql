-- VAULT foundation. Client-authoritative demo outcomes; NOT a real-money settlement engine.
begin;
create extension if not exists pgcrypto;
create table if not exists public.vault_configuration (
  id boolean primary key default true check (id),
  starting_balance numeric(20,6) not null default 1000000 check (starting_balance >= 0)
);
insert into public.vault_configuration(id) values(true) on conflict do nothing;
revoke all on public.vault_configuration from anon, authenticated;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (length(username) between 1 and 40),
  avatar_url text check (avatar_url is null or (length(avatar_url)<=2048 and avatar_url ~ '^https://')),
  level integer not null default 1 check(level>=1), xp bigint not null default 0 check(xp>=0),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(20,6) not null check(balance>=0), revision bigint not null default 0,
  recovery jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.game_stats (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines')),
  rounds_played bigint not null default 0,total_wagered numeric(20,6) not null default 0,
  total_won numeric(20,6) not null default 0,biggest_win numeric(20,6) not null default 0,
  biggest_multiplier numeric(20,6) not null default 0,updated_at timestamptz not null default now(),unique(user_id,game_id)
);
create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),round_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines')),
  status text not null default 'started' check(status in ('started','settled','cancelled')),
  bet numeric(20,6) not null check(bet>=0),payout numeric(20,6) not null default 0 check(payout>=0),
  multiplier numeric(20,6) not null default 0 check(multiplier>=0),result text not null default '',
  metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),settled_at timestamptz
);
create index if not exists game_rounds_user_date on public.game_rounds(user_id,created_at desc);
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),code text not null unique,title text not null,
  description text,created_at timestamptz not null default now()
);
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),primary key(user_id,achievement_id)
);
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sound_enabled boolean not null default true,music_enabled boolean not null default false,
  fast_mode boolean not null default false,fast_bonus boolean not null default false,scatter_boost boolean not null default false,
  last_game_id text check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines')),
  selected_bets jsonb not null default '{"slot":2,"poker":2,"bird":1}'::jsonb,
  updated_at timestamptz not null default now()
);
-- Existing installations: extend only game/screen registries, preserving all rows and RLS.
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines'));
create or replace function public.vault_touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end $$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.vault_touch_updated_at();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,username) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''),'Player'),40));
 insert into public.wallets(user_id,balance) select new.id,starting_balance from public.vault_configuration where id=true;
 insert into public.user_settings(user_id,last_game_id) values(new.id,'lobby');
 return new;
end $$;
drop trigger if exists vault_on_auth_user_created on auth.users;
create trigger vault_on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Existing identities receive defaults once too.
insert into public.profiles(id,username) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'username'),''),'Player'),40) from auth.users on conflict do nothing;
insert into public.wallets(user_id,balance) select u.id,c.starting_balance from auth.users u cross join public.vault_configuration c on conflict do nothing;
insert into public.user_settings(user_id,last_game_id) select id,'lobby' from auth.users on conflict do nothing;
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.game_stats enable row level security;
alter table public.game_rounds enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_settings enable row level security;
alter table public.vault_configuration enable row level security;
-- Explicitly restrict grants: RLS alone does not protect privileged columns.
revoke all on public.profiles,public.wallets,public.game_stats,public.game_rounds,public.achievements,public.user_achievements,public.user_settings from anon,authenticated;
grant select on public.profiles,public.wallets,public.game_stats,public.game_rounds,public.achievements,public.user_achievements,public.user_settings to authenticated;
grant update(username,avatar_url) on public.profiles to authenticated;
-- Settings updates go through timestamp-checked RPC below.
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists wallets_read_self on public.wallets;
create policy wallets_read_self on public.wallets for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists stats_read_self on public.game_stats;
create policy stats_read_self on public.game_stats for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists rounds_read_self on public.game_rounds;
create policy rounds_read_self on public.game_rounds for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select to authenticated using(true);
drop policy if exists user_achievements_read_self on public.user_achievements;
create policy user_achievements_read_self on public.user_achievements for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists settings_read_self on public.user_settings;
create policy settings_read_self on public.user_settings for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.vault_validate_payload(p_metadata jsonb,p_recovery jsonb) returns void language plpgsql set search_path='' as $$
begin
 if p_metadata is null or p_recovery is null or jsonb_typeof(p_metadata)<>'object' or jsonb_typeof(p_recovery)<>'object'
    or octet_length(p_metadata::text)>32768 or octet_length(p_recovery::text)>65536 then raise exception 'Invalid payload';end if;
end $$;
-- Debit + round insert + stable recovery checkpoint are one transaction.

-- Explicit stable checkpoint validation; no transient UI/animation data enters the database.
create or replace function public.vault_mines_multiplier(c jsonb) returns numeric language plpgsql immutable set search_path='' as $$
declare n integer;k integer;v integer;p numeric:=1;safe integer;mult numeric;mines integer[];opened integer[];
begin
 if c is null or jsonb_typeof(c)<>'object' or not c ?& array['version','roundId','seed','bet','mineCount','minePositions','opened','status','multiplier','payout'] or exists(select 1 from jsonb_each(c) e where e.value='null'::jsonb) or c->>'version'<>'1' or (c->>'roundId')::uuid is null
  or (c->>'seed')::bigint not between 0 and 4294967295 or (c->>'bet')::numeric<=0
  or (c->>'bet')::numeric>1000000000000 or c->>'status' not in ('PLAYING','CASHED_OUT','BUST') then raise exception 'Invalid Mines checkpoint';end if;
 n:=(c->>'mineCount')::integer;
 if n is null or n not between 1 and 24 or jsonb_typeof(c->'minePositions')<>'array' or jsonb_typeof(c->'opened')<>'array' then raise exception 'Invalid Mines field';end if;
 select array_agg(value::integer order by value::integer) into mines from jsonb_array_elements_text(c->'minePositions');
 select coalesce(array_agg(value::integer order by ord),array[]::integer[]) into opened from jsonb_array_elements_text(c->'opened') with ordinality as a(value,ord);
 if cardinality(mines)<>n or (select count(distinct x) from unnest(mines) x)<>n or exists(select 1 from unnest(mines) x where x not between 0 and 24)
  or cardinality(opened)>25 or (select count(distinct x) from unnest(opened) x)<>cardinality(opened) or exists(select 1 from unnest(opened) x where x not between 0 and 24) then raise exception 'Invalid Mines positions';end if;
 k:=cardinality(opened);safe:=k;
 if c->>'status'='BUST' then
  if k<1 or not opened[k]=any(mines) then raise exception 'Invalid Mines bust';end if;safe:=k-1;
 end if;
 if safe>25-n then raise exception 'Invalid Mines picks';end if;
 if exists(select 1 from unnest(opened[1:safe]) x where x=any(mines)) then raise exception 'Mine already hit';end if;
 if safe>0 then for v in 0..safe-1 loop p:=p*(25-n-v)::numeric/(25-v)::numeric;end loop;end if;
 mult:=case when safe=0 then 1 else least(50000,0.97/p) end;
 if c->>'status'='PLAYING' and (k>=25-n or mult>=50000) then raise exception 'Mines automatic cashout required';end if;
 if c->>'status'='CASHED_OUT' and k<1 then raise exception 'First safe pick required';end if;
 if c->>'status'='BUST' then mult:=0;end if;
 if (c->>'multiplier')::numeric is null or abs((c->>'multiplier')::numeric-mult)>0.0000001
  or (c->>'payout')::numeric is distinct from (case when c->>'status'='CASHED_OUT' then round((c->>'bet')::numeric*mult,6) else 0 end) then raise exception 'Invalid Mines payout';end if;
 return mult;
end $$;
revoke all on function public.vault_mines_multiplier(jsonb) from public,anon,authenticated;
-- A prefix is immutable: an acknowledged safe pick cannot disappear or be replaced.
create or replace function public.vault_mines_extends(previous jsonb, candidate jsonb) returns boolean language sql immutable set search_path='' as $$
 select (previous - array['opened','status','multiplier','payout'])=(candidate - array['opened','status','multiplier','payout'])
 and jsonb_array_length(candidate->'opened')>=jsonb_array_length(previous->'opened')
 and not exists(select 1 from jsonb_array_elements(previous->'opened') with ordinality as a(value,ord) where value is distinct from candidate->'opened'->((ord-1)::integer));
$$;
revoke all on function public.vault_mines_extends(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.begin_game_round(p_round_id uuid,p_game_id text,p_bet numeric,p_expected_revision bigint,p_metadata jsonb default '{}',p_recovery jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird','blackjack','baccarat','swamp','mines') or p_bet is null or p_bet<0 or p_bet>1000000000000 then raise exception 'Invalid round';end if;
 perform public.vault_validate_payload(p_metadata,p_recovery);
 select * into w from public.wallets where user_id=u for update;
 if not found then raise exception 'Wallet missing';end if;
 select * into r from public.game_rounds where round_id=p_round_id;
 if found then
  if r.user_id<>u or r.game_id<>p_game_id or r.bet<>round(p_bet,6) then raise exception 'Round mismatch';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true,'status',r.status);
 end if;
 if not public.vault_game_access() and not (p_bet=0 and ((p_game_id='slot' and coalesce((w.recovery->'slotBonus'->>'freeSpins')::integer,0)>0) or (p_game_id='swamp' and coalesce(p_metadata->>'freeSpin'='true',false) and coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)>0))) then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
 if exists(select 1 from public.game_rounds where user_id=u and game_id=p_game_id and status='started') then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 -- Free-spin entitlements cannot be reused across tabs/devices by rebasing a stale queue.
 if p_game_id='swamp' then
  if p_metadata->>'freeSpin'='true' then
   if p_bet<>0 or coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)<1
    or p_metadata->>'featureId' is distinct from w.recovery->'swampBonus'->>'featureId'
    or (p_metadata->>'freeSpinIndex')::integer is distinct from (w.recovery->'swampBonus'->>'spinsPlayed')::integer+1
    or (p_recovery->'swampBonus'->>'remaining')::integer is distinct from (w.recovery->'swampBonus'->>'remaining')::integer-1
    or (p_recovery->'swampBonus'->>'spinsPlayed')::integer is distinct from (w.recovery->'swampBonus'->>'spinsPlayed')::integer+1
    or p_recovery->'swampBonus'->>'featureId' is distinct from w.recovery->'swampBonus'->>'featureId'
    or (p_recovery->'swampBonus'->>'bet')::numeric is distinct from (w.recovery->'swampBonus'->>'bet')::numeric
    or p_recovery->'swampBonus'->>'collectors' is distinct from w.recovery->'swampBonus'->>'collectors'
    or p_recovery->'swampBonus'->>'tier' is distinct from w.recovery->'swampBonus'->>'tier'
    or (p_recovery->'swampBonus'->>'totalWinX')::numeric is distinct from (w.recovery->'swampBonus'->>'totalWinX')::numeric
   then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  elsif p_bet<=0 or coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)>0 then
   raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';
  end if;
 end if;
 if p_game_id='swamp' and p_metadata ? 'purchaseType' then
  if p_metadata->>'purchaseType' not in ('bonus','super') or coalesce((p_metadata->>'purchaseStake')::numeric,0)<=0
   or (p_metadata->>'purchaseCostX')::numeric is distinct from (case p_metadata->>'purchaseType' when 'bonus' then 77 else 350 end)::numeric
   or p_bet<>round((p_metadata->>'purchaseStake')::numeric*(p_metadata->>'purchaseCostX')::numeric,6)
   or (p_recovery->'swampBonus'->>'bet')::numeric is distinct from (p_metadata->>'purchaseStake')::numeric
   or p_recovery->'swampBonus'->>'featureId' is distinct from p_round_id::text
   or (p_recovery->'swampBonus'->>'remaining')::int is distinct from (case p_metadata->>'purchaseType' when 'bonus' then 10 else 20 end)
   or (p_recovery->'swampBonus'->>'collectors')::int is distinct from 0
   or (p_recovery->'swampBonus'->>'tier')::int is distinct from 0
   or (p_recovery->'swampBonus'->>'spinsPlayed')::int is distinct from 0
   or (p_recovery->'swampBonus'->>'totalWinX')::numeric is distinct from 0 then raise exception 'Invalid swamp purchase';end if;
 end if;
 if p_game_id='mines' then
  perform public.vault_mines_multiplier(p_metadata->'mines');
  if p_bet<=0 or p_metadata->'mines'->>'status'<>'PLAYING' or jsonb_array_length(p_metadata->'mines'->'opened')<>0
   or (p_metadata->'mines'->>'roundId')::uuid<>p_round_id or (p_metadata->'mines'->>'bet')::numeric<>round(p_bet,6)
   or p_recovery->'minesRound' is distinct from p_metadata->'mines' then raise exception 'Invalid Mines start';end if;
 end if;
 if p_expected_revision is null or w.revision<>p_expected_revision then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 if w.balance<p_bet then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 insert into public.game_rounds(round_id,user_id,game_id,bet,metadata) values(p_round_id,u,p_game_id,round(p_bet,6),p_metadata);
 update public.wallets set balance=balance-round(p_bet,6),revision=revision+1,recovery=case when p_game_id='slot' then recovery||jsonb_build_object('slotBonus',p_recovery->'slotBonus') when p_game_id='swamp' then recovery||jsonb_build_object('swampBonus',p_recovery->'swampBonus') when p_game_id='mines' then recovery||jsonb_build_object('minesRound',p_recovery->'minesRound') else recovery end,updated_at=now() where user_id=u returning * into w;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false,'status','started');
end $$;
-- Idempotent finalization: wallet, round, stats and XP settle together.
create or replace function public.record_game_round(p_round_id uuid,p_game_id text,p_bet numeric,p_payout numeric,p_multiplier numeric,p_result text,p_metadata jsonb default '{}',p_status text default 'settled',p_recovery jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird','blackjack','baccarat','swamp','mines') or p_bet is null or p_bet<0 or p_status is null or p_payout is null or p_payout<0 or p_payout>1000000000000 or p_multiplier is null or p_multiplier<0
   or p_multiplier>1000000000000 or p_result is null or length(p_result)>200 or p_status not in ('settled','cancelled') then raise exception 'Invalid settlement';end if;
 perform public.vault_validate_payload(p_metadata,p_recovery);
 select * into w from public.wallets where user_id=u for update;
 select * into r from public.game_rounds where round_id=p_round_id and user_id=u for update;
 if not found or r.game_id<>p_game_id then raise exception 'Round missing or mismatch';end if;
 if r.status<>'started' then
  if r.bet<>round(p_bet,6) then raise exception 'Round missing or mismatch';end if;
  if r.payout<>round(p_payout,6) or r.status<>p_status then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true,'status',r.status);
 end if;
 if p_game_id='mines' then
  perform public.vault_mines_multiplier(p_metadata->'mines');
  if not public.vault_mines_extends(r.metadata->'mines',p_metadata->'mines')
   or p_metadata->'mines'->>'status' not in ('CASHED_OUT','BUST')
   or p_status<>'settled' or p_recovery->'minesRound' is distinct from p_metadata->'mines'
   or (p_metadata->'mines'->>'payout')::numeric<>round(p_payout,6) then
    raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';
  end if;
 end if;
 -- DOUBLE adds exactly one original stake. Its debit joins the final wallet/round transaction.
 -- Client demo outcomes remain client-authoritative; no direct wallet write grant is added.
 if r.bet<>round(p_bet,6) then
  if p_game_id<>'blackjack' or p_bet<>r.bet*2 or p_metadata->>'doubled' is distinct from 'true' then raise exception 'Round missing or mismatch';end if;
  if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
  if w.balance<p_bet-r.bet then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  update public.wallets set balance=balance-(p_bet-r.bet) where user_id=u;
  r.bet:=round(p_bet,6);
 end if;
 update public.game_rounds set bet=r.bet,payout=round(p_payout,6),multiplier=round(p_multiplier,6),result=p_result,metadata=metadata||p_metadata,status=p_status,settled_at=now() where round_id=p_round_id;
 update public.wallets set balance=balance+round(p_payout,6),revision=revision+1,recovery=case when p_game_id='slot' then recovery||jsonb_build_object('slotBonus',p_recovery->'slotBonus') when p_game_id='swamp' then recovery||jsonb_build_object('swampBonus',p_recovery->'swampBonus') when p_game_id='mines' then recovery||jsonb_build_object('minesRound',p_recovery->'minesRound') else recovery end,updated_at=now() where user_id=u returning * into w;
 insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier)
 values(u,p_game_id,1,r.bet,round(p_payout,6),round(p_payout,6),round(p_multiplier,6))
 on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,
 total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,
 biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
 update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false,'status',p_status);
end $$;
create or replace function public.save_vault_settings(p_settings jsonb,p_updated_at timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.user_settings;
begin
 if u is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_settings)<>'object' or octet_length(p_settings::text)>4096 or p_updated_at is null then raise exception 'Invalid settings';end if;
 -- Serialize updates per identity and clamp clocks from the future.
 select * into s from public.user_settings where user_id=u for update;
 if p_updated_at<=s.updated_at then return to_jsonb(s);end if;
 update public.user_settings set sound_enabled=coalesce((p_settings->>'sound')::boolean,s.sound_enabled),
 music_enabled=coalesce((p_settings->>'music')::boolean,s.music_enabled),fast_mode=coalesce((p_settings->>'fastGame')::boolean,s.fast_mode),
 fast_bonus=coalesce((p_settings->>'fastBonus')::boolean,s.fast_bonus),scatter_boost=coalesce((p_settings->>'scatterBoost')::boolean,s.scatter_boost),
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function public.handle_new_user(),public.vault_validate_payload(jsonb,jsonb),public.vault_touch_updated_at() from public,anon,authenticated;
revoke all on function public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb),public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb),public.save_vault_settings(jsonb,timestamptz) from public,anon;
grant execute on function public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb),public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb),public.save_vault_settings(jsonb,timestamptz) to authenticated;
-- Future server-authoritative apply_wallet_transaction must validate outcomes on the server.
-- Do not expose an unrestricted set_balance RPC or wallet UPDATE grant.
create or replace function public.table_games_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',1); $$;
revoke all on function public.table_games_capabilities() from public,anon;
grant execute on function public.table_games_capabilities() to authenticated;

create or replace function public.swamp_slot_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',2,'purchaseVersion',1,'siteAdminVersion',1); $$;
revoke all on function public.swamp_slot_capabilities() from public,anon;
grant execute on function public.swamp_slot_capabilities() to authenticated;

commit;


-- Owned, idempotent safe-pick checkpoint. It never charges a bet or changes wallet revision.
create or replace function public.save_mines_checkpoint(p_round_id uuid,p_checkpoint jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;previous jsonb;
begin
 if u is null then raise exception 'Authentication required';end if;
 perform public.vault_validate_payload(p_checkpoint,'{}');perform public.vault_mines_multiplier(p_checkpoint);
 select * into w from public.wallets where user_id=u for update;
 select * into r from public.game_rounds where round_id=p_round_id and user_id=u and game_id='mines' for update;
 if not found then raise exception 'Round missing or mismatch';end if;
 if r.status<>'started' then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 previous:=r.metadata->'mines';
 if p_checkpoint->>'status'<>'PLAYING' or (p_checkpoint->>'roundId')::uuid<>p_round_id then raise exception 'Invalid Mines checkpoint';end if;
 if public.vault_mines_extends(p_checkpoint,previous) then return jsonb_build_object('duplicate',true);end if;
 if not public.vault_mines_extends(previous,p_checkpoint) then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 update public.game_rounds set metadata=jsonb_set(metadata,'{mines}',p_checkpoint) where round_id=p_round_id;
 update public.wallets set recovery=jsonb_set(recovery,'{minesRound}',p_checkpoint),updated_at=now() where user_id=u;
 return jsonb_build_object('duplicate',false);
end $$;
create or replace function public.mines_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',1);$$;
revoke all on function public.save_mines_checkpoint(uuid,jsonb),public.mines_capabilities() from public,anon;
grant execute on function public.save_mines_checkpoint(uuid,jsonb),public.mines_capabilities() to authenticated;




-- BEGIN VAULT ADMIN SCHEMA
-- VAULT administrative authority stays in PostgreSQL. No client can grant itself a role.
create table if not exists public.vault_admin_members(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table if not exists public.vault_user_access(user_id uuid primary key references auth.users(id) on delete cascade,enabled boolean not null default true,updated_at timestamptz not null default now());
create table if not exists public.vault_user_presence(user_id uuid primary key references auth.users(id) on delete cascade,last_seen_at timestamptz not null default now());
create table if not exists public.vault_admin_audit(id uuid primary key default gen_random_uuid(),request_id uuid unique not null,actor_id uuid not null references auth.users(id),user_id uuid not null references auth.users(id),action text not null check(action in ('balance','access')),operation text,amount numeric(20,6),old_balance numeric(20,6),new_balance numeric(20,6),enabled boolean,reason text not null,created_at timestamptz not null default now());
create index if not exists vault_admin_audit_user_time on public.vault_admin_audit(user_id,created_at desc);
alter table public.vault_admin_members enable row level security;
alter table public.vault_user_access enable row level security;
alter table public.vault_user_presence enable row level security;
alter table public.vault_admin_audit enable row level security;
revoke all on public.vault_admin_members,public.vault_user_access,public.vault_user_presence,public.vault_admin_audit from anon,authenticated;
create or replace function public.vault_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vault_admin_members m join auth.users u on u.id=m.user_id where m.user_id=auth.uid() and lower(u.email)='al.kiryuhancev@yandex.ru' and u.email_confirmed_at is not null);
$$;
revoke all on function public.vault_is_admin() from public,anon,authenticated;
create or replace function public.vault_game_access() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((select enabled from public.vault_user_access where user_id=auth.uid()),true);
$$;
revoke all on function public.vault_game_access() from public,anon,authenticated;
-- Only the confirmed, designated identity receives membership. Email changes revoke it.
create or replace function public.vault_sync_admin_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if lower(new.email)='al.kiryuhancev@yandex.ru' and new.email_confirmed_at is not null then
  insert into public.vault_admin_members(user_id) values(new.id) on conflict do nothing;
 else delete from public.vault_admin_members where user_id=new.id;end if;return new;
end $$;
revoke all on function public.vault_sync_admin_identity() from public,anon,authenticated;
drop trigger if exists vault_admin_identity on auth.users;
create trigger vault_admin_identity after insert or update of email,email_confirmed_at on auth.users for each row execute function public.vault_sync_admin_identity();
insert into public.vault_admin_members(user_id) select id from auth.users where lower(email)='al.kiryuhancev@yandex.ru' and email_confirmed_at is not null on conflict do nothing;
delete from public.vault_admin_members m where not exists(select 1 from auth.users u where u.id=m.user_id and lower(u.email)='al.kiryuhancev@yandex.ru' and u.email_confirmed_at is not null);
create or replace function public.vault_admin_context() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('isAdmin',public.vault_is_admin());$$;
create or replace function public.vault_presence_heartbeat() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required';end if;
 insert into public.vault_user_presence(user_id,last_seen_at) values(u,now()) on conflict(user_id) do update set last_seen_at=excluded.last_seen_at where public.vault_user_presence.last_seen_at<now()-interval '20 seconds';
 return jsonb_build_object('enabled',public.vault_game_access());
end $$;
create or replace function public.vault_admin_users(p_search text default '',p_limit integer default 30,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 if p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 100000 or length(coalesce(p_search,''))>100 then raise exception 'VAULT_ADMIN_INVALID';end if;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into result from (
 select u.id user_id,u.email,p.username,w.balance,w.revision,coalesce(x.enabled,true) enabled,
 exists(select 1 from public.vault_admin_members am where am.user_id=u.id) is_admin,u.last_sign_in_at,
 h.last_seen_at,coalesce(h.last_seen_at>now()-interval '2 minutes',false) online,
 (select max(created_at) from public.game_rounds r where r.user_id=u.id) last_round_at,
 (select coalesce(sum(rounds_played),0) from public.game_stats gs where gs.user_id=u.id) rounds_played
 from auth.users u join public.profiles p on p.id=u.id join public.wallets w on w.user_id=u.id
 left join public.vault_user_access x on x.user_id=u.id left join public.vault_user_presence h on h.user_id=u.id
 where coalesce(p_search,'')='' or u.email ilike '%'||p_search||'%' or p.username ilike '%'||p_search||'%'
 order by u.created_at desc,u.id limit p_limit offset p_offset
 ) a;return result;
end $$;
create or replace function public.vault_admin_activity(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rounds jsonb;audit jsonb;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into rounds from (select round_id,game_id,bet,payout,multiplier,result,status,created_at,settled_at from public.game_rounds where user_id=p_user_id order by created_at desc,round_id desc limit 25) a;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into audit from (select actor_id,action,operation,amount,old_balance,new_balance,enabled,reason,created_at from public.vault_admin_audit where user_id=p_user_id order by created_at desc,id desc limit 25) a;
 return jsonb_build_object('rounds',rounds,'audit',audit);
end $$;
create or replace function public.vault_admin_balance(p_request_id uuid,p_user_id uuid,p_operation text,p_amount numeric,p_reason text,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();w public.wallets;a public.vault_admin_audit;next_balance numeric;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 if p_request_id is null or p_user_id is null or p_operation is null or p_operation not in ('credit','debit','set') or p_amount is null or p_amount<0 or p_amount>1000000000000 or p_amount::text in ('NaN','Infinity','-Infinity') or p_reason is null or length(trim(p_reason)) not between 3 and 200 or p_expected_revision is null then raise exception 'VAULT_ADMIN_INVALID';end if;
 -- Account lock serializes admin changes with every game begin/settlement.
 select * into w from public.wallets where user_id=p_user_id for update;
 if not found then raise exception 'VAULT_ADMIN_INVALID';end if;
 select * into a from public.vault_admin_audit where request_id=p_request_id;
 if found then
  if a.actor_id<>actor or a.user_id<>p_user_id or a.action<>'balance' or a.operation<>p_operation or a.amount<>round(p_amount,6) or a.reason<>trim(p_reason) then raise exception 'VAULT_ADMIN_INVALID';end if;
  return jsonb_build_object('duplicate',true,'balance',w.balance,'revision',w.revision);
 end if;
 if w.revision<>p_expected_revision then raise exception 'VAULT_ADMIN_REVISION';end if;
 if exists(select 1 from public.game_rounds where user_id=p_user_id and status='started') then raise exception 'VAULT_ADMIN_ACTIVE_ROUND';end if;
 next_balance:=round(case p_operation when 'credit' then w.balance+p_amount when 'debit' then w.balance-p_amount else p_amount end,6);
 if next_balance<0 then raise exception 'VAULT_ADMIN_FUNDS';end if;
 if next_balance>1000000000000 then raise exception 'VAULT_ADMIN_INVALID';end if;
 insert into public.vault_admin_audit(request_id,actor_id,user_id,action,operation,amount,old_balance,new_balance,reason) values(p_request_id,actor,p_user_id,'balance',p_operation,round(p_amount,6),w.balance,next_balance,trim(p_reason));
 update public.wallets set balance=next_balance,revision=revision+1,updated_at=now() where user_id=p_user_id returning * into w;
 return jsonb_build_object('duplicate',false,'balance',w.balance,'revision',w.revision);
end $$;
create or replace function public.vault_admin_access(p_request_id uuid,p_user_id uuid,p_enabled boolean,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();a public.vault_admin_audit;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 if p_request_id is null or p_user_id is null or p_enabled is null or p_reason is null or length(trim(p_reason)) not between 3 and 200 then raise exception 'VAULT_ADMIN_INVALID';end if;
 if not p_enabled and exists(select 1 from public.vault_admin_members where user_id=p_user_id) then raise exception 'VAULT_ADMIN_SELF_BLOCK';end if;
 -- Same wallet lock order as balance mutations, including idempotent request replays.
 perform 1 from public.wallets where user_id=p_user_id for update;
 if not found then raise exception 'VAULT_ADMIN_INVALID';end if;
 select * into a from public.vault_admin_audit where request_id=p_request_id;
 if found then
  if a.actor_id<>actor or a.user_id<>p_user_id or a.action<>'access' or a.enabled<>p_enabled or a.reason<>trim(p_reason) then raise exception 'VAULT_ADMIN_INVALID';end if;
  return jsonb_build_object('duplicate',true,'enabled',a.enabled);
 end if;
 insert into public.vault_user_access(user_id,enabled) values(p_user_id,p_enabled) on conflict(user_id) do update set enabled=excluded.enabled,updated_at=now();
 insert into public.vault_admin_audit(request_id,actor_id,user_id,action,enabled,reason) values(p_request_id,actor,p_user_id,'access',p_enabled,trim(p_reason));
 return jsonb_build_object('duplicate',false,'enabled',p_enabled);
end $$;
revoke all on function public.vault_admin_context(),public.vault_presence_heartbeat(),public.vault_admin_users(text,integer,integer),public.vault_admin_activity(uuid),public.vault_admin_balance(uuid,uuid,text,numeric,text,bigint),public.vault_admin_access(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.vault_admin_context(),public.vault_presence_heartbeat(),public.vault_admin_users(text,integer,integer),public.vault_admin_activity(uuid),public.vault_admin_balance(uuid,uuid,text,numeric,text,bigint),public.vault_admin_access(uuid,uuid,boolean,text) to authenticated;

-- END VAULT ADMIN SCHEMA
