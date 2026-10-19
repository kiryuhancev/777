-- VAULT HEIST incremental migration. Run the WHOLE file. Existing balances/games remain intact.
begin;
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist'));
-- Acknowledged action prefix. Never grant clients INSERT/UPDATE/DELETE.
create table if not exists public.vault_heist_events(
 round_id uuid not null references public.game_rounds(round_id) on delete cascade,
 step integer not null check(step between 0 and 24),user_id uuid not null references auth.users(id) on delete cascade,
 checkpoint jsonb not null,created_at timestamptz not null default now(),primary key(round_id,step)
);
alter table public.vault_heist_events enable row level security;
revoke all on public.vault_heist_events from public,anon,authenticated;
grant select on public.vault_heist_events to authenticated;
drop policy if exists heist_events_self on public.vault_heist_events;
create policy heist_events_self on public.vault_heist_events for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.heist_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',1); $$;
revoke all on function public.heist_capabilities() from public,anon;
grant execute on function public.heist_capabilities() to authenticated;
create or replace function public.apply_heist_checkpoint(p_round_id uuid,p_previous_step integer,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;prev jsonb;event jsonb;st integer;v_bet numeric;pay numeric;bw numeric;loot numeric;terminal boolean;laststage integer;newstage integer;
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>65536 or not c ?& array['version','roundId','seed','bet','step','status','stage','remaining','baseWinX','lootX','payout','decisions','completed','result'] then raise exception 'Invalid Heist checkpoint';end if;
 st:=(c->>'step')::integer;v_bet:=(c->>'bet')::numeric;pay:=(c->>'payout')::numeric;bw:=(c->>'baseWinX')::numeric;loot:=(c->>'lootX')::numeric;newstage:=(c->>'stage')::integer;terminal:=c->>'status'='SETTLED';
 if c->>'version' is distinct from '1' or (c->>'roundId')::uuid is distinct from p_round_id or st is null or st not between 0 and 24 or v_bet is null or v_bet<=0 or v_bet>1000000000 or v_bet::text in ('NaN','Infinity','-Infinity')
  or bw is null or bw<0 or loot is null or loot<0 or bw+loot>10000 or pay is null or pay<0 or pay>10000*v_bet or pay::text in ('NaN','Infinity','-Infinity')
  or newstage is null or newstage not between 0 and 5 or (c->>'remaining')::integer is null or (c->>'remaining')::integer not between 0 and 3
  or c->>'status' is null or c->>'status' not in ('STAGE','CHOICE','SETTLED') or jsonb_typeof(c->'decisions')<>'array' or jsonb_typeof(c->'completed')<>'array'
  or (c->>'seed')::bigint not between 0 and 4294967295 or (c->>'alarmModifier')::numeric not between -.3 and .3
  or pay is distinct from (case when terminal then round((bw+case when c->>'result'='alarm' then 0 else loot end)*v_bet,6) else 0 end) then raise exception 'Invalid Heist values';end if;
 select * into w from public.wallets where user_id=u for update;if not found then raise exception 'Wallet missing';end if;
 select checkpoint into event from public.vault_heist_events where round_id=p_round_id and step=st and user_id=u;
 if found then
  if event is distinct from c then raise exception 'VAULT_WALLET_CONFLICT';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);
 end if;
 if w.revision is distinct from p_expected_revision then raise exception 'VAULT_WALLET_CONFLICT';end if;
 if p_previous_step=-1 then
  if st<>0 or newstage<>0 or jsonb_array_length(c->'decisions')<>0 or jsonb_array_length(c->'completed')<>0
   or (not terminal and (c->>'status'<>'STAGE' or (c->>'remaining')::integer<>3)) then raise exception 'Invalid Heist start';end if;
  if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
  if exists(select 1 from public.game_rounds where round_id=p_round_id) or exists(select 1 from public.game_rounds where user_id=u and game_id='vault_heist' and status='started') or w.balance<v_bet then raise exception 'VAULT_WALLET_CONFLICT';end if;
  insert into public.game_rounds(round_id,user_id,game_id,bet,metadata) values(p_round_id,u,'vault_heist',v_bet,jsonb_build_object('heist',c));
  update public.wallets set balance=balance-v_bet where user_id=u;
 else
  select * into r from public.game_rounds where round_id=p_round_id and user_id=u and game_id='vault_heist' for update;
  if not found or r.status<>'started' then raise exception 'VAULT_WALLET_CONFLICT';end if;
  prev:=r.metadata->'heist';laststage:=(prev->>'stage')::integer;
  if (prev->>'step')::integer is distinct from p_previous_step or st<>p_previous_step+1 or c->>'seed' is distinct from prev->>'seed' or v_bet<>r.bet or bw<>(prev->>'baseWinX')::numeric then raise exception 'VAULT_WALLET_CONFLICT';end if;
  if exists(select 1 from jsonb_array_elements(prev->'decisions') with ordinality a(value,n) where value is distinct from c->'decisions'->((n-1)::integer)) then raise exception 'Invalid Heist decision prefix';end if;
  if prev->>'status'='STAGE' then
   if newstage<>laststage or (c->>'remaining')::integer<>(prev->>'remaining')::integer-1 or loot<(prev->>'lootX')::numeric
    or c->'decisions'<>prev->'decisions' or (not terminal and ((c->>'remaining')::integer=0) is distinct from (c->>'status'='CHOICE')) then raise exception 'Invalid Heist spin';end if;
  elsif prev->>'status'='CHOICE' then
   if jsonb_array_length(c->'decisions')<>jsonb_array_length(prev->'decisions')+1 or loot<>(prev->>'lootX')::numeric then raise exception 'Invalid Heist choice';end if;
   if c->'decisions'->-1->>'action'='collect' then
    if not terminal or c->>'result'<>'collected' or newstage<>laststage then raise exception 'Invalid Heist collect';end if;
   elsif c->'decisions'->-1->>'action'='deeper' then
    if terminal then
     if c->>'result'<>'alarm' or newstage<>laststage or c->'decisions'->-1->>'safe'<>'false' then raise exception 'Invalid Heist alarm';end if;
    elsif newstage<>laststage+1 or c->>'status'<>'STAGE' or (c->>'remaining')::integer<>3 or c->'decisions'->-1->>'safe'<>'true' then raise exception 'Invalid Heist access';end if;
   else raise exception 'Invalid Heist action';end if;
  else raise exception 'VAULT_WALLET_CONFLICT';end if;
 end if;
 insert into public.vault_heist_events(round_id,step,user_id,checkpoint) values(p_round_id,st,u,c);
 update public.game_rounds set metadata=metadata||jsonb_build_object('heist',c,'baseWin',bw,'heistTriggered',c->'outcome'->'scatters'>='3'::jsonb or st>0,'maxStageReached',newstage,'decisions',c->'decisions','heistLoot',loot,'alarmFailure',c->>'result'='alarm','finalPayout',pay,'maxRiskReached',c->'maxRisk'),
 payout=pay,multiplier=case when terminal then round(pay/v_bet,6) else 0 end,result=c->>'result',status=case when terminal then 'settled' else 'started' end,settled_at=case when terminal then now() else null end where round_id=p_round_id;
 update public.wallets set balance=balance+pay,revision=revision+1,recovery=recovery||jsonb_build_object('heistRound',c),updated_at=now() where user_id=u returning * into w;
 if terminal then
  insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier) values(u,'vault_heist',1,v_bet,pay,pay,round(pay/v_bet,6))
  on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
  update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 end if;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false);
end $$;
revoke all on function public.apply_heist_checkpoint(uuid,integer,bigint,jsonb) from public,anon;
grant execute on function public.apply_heist_checkpoint(uuid,integer,bigint,jsonb) to authenticated;
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
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;

commit;
