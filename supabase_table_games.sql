-- Apply once in the existing Supabase SQL Editor. Safe to repeat; no data reset.
begin;
-- Existing installations: extend only game/screen registries, preserving all rows and RLS.
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat'));
create or replace function public.begin_game_round(p_round_id uuid,p_game_id text,p_bet numeric,p_expected_revision bigint,p_metadata jsonb default '{}',p_recovery jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird','blackjack','baccarat') or p_bet is null or p_bet<0 or p_bet>1000000000000 then raise exception 'Invalid round';end if;
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
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird','blackjack','baccarat') or p_bet is null or p_bet<0 or p_status is null or p_payout is null or p_payout<0 or p_payout>1000000000000 or p_multiplier is null or p_multiplier<0
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
 -- DOUBLE adds exactly one original stake. Its debit joins the final wallet/round transaction.
 -- Client demo outcomes remain client-authoritative; no direct wallet write grant is added.
 if r.bet<>round(p_bet,6) then
  if p_game_id<>'blackjack' or p_bet<>r.bet*2 or p_metadata->>'doubled' is distinct from 'true' then raise exception 'Round missing or mismatch';end if;
  if w.balance<p_bet-r.bet then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  update public.wallets set balance=balance-(p_bet-r.bet) where user_id=u;
  r.bet:=round(p_bet,6);
 end if;
 update public.game_rounds set bet=r.bet,payout=round(p_payout,6),multiplier=round(p_multiplier,6),result=p_result,metadata=metadata||p_metadata,status=p_status,settled_at=now() where round_id=p_round_id;
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
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird','blackjack','baccarat') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;

create or replace function public.table_games_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',1); $$;
revoke all on function public.table_games_capabilities() from public,anon;
grant execute on function public.table_games_capabilities() to authenticated;

commit;
