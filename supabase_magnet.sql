-- MAGNET additive registration/checkpoint RPC. Run this WHOLE file on the existing VAULT DB.
-- No existing balance/account/round is reset. Existing game RPCs remain unchanged.
begin;
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet'));
create table if not exists public.vault_magnet_events(
 round_id uuid not null references public.game_rounds(round_id) on delete cascade,
 step integer not null check(step between 0 and 5),
 user_id uuid not null references auth.users(id) on delete cascade,
 checkpoint jsonb not null,created_at timestamptz not null default now(),primary key(round_id,step)
);
alter table public.vault_magnet_events enable row level security;
revoke all on public.vault_magnet_events from public,anon,authenticated;
grant select on public.vault_magnet_events to authenticated;
drop policy if exists magnet_events_self on public.vault_magnet_events;
create policy magnet_events_self on public.vault_magnet_events for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.magnet_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',1);$$;
revoke all on function public.magnet_capabilities() from public,anon;
grant execute on function public.magnet_capabilities() to authenticated;
create or replace function public.apply_magnet_checkpoint(p_round_id uuid,p_previous_step integer,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;prev jsonb;event jsonb;
 st integer;stake numeric;pay numeric;total numeric;computed numeric;terminal boolean;triggered boolean;p jsonb;g jsonb;cell jsonb;phase jsonb;effect jsonb;idx integer;scatter_count integer;
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>262144 or not c ?& array['version','roundId','seed','bet','step','status','bonus','spins','magneticPlan','totalWinX','payout','result'] then raise exception 'Invalid MAGNET checkpoint';end if;
 st:=(c->>'step')::integer;stake:=(c->>'bet')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'totalWinX')::numeric;terminal:=c->>'status'='SETTLED';triggered:=(c->'bonus'->>'triggered')::boolean;
 if c->>'version' is distinct from '1' or (c->>'roundId')::uuid is distinct from p_round_id
  or st is null or st not between 0 and 5 or stake is null or stake<=0 or stake>1000000000 or stake::text in ('NaN','Infinity','-Infinity')
  or pay is null or pay<0 or pay>10000*stake or pay::text in ('NaN','Infinity','-Infinity')
  or total is null or total<0 or total>10000 or total::text in ('NaN','Infinity','-Infinity')
  or c->>'status' is null or c->>'status' not in ('OVERDRIVE','SETTLED') or (c->>'seed')::bigint is null or (c->>'seed')::bigint not between 0 and 4294967295
  or triggered is null or jsonb_typeof(c->'spins') is distinct from 'array' or jsonb_array_length(c->'spins')<>st+1
  or c->'magneticPlan' is distinct from c->'spins'->st then raise exception 'Invalid MAGNET values';end if;
 computed:=0;
 for p,idx in select value,(ordinality-1)::integer from jsonb_array_elements(c->'spins') with ordinality loop
  if (p->>'index')::integer is distinct from idx or (p->>'bonus')::boolean is distinct from (idx>0)
   or (p->>'fieldPower')::integer is distinct from (array[1,1,1,2,3,5])[idx+1]
   or (p->>'phaseCount')::integer is null or (p->>'phaseCount')::integer not between 1 and 3
   or jsonb_typeof(p->'phases') is distinct from 'array' or jsonb_array_length(p->'phases')<>(p->>'phaseCount')::integer
   or (p->>'winX')::numeric is null or (p->>'winX')::numeric<0 or (p->>'winX')::numeric>100000 or (p->>'winX')::numeric::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid MAGNET plan';end if;
  foreach g in array array[p->'initialGrid',p->'finalGrid'] loop
   if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 then raise exception 'Invalid MAGNET grid';end if;
   if (select count(distinct (v->>'uid')::integer) from jsonb_array_elements(g) v)<>25 then raise exception 'Duplicate MAGNET occupancy';end if;
   for cell in select value from jsonb_array_elements(g) loop
    if not cell ?& array['uid','symbol','polarity'] or (cell->>'uid')::integer not between 0 and 24 or (cell->>'polarity')::integer not in (-1,0,1)
     or cell->>'symbol' not in ('copper','steel','energy','plasma','crystal','reactor','wild','flip','gravity','repulsor','chain','scatter') then raise exception 'Invalid MAGNET piece';end if;
   end loop;
  end loop;
  if exists(select 1 from jsonb_array_elements(p->'initialGrid') a where not exists(select 1 from jsonb_array_elements(p->'finalGrid') b where a->'uid'=b->'uid' and a->'symbol'=b->'symbol')) then raise exception 'MAGNET pieces changed';end if;
  select count(*) into scatter_count from jsonb_array_elements(p->'finalGrid') v where v->>'symbol'='scatter';
  if (p->>'scatters')::integer is distinct from scatter_count or (idx=0 and triggered is distinct from (scatter_count>=3)) then raise exception 'Invalid MAGNET Scatter count';end if;
  for phase in select value from jsonb_array_elements(p->'phases') loop
   if jsonb_typeof(phase->'effects') is distinct from 'array' or jsonb_array_length(phase->'effects')>50 then raise exception 'Invalid MAGNET effects';end if;
   for effect in select value from jsonb_array_elements(phase->'effects') loop
    if effect ? 'from' and ((effect->>'from')::integer not between 0 and 24 or (effect->>'to')::integer not between 0 and 24
     or abs((effect->>'from')::integer%5-(effect->>'to')::integer%5)+abs((effect->>'from')::integer/5-(effect->>'to')::integer/5)<>1) then raise exception 'Invalid MAGNET movement';end if;
   end loop;
  end loop;
  computed:=least(10000,computed+(p->>'winX')::numeric);
 end loop;
 if total<>round(computed,6) or pay is distinct from (case when terminal then round(total*stake,6) else 0 end)
  or (not triggered and st<>0) or (not terminal and (not triggered or st>=5 or total>=10000))
  or (terminal and triggered and st<5 and total<10000)
  or (c->'bonus'->>'remaining')::integer is distinct from (case when terminal then 0 else 5-st end)
  or (c->'bonus'->>'index')::integer is distinct from st
  or (c->'bonus'->>'power')::integer is distinct from (array[1,1,1,2,3,5])[st+1] then raise exception 'Invalid MAGNET settlement';end if;
 select * into w from public.wallets where user_id=u for update;if not found then raise exception 'Wallet missing';end if;
 select checkpoint into event from public.vault_magnet_events where round_id=p_round_id and step=st and user_id=u;
 if found then
  if event is distinct from c then raise exception 'VAULT_WALLET_CONFLICT';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);
 end if;
 if w.revision is distinct from p_expected_revision then raise exception 'VAULT_WALLET_CONFLICT';end if;
 if p_previous_step=-1 then
  if st<>0 then raise exception 'Invalid MAGNET start';end if;
  if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
  if exists(select 1 from public.game_rounds where round_id=p_round_id) or exists(select 1 from public.game_rounds where user_id=u and game_id='magnet' and status='started') or w.balance<stake then raise exception 'VAULT_WALLET_CONFLICT';end if;
  insert into public.game_rounds(round_id,user_id,game_id,bet,metadata) values(p_round_id,u,'magnet',stake,jsonb_build_object('magnet',c));
  update public.wallets set balance=balance-stake where user_id=u;
 else
  select * into r from public.game_rounds where round_id=p_round_id and user_id=u and game_id='magnet' for update;
  if not found or r.status<>'started' then raise exception 'VAULT_WALLET_CONFLICT';end if;
  prev:=r.metadata->'magnet';
  if (prev->>'step')::integer is distinct from p_previous_step or st<>p_previous_step+1 or c->>'seed' is distinct from prev->>'seed' or stake<>r.bet or prev->>'status'<>'OVERDRIVE'
   or triggered is distinct from true or exists(select 1 from jsonb_array_elements(prev->'spins') with ordinality a(value,n) where value is distinct from c->'spins'->((n-1)::integer)) then raise exception 'VAULT_WALLET_CONFLICT';end if;
 end if;
 insert into public.vault_magnet_events(round_id,step,user_id,checkpoint) values(p_round_id,st,u,c);
 update public.game_rounds set metadata=metadata||jsonb_build_object('magnet',c,'overdrive',triggered,'seed',c->'seed','bonusSpins',st),payout=pay,multiplier=case when terminal then round(pay/stake,6) else 0 end,
  result=c->>'result',status=case when terminal then 'settled' else 'started' end,settled_at=case when terminal then now() else null end where round_id=p_round_id;
 update public.wallets set balance=balance+pay,revision=revision+1,recovery=recovery||jsonb_build_object('magnetRound',c),updated_at=now() where user_id=u returning * into w;
 if terminal then
  insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier) values(u,'magnet',1,stake,pay,pay,round(pay/stake,6))
  on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
  update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 end if;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false);
end $$;
revoke all on function public.apply_magnet_checkpoint(uuid,integer,bigint,jsonb) from public,anon;
grant execute on function public.apply_magnet_checkpoint(uuid,integer,bigint,jsonb) to authenticated;
-- Same settings/auth behaviour, with the new game added to the last-screen allowlist.
create or replace function public.save_vault_settings(p_settings jsonb,p_updated_at timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.user_settings;
begin
 if u is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_settings)<>'object' or octet_length(p_settings::text)>4096 or p_updated_at is null then raise exception 'Invalid settings';end if;
 select * into s from public.user_settings where user_id=u for update;
 if p_updated_at<=s.updated_at then return to_jsonb(s);end if;
 update public.user_settings set sound_enabled=coalesce((p_settings->>'sound')::boolean,s.sound_enabled),music_enabled=coalesce((p_settings->>'music')::boolean,s.music_enabled),fast_mode=coalesce((p_settings->>'fastGame')::boolean,s.fast_mode),
 fast_bonus=coalesce((p_settings->>'fastBonus')::boolean,s.fast_bonus),scatter_boost=coalesce((p_settings->>'scatterBoost')::boolean,s.scatter_boost),
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;
commit;
