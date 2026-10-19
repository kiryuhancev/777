-- VAULT slot controls / Heist purchases / Scatter Boost upgrade.
-- Run this ENTIRE file after the existing VAULT HEIST migration. No rows/balances are reset.
begin;
create or replace function public.apply_heist_checkpoint(p_round_id uuid,p_previous_step integer,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;prev jsonb;event jsonb;st integer;v_bet numeric;v_cost numeric;expected_cost numeric;pay numeric;bw numeric;loot numeric;terminal boolean;laststage integer;newstage integer;
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>65536 or not c ?& array['version','roundId','seed','bet','step','status','stage','remaining','baseWinX','lootX','payout','decisions','completed','result'] then raise exception 'Invalid Heist checkpoint';end if;
 st:=(c->>'step')::integer;v_bet:=(c->>'bet')::numeric;pay:=(c->>'payout')::numeric;bw:=(c->>'baseWinX')::numeric;loot:=(c->>'lootX')::numeric;newstage:=(c->>'stage')::integer;terminal:=c->>'status'='SETTLED';
 if c->>'version' is null or c->>'version' not in ('1','2') or (c->>'roundId')::uuid is distinct from p_round_id or st is null or st not between 0 and 24 or v_bet is null or v_bet<=0 or v_bet>1000000000 or v_bet::text in ('NaN','Infinity','-Infinity')
  or bw is null or bw<0 or loot is null or loot<0 or bw+loot>10000 or pay is null or pay<0 or pay>10000*v_bet or pay::text in ('NaN','Infinity','-Infinity')
  or newstage is null or newstage not between 0 and 5 or (c->>'remaining')::integer is null or (c->>'remaining')::integer not between 0 and 3
  or c->>'status' is null or c->>'status' not in ('STAGE','CHOICE','SETTLED') or jsonb_typeof(c->'decisions')<>'array' or jsonb_typeof(c->'completed')<>'array'
  or (c->>'seed')::bigint not between 0 and 4294967295 or (c->>'alarmModifier')::numeric not between -.3 and .3
  or pay is distinct from (case when terminal then round((bw+case when c->>'result'='alarm' then 0 else loot end)*v_bet,6) else 0 end) then raise exception 'Invalid Heist values';end if;
 -- Version 1 checkpoints remain valid. Version 2 freezes stake, paid cost and mode.
 v_cost:=v_bet;
 if c->>'version'='2' then
  if not c ?& array['cost','purchaseType','scatterBoost'] or jsonb_typeof(c->'scatterBoost')<>'boolean' then raise exception 'Invalid Heist mode';end if;
  if c->>'purchaseType' is not null then
   if c->>'purchaseType' not in ('heist','super') or c->>'scatterBoost'<>'false' then raise exception 'Invalid Heist purchase';end if;
   expected_cost:=round(v_bet*case c->>'purchaseType' when 'heist' then 31.5 else 79 end,6);
   if bw<>0 then raise exception 'Purchased Heist cannot pay base win';end if;
  else expected_cost:=round(v_bet*case when c->>'scatterBoost'='true' then 1.5 else 1 end,6);end if;
  v_cost:=(c->>'cost')::numeric;
  if v_cost is null or v_cost is distinct from expected_cost then raise exception 'Invalid Heist cost';end if;
 elsif c ? 'cost' or c ? 'purchaseType' or c ? 'scatterBoost' then raise exception 'Invalid legacy Heist mode';end if;
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
  if c->>'purchaseType' is not null and (terminal or loot is distinct from case c->>'purchaseType' when 'heist' then 23 else 70 end::numeric) then raise exception 'Invalid purchased Heist start';end if;
  if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
  if exists(select 1 from public.game_rounds where round_id=p_round_id) or exists(select 1 from public.game_rounds where user_id=u and game_id='vault_heist' and status='started') or w.balance<v_cost then raise exception 'VAULT_WALLET_CONFLICT';end if;
  insert into public.game_rounds(round_id,user_id,game_id,bet,metadata) values(p_round_id,u,'vault_heist',v_cost,jsonb_build_object('heist',c));
  update public.wallets set balance=balance-v_cost where user_id=u;
 else
  select * into r from public.game_rounds where round_id=p_round_id and user_id=u and game_id='vault_heist' for update;
  if not found or r.status<>'started' then raise exception 'VAULT_WALLET_CONFLICT';end if;
  prev:=r.metadata->'heist';laststage:=(prev->>'stage')::integer;
  if (prev->>'step')::integer is distinct from p_previous_step or st<>p_previous_step+1 or c->>'seed' is distinct from prev->>'seed' or v_bet is distinct from (prev->>'bet')::numeric or c->'version' is distinct from prev->'version' or c->'cost' is distinct from prev->'cost' or c->'purchaseType' is distinct from prev->'purchaseType' or c->'scatterBoost' is distinct from prev->'scatterBoost' or bw<>(prev->>'baseWinX')::numeric then raise exception 'VAULT_WALLET_CONFLICT';end if;
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
 update public.game_rounds set metadata=metadata||jsonb_build_object('heist',c,'purchaseType',c->'purchaseType','scatterBoost',coalesce((c->>'scatterBoost')::boolean,false),'baseBet',v_bet,'cost',v_cost,'baseWin',bw,'heistTriggered',c->'outcome'->'scatters'>='3'::jsonb or st>0,'maxStageReached',newstage,'decisions',c->'decisions','heistLoot',loot,'alarmFailure',c->>'result'='alarm','finalPayout',pay,'maxRiskReached',c->'maxRisk'),
 payout=pay,multiplier=case when terminal then round(pay/v_bet,6) else 0 end,result=c->>'result',status=case when terminal then 'settled' else 'started' end,settled_at=case when terminal then now() else null end where round_id=p_round_id;
 update public.wallets set balance=balance+pay,revision=revision+1,recovery=recovery||jsonb_build_object('heistRound',c),updated_at=now() where user_id=u returning * into w;
 if terminal then
  insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier) values(u,'vault_heist',1,v_cost,pay,pay,round(pay/v_bet,6))
  on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
  update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 end if;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false);
end $$;
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
 if p_game_id='swamp' and p_metadata->>'scatterBoost'='true' then
  if p_metadata->>'freeSpin'='true' or p_metadata ? 'purchaseType' or coalesce((p_metadata->>'baseBet')::numeric,0)<=0
   or p_bet is distinct from round((p_metadata->>'baseBet')::numeric*1.5,6) then raise exception 'Invalid Swamp Scatter Boost cost';end if;
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

create or replace function public.heist_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',2,'purchaseVersion',1,'boostVersion',1); $$;
create or replace function public.swamp_slot_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',2,'purchaseVersion',1,'siteAdminVersion',1,'boostVersion',1); $$;
revoke all on function public.heist_capabilities(),public.swamp_slot_capabilities(),public.apply_heist_checkpoint(uuid,integer,bigint,jsonb),public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb) from public,anon;
grant execute on function public.heist_capabilities(),public.swamp_slot_capabilities(),public.apply_heist_checkpoint(uuid,integer,bigint,jsonb),public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb) to authenticated;
commit;
