-- VAULT MINES incremental update. Run the ENTIRE file, from BEGIN through COMMIT. Existing accounts, balances and history are preserved.
begin;
-- Existing installations: extend only game/screen registries, preserving all rows and RLS.
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines'));

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
create or replace function public.swamp_slot_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',1); $$;
revoke all on function public.swamp_slot_capabilities() from public,anon;
grant execute on function public.swamp_slot_capabilities() to authenticated;

revoke all on function public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb),public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb),public.save_vault_settings(jsonb,timestamptz) from public,anon;
grant execute on function public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb),public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb),public.save_vault_settings(jsonb,timestamptz) to authenticated;

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

commit;
