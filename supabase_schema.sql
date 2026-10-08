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
  game_id text not null check(game_id in ('slot','poker','bird')),
  rounds_played bigint not null default 0,total_wagered numeric(20,6) not null default 0,
  total_won numeric(20,6) not null default 0,biggest_win numeric(20,6) not null default 0,
  biggest_multiplier numeric(20,6) not null default 0,updated_at timestamptz not null default now(),unique(user_id,game_id)
);
create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),round_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check(game_id in ('slot','poker','bird')),
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
  last_game_id text check(last_game_id in ('lobby','slot','poker','bird')),
  selected_bets jsonb not null default '{"slot":2,"poker":2,"bird":1}'::jsonb,
  updated_at timestamptz not null default now()
);
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
create or replace function public.begin_game_round(p_round_id uuid,p_game_id text,p_bet numeric,p_expected_revision bigint,p_metadata jsonb default '{}',p_recovery jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird') or p_bet is null or p_bet<0 or p_bet>1000000000000 then raise exception 'Invalid round';end if;
 perform public.vault_validate_payload(p_metadata,p_recovery);
 select * into w from public.wallets where user_id=u for update;
 if not found then raise exception 'Wallet missing';end if;
 select * into r from public.game_rounds where round_id=p_round_id;
 if found then
  if r.user_id<>u or r.game_id<>p_game_id or r.bet<>round(p_bet,6) then raise exception 'Round mismatch';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true,'status',r.status);
 end if;
 if exists(select 1 from public.game_rounds where user_id=u and game_id=p_game_id and status='started') then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 if p_expected_revision is null or w.revision<>p_expected_revision then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 if w.balance<p_bet then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 insert into public.game_rounds(round_id,user_id,game_id,bet,metadata) values(p_round_id,u,p_game_id,round(p_bet,6),p_metadata);
 update public.wallets set balance=balance-round(p_bet,6),revision=revision+1,recovery=case when p_game_id='slot' then p_recovery else recovery end,updated_at=now() where user_id=u returning * into w;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false,'status','started');
end $$;
-- Idempotent finalization: wallet, round, stats and XP settle together.
create or replace function public.record_game_round(p_round_id uuid,p_game_id text,p_bet numeric,p_payout numeric,p_multiplier numeric,p_result text,p_metadata jsonb default '{}',p_status text default 'settled',p_recovery jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird') or p_bet is null or p_bet<0 or p_status is null or p_payout is null or p_payout<0 or p_payout>1000000000000 or p_multiplier is null or p_multiplier<0
   or p_multiplier>1000000000000 or p_result is null or length(p_result)>200 or p_status not in ('settled','cancelled') then raise exception 'Invalid settlement';end if;
 perform public.vault_validate_payload(p_metadata,p_recovery);
 select * into w from public.wallets where user_id=u for update;
 select * into r from public.game_rounds where round_id=p_round_id and user_id=u for update;
 if not found or r.game_id<>p_game_id or r.bet<>round(p_bet,6) then raise exception 'Round missing or mismatch';end if;
 if r.status<>'started' then
  if r.payout<>round(p_payout,6) or r.status<>p_status then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true,'status',r.status);
 end if;
 update public.game_rounds set payout=round(p_payout,6),multiplier=round(p_multiplier,6),result=p_result,metadata=metadata||p_metadata,status=p_status,settled_at=now() where round_id=p_round_id;
 update public.wallets set balance=balance+round(p_payout,6),revision=revision+1,recovery=case when p_game_id='slot' then p_recovery else recovery end,updated_at=now() where user_id=u returning * into w;
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
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function public.handle_new_user(),public.vault_validate_payload(jsonb,jsonb),public.vault_touch_updated_at() from public,anon,authenticated;
revoke all on function public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb),public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb),public.save_vault_settings(jsonb,timestamptz) from public,anon;
grant execute on function public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb),public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb),public.save_vault_settings(jsonb,timestamptz) to authenticated;
-- Future server-authoritative apply_wallet_transaction must validate outcomes on the server.
-- Do not expose an unrestricted set_balance RPC or wallet UPDATE grant.
commit;
