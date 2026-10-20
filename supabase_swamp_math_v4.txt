-- Swamp calibrated math4; preserves legacy math2/math3 entitlements and financial bodies.
begin;
create or replace function public.swamp_bonus_v3_validate_begin(old_b jsonb,b jsonb,m jsonb,stake numeric,rid uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare expected jsonb;
begin
 if m->>'freeSpin'='true' then
  if old_b->>'version' is distinct from '3' then return;end if;
  expected:=(old_b-'previousTier')||jsonb_build_object('phase','playing','remaining',(old_b->>'remaining')::int-1,'spinsPlayed',(old_b->>'spinsPlayed')::int+1);
  if b is distinct from expected then raise exception 'Invalid Swamp level spin consumption';end if;
 elsif m ? 'purchaseType' then
  if m->>'purchaseType' is distinct from 'bonus' or (m->>'purchaseSpins')::int is distinct from 15 or b->>'version' is distinct from '3' or b->>'phase' is distinct from 'intro' or (b->>'remaining')::int is distinct from 15 or (b->>'triggerSeed')::bigint is distinct from (m->>'seed')::bigint or (m->>'seed')::bigint is null or (m->>'seed')::bigint not between 0 and 4294967295 then raise exception 'Invalid Swamp fifteen-spin purchase';end if;
 end if;
end $$;
create or replace function public.swamp_bonus_v3_validate_settle(old_b jsonb,b jsonb,m jsonb,started jsonb,payout numeric,rid uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare expected jsonb;tier int;count_f int;mult numeric;fish numeric;collected numeric;win numeric;total numeric;bet numeric;
begin
 if started ? 'purchaseType' then
  if b is distinct from old_b or payout<>0 then raise exception 'Invalid Swamp purchase settlement';end if;return;
 end if;
 if started->>'freeSpin'='true' then
  if old_b->>'version' is distinct from '3' then return;end if;
  tier:=(old_b->>'tier')::int;bet:=(old_b->>'bet')::numeric;
  mult:=(array[1,2,3,10])[tier+1];count_f:=(m->>'collectors')::int;
  if count_f is null or count_f not between 0 and 9 or (m->>'multiplier')::numeric is distinct from mult or jsonb_typeof(m->'moneyFish') is distinct from 'array' then raise exception 'Invalid Swamp collector step';end if;
  if exists(select 1 from jsonb_array_elements_text(m->'moneyFish') v where v::numeric not in (2,5,10,15,20,25,50,2000)) then raise exception 'Invalid Money Fish';end if;
  select coalesce(sum(v::numeric),0) into fish from jsonb_array_elements_text(m->'moneyFish') v;
  collected:=round(fish*count_f*mult,6);
  if (m->>'collectedX')::numeric is distinct from collected or (m->>'lineWinX')::numeric is null or (m->>'lineWinX')::numeric<0 or (m->>'retriggerSpins')::int is distinct from 0 then raise exception 'Invalid Swamp collect';end if;
  win:=round(least((m->>'lineWinX')::numeric+collected,50000-(old_b->>'totalWinX')::numeric),6);
  if (m->>'winX')::numeric is distinct from win or payout is distinct from round(win*bet,6) then raise exception 'Invalid Swamp payout';end if;
  total:=round((old_b->>'totalWinX')::numeric+win,6);count_f:=count_f+(old_b->>'collectors')::int;
  expected:=old_b||jsonb_build_object('collectors',count_f,'totalWinX',total,'phase','playing');
  if total>=50000 then expected:=expected||jsonb_build_object('remaining',0,'phase','complete');
  elsif (old_b->>'remaining')::int=0 then
   if tier<3 and count_f>=(tier+1)*4 then expected:=expected||jsonb_build_object('tier',tier+1,'remaining',15,'previousTier',tier,'phase','level-up');
   else expected:=expected||jsonb_build_object('phase','complete');end if;
  end if;
  if b is distinct from expected then raise exception 'Invalid Swamp deferred level transition';end if;
 else
  if (m->>'scatters')::int>=3 and (m->>'winX')::numeric<50000 then
   bet:=coalesce((started->>'baseBet')::numeric,(started->>'stake')::numeric);
   expected:=jsonb_build_object('version',3,'featureId',rid::text,'bet',bet,'remaining',15,'collectors',0,'tier',0,'totalWinX',(m->>'winX')::numeric,'spinsPlayed',0,'phase','intro');
   if b is distinct from expected then raise exception 'Invalid Swamp natural bonus entitlement';end if;
  elsif b is not null and b<>'null'::jsonb then raise exception 'Unexpected Swamp bonus';end if;
 end if;
end $$;
revoke all on function public.swamp_bonus_v3_validate_begin(jsonb,jsonb,jsonb,numeric,uuid),public.swamp_bonus_v3_validate_settle(jsonb,jsonb,jsonb,jsonb,numeric,uuid) from public,anon,authenticated;

do $patch$
declare def text;anchor text;hook text;
begin
 select pg_get_functiondef('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)'::regprocedure) into def;
 if position('swamp_bonus_v3_validate_begin' in def)=0 then
  anchor:=' if p_game_id=''swamp'' then';
  if position(anchor in def)=0 then raise exception 'Swamp begin hook not found';end if;
  hook:=' if p_game_id=''swamp'' and p_metadata->>''mathVersion''=''4'' then perform public.swamp_bonus_v3_validate_begin(w.recovery->''swampBonus'',p_recovery->''swampBonus'',p_metadata,p_bet,p_round_id);end if;'||chr(10);
  def:=replace(def,anchor,hook||anchor);
  anchor:='case when p_metadata->>''mathVersion''=''3'' then 15';
  if position(anchor in def)=0 then raise exception 'Install Swamp levels first';end if;
  def:=replace(def,anchor,'case when p_metadata->>''mathVersion'' in (''3'',''4'') then 15');
  anchor:='round((p_metadata->>''baseBet'')::numeric*1.5,6)';
  if position(anchor in def)=0 then raise exception 'Swamp boost price hook not found';end if;
  def:=replace(def,anchor,'round((p_metadata->>''baseBet'')::numeric*(case when p_metadata->>''mathVersion''=''4'' then 1.481493 else 1.5 end),6)');
  execute def;
 end if;
 select pg_get_functiondef('public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb)'::regprocedure) into def;
 if position('swamp_bonus_v3_validate_settle' in def)=0 then
  anchor:=' if p_game_id=''mines'' then';
  if position(anchor in def)=0 then raise exception 'Swamp settlement hook not found';end if;
  hook:=' if p_game_id=''swamp'' and r.metadata->>''mathVersion''=''4'' and p_status=''settled'' then perform public.swamp_bonus_v3_validate_settle(w.recovery->''swampBonus'',p_recovery->''swampBonus'',p_metadata,r.metadata,p_payout,p_round_id);end if;'||chr(10);
  def:=replace(def,anchor,hook||anchor);execute def;
 end if;
end $patch$;
create or replace function public.swamp_slot_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',2,'purchaseVersion',1,'siteAdminVersion',1,'boostVersion',1,'bonusVersion',2,'mathVersion',4);$$;
revoke all on function public.swamp_slot_capabilities() from public,anon;
grant execute on function public.swamp_slot_capabilities() to authenticated;
notify pgrst,'reload schema';
commit;
