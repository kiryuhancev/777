-- Additive MAGNET v2. Requires existing VAULT + supabase_magnet.sql.
-- v1 RPC remains intact so already-earned Overdrive can finish.
begin;
alter table public.vault_magnet_events drop constraint if exists vault_magnet_events_step_check;
alter table public.vault_magnet_events add constraint vault_magnet_events_step_check check(step between 0 and 12);
create or replace function public.magnet_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',1,'featuresVersion',2);$$;
revoke all on function public.magnet_capabilities() from public,anon;
grant execute on function public.magnet_capabilities() to authenticated;
create or replace function public.apply_magnet_v2_checkpoint(p_round_id uuid,p_previous_step integer,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;prev jsonb;event jsonb;
 st integer;stake numeric;pay numeric;total numeric;terminal boolean;triggered boolean;p jsonb;g jsonb;cell jsonb;idx integer;sc integer;b jsonb;
 charge integer;power integer;remain integer;extensions integer;collected numeric;base_win numeric;expected numeric;old_b jsonb;
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>262144 or not c ?& array['version','roundId','seed','bet','step','status','bonus','spins','magneticPlan','totalWinX','payout','result'] then raise exception 'Invalid MAGNET v2 checkpoint';end if;
 st:=(c->>'step')::integer;stake:=(c->>'bet')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'totalWinX')::numeric;terminal:=c->>'status'='SETTLED';b:=c->'bonus';triggered:=(b->>'triggered')::boolean;
 if c->>'version' is distinct from '2' or (c->>'roundId')::uuid is distinct from p_round_id
  or st is null or st not between 0 and 12 or stake is null or stake<=0 or stake>1000000000 or stake::text in ('NaN','Infinity','-Infinity')
  or pay is null or pay<0 or pay>10000*stake or pay::text in ('NaN','Infinity','-Infinity')
  or total is null or total<0 or total>10000 or total::text in ('NaN','Infinity','-Infinity')
  or c->>'status' is null or c->>'status' not in ('CHAMBER','SETTLED') or (c->>'seed')::bigint is null or (c->>'seed')::bigint not between 0 and 4294967295
  or triggered is null or jsonb_typeof(c->'spins') is distinct from 'array' or jsonb_array_length(c->'spins')<>st+1
  or c->'magneticPlan' is distinct from c->'spins'->st then raise exception 'Invalid MAGNET v2 values';end if;
 base_win:=(c->'spins'->0->>'winX')::numeric;
 if base_win is null or base_win<0 or base_win>100000 or base_win::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid MAGNET base win';end if;
 old_b:=jsonb_build_object('collectedX',0,'charge',0,'power',1,'remaining',6,'extensions',0);
 for p,idx in select value,(ordinality-1)::integer from jsonb_array_elements(c->'spins') with ordinality loop
  if (p->>'index')::integer is distinct from idx or (p->>'bonus')::boolean is distinct from (idx>0) or (p->>'phaseCount')::integer is distinct from 0 then raise exception 'Invalid MAGNET v2 plan';end if;
  foreach g in array array[p->'initialGrid',p->'finalGrid'] loop
   if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 or (select count(distinct (v->>'uid')::integer) from jsonb_array_elements(g) v)<>25 then raise exception 'Invalid MAGNET v2 grid';end if;
   for cell in select value from jsonb_array_elements(g) loop
    if not cell ?& array['uid','symbol','polarity'] or (cell->>'uid')::integer is null or (cell->>'uid')::integer not between 0 and 24
     or (cell->>'polarity')::integer is distinct from 0 or cell->>'symbol' is null
     or (idx=0 and cell->>'symbol' not in ('copper','steel','energy','plasma','crystal','reactor','wild','wheel','scatter'))
     or (idx>0 and cell->>'symbol' not in ('empty','value','charge','magnet','super','flip','overload')) then raise exception 'Invalid MAGNET v2 symbol';end if;
    if cell->>'symbol'='value' and ((cell->>'valueX')::numeric is null or (cell->>'valueX')::numeric<=0 or (cell->>'valueX')::numeric>10000 or (cell->>'valueX')::numeric::text in ('NaN','Infinity','-Infinity')) then raise exception 'Invalid MAGNET value';end if;
   end loop;
  end loop;
  if idx=0 then
   select count(*) into sc from jsonb_array_elements(p->'finalGrid') v where v->>'symbol'='scatter';
   if (p->>'scatters')::integer is distinct from sc or triggered is distinct from (sc>=3) then raise exception 'Invalid MAGNET trigger';end if;
   if exists(select 1 from jsonb_array_elements(p->'initialGrid') with ordinality t(v,n) where v->>'symbol'='wheel' and n<>13) or (select count(*) from jsonb_array_elements(p->'initialGrid') v where v->>'symbol'='wheel')>1 then raise exception 'Invalid WHEEL position';end if;
   if p->'wheel'<>'null'::jsonb and (p->'wheel'->>'id' is null or p->'wheel'->>'id' not in ('boost','upgrade','wilds','pull','respin','mystery')) then raise exception 'Invalid WHEEL outcome';end if;
  else
   if not triggered or (old_b->>'remaining')::integer<=0 then raise exception 'Unearned MAGNET bonus spin';end if;
   charge:=(p->'chamber'->>'charge')::integer;power:=(p->'chamber'->>'power')::integer;remain:=(p->'chamber'->>'remaining')::integer;extensions:=(p->'chamber'->>'extensions')::integer;collected:=(p->'chamber'->>'collectedX')::numeric;
   if charge is null or charge not between (old_b->>'charge')::integer and 9 or power is distinct from (case when charge>=9 then 10 when charge>=5 then 5 when charge>=2 then 2 else 1 end)
    or extensions is null or extensions not between (old_b->>'extensions')::integer and least(6,(old_b->>'extensions')::integer+1)
    or remain is distinct from (old_b->>'remaining')::integer-1+extensions-(old_b->>'extensions')::integer
    or remain<0 or collected is null or collected<(old_b->>'collectedX')::numeric or collected>10000 or collected::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid MAGNET chamber progression';end if;
   if collected is distinct from least(10000,round((old_b->>'collectedX')::numeric+(p->>'collectedThisSpin')::numeric+(p->>'sweepX')::numeric,6))
    or (p->>'collectedThisSpin')::numeric<0 or (p->>'sweepX')::numeric<0 or (remain>0 and (p->>'sweepX')::numeric<>0) then raise exception 'Invalid MAGNET collection';end if;
   old_b:=p->'chamber';
  end if;
 end loop;
 if st=0 then
  if (b->>'remaining')::integer is distinct from (case when triggered then 6 else 0 end) or (b->>'charge')::integer is distinct from 0 or (b->>'power')::integer is distinct from 1 or (b->>'collectedX')::numeric is distinct from 0 or (b->>'extensions')::integer is distinct from 0 then raise exception 'Invalid MAGNET chamber start';end if;
 else
  if (b-'triggered'-'index') is distinct from old_b then raise exception 'Invalid MAGNET chamber checkpoint';end if;
 end if;
 expected:=round(least(10000,base_win+case when st>0 and terminal then (b->>'collectedX')::numeric*(b->>'power')::numeric else 0 end),6);
 if (b->>'index')::integer is distinct from st or total is distinct from expected or pay is distinct from (case when terminal then round(total*stake,6) else 0 end)
  or (not triggered and (st<>0 or not terminal)) or (triggered and terminal is distinct from ((b->>'remaining')::integer=0)) then raise exception 'Invalid MAGNET v2 settlement';end if;
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
  if prev->>'version' is distinct from '2' or (prev->>'step')::integer is distinct from p_previous_step or st<>p_previous_step+1 or c->>'seed' is distinct from prev->>'seed' or stake<>r.bet or prev->>'status'<>'CHAMBER'
   or exists(select 1 from jsonb_array_elements(prev->'spins') with ordinality a(value,n) where value is distinct from c->'spins'->((n-1)::integer)) then raise exception 'VAULT_WALLET_CONFLICT';end if;
 end if;
 insert into public.vault_magnet_events(round_id,step,user_id,checkpoint) values(p_round_id,st,u,c);
 update public.game_rounds set metadata=metadata||jsonb_build_object('magnet',c,'chamber',triggered,'seed',c->'seed','bonusSpins',st),payout=pay,multiplier=case when terminal then round(pay/stake,6) else 0 end,
  result=c->>'result',status=case when terminal then 'settled' else 'started' end,settled_at=case when terminal then now() else null end where round_id=p_round_id;
 update public.wallets set balance=balance+pay,revision=revision+1,recovery=recovery||jsonb_build_object('magnetRound',c),updated_at=now() where user_id=u returning * into w;
 if terminal then
  insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier) values(u,'magnet',1,stake,pay,pay,round(pay/stake,6))
  on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
  update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 end if;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false);
end $$;
revoke all on function public.apply_magnet_v2_checkpoint(uuid,integer,bigint,jsonb) from public,anon;
grant execute on function public.apply_magnet_v2_checkpoint(uuid,integer,bigint,jsonb) to authenticated;
commit;
