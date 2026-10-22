create or replace function public.big_top_v2_validate_plan(p jsonb,is_bonus boolean,previous jsonb default null) returns numeric language plpgsql immutable set search_path='' as $$
declare initial jsonb:=p->'initialGrid';final jsonb:=p->'finalGrid';expected jsonb;f jsonb;features jsonb:=p->'featurePlan';triggers jsonb:='[]';encore jsonb:='[]';r integer;row integer;height integer;seen integer[]:=array[]::integer[];sc integer:=0;meter integer:=0;armed boolean:=false;value numeric;spins integer;symbol text;
begin
 if jsonb_typeof(initial) is distinct from 'array' or jsonb_array_length(initial)<>6 or jsonb_typeof(features) is distinct from 'array' or jsonb_array_length(features)>6 then raise exception 'Invalid Curtain plan';end if;
 expected:=initial;if is_bonus and p->'encoreBefore' is distinct from coalesce(previous->'encoreAfter','[]') then raise exception 'Encore boundary mismatch';end if;
 for r in 0..5 loop
  height:=jsonb_array_length(initial->r);if height not between 2 and 6 or height is distinct from (p->'reelHeights'->>r)::integer then raise exception 'Invalid reel geometry';end if;
  if (select count(*) from jsonb_array_elements(initial->r) s where s->>'symbol'='scatter')>1 then raise exception 'Duplicate Scatter';end if;
  if exists(select 1 from jsonb_array_elements(initial->r) s where s->>'symbol'='scatter') then sc:=sc+1;end if;
 end loop;
 if (p->>'potentialWays')::integer is distinct from (select exp(sum(ln((h#>>'{}')::numeric)))::integer from jsonb_array_elements(p->'reelHeights') h) then raise exception 'Ways mismatch';end if;
 for f in select * from jsonb_array_elements(features) loop
  r:=(f->>'reel')::integer;row:=(f->>'triggerCell')::integer;
  if r is null or r not between 0 and 5 or r=any(seen) or (cardinality(seen)>0 and r<seen[cardinality(seen)]) or row is null or row not between 0 and jsonb_array_length(initial->r)-1 or (f->>'full')::boolean is distinct from true or f->>'winner' not in ('bombo','skinny') or (f->>'multiplier')::integer not in (1,2,3,5,10) then raise exception 'Invalid full-reel Curtain';end if;seen:=array_append(seen,r);
  if coalesce((f->>'carried')::boolean,false) then
   if not is_bonus or not coalesce(previous->'encoreAfter','[]') @> jsonb_build_array((f-'carried'-'triggerCell')||jsonb_build_object('encore',true,'remaining',1)) then
    -- Compare the stable carried fields; triggerCell is preserved in v2 Encore.
    if not is_bonus or not exists(select 1 from jsonb_array_elements(coalesce(previous->'encoreAfter','[]')) e where e->>'id'=f->>'id' and e->>'reel'=f->>'reel' and e->>'multiplier'=f->>'multiplier' and e->>'winner'=f->>'winner' and (e->>'remaining')::integer=1) then raise exception 'Invalid Encore carry';end if;
   end if;
  else
   if initial->r->row->>'symbol' is distinct from 'show_ticket' then raise exception 'SHOW TICKET missing';end if;
   triggers:=triggers||jsonb_build_array(jsonb_build_object('reelIndex',r,'triggerCell',row,'winner',f->>'winner','resultType',case when (f->>'multiplier')::integer=1 then 'WILD' else 'MULTIPLIER' end,'multiplier',(f->>'multiplier')::integer));
  end if;
  for row in 0..jsonb_array_length(initial->r)-1 loop expected:=jsonb_set(expected,array[r::text,row::text],(initial->r->row)||jsonb_build_object('symbol','wild','multiplier',(f->>'multiplier')::integer,'curtainId',f->>'id','clown',f->>'winner'));end loop;
  if (f->>'encore')::boolean and not coalesce((f->>'carried')::boolean,false) then if not is_bonus or (f->>'multiplier')::integer=1 then raise exception 'Invalid Encore';end if;encore:=encore||jsonb_build_array(f||'{"remaining":1}');end if;
 end loop;
 if is_bonus and exists(select 1 from jsonb_array_elements(coalesce(previous->'encoreAfter','[]')) e where not exists(select 1 from jsonb_array_elements(features) ff where ff->>'id'=e->>'id' and coalesce((ff->>'carried')::boolean,false))) then raise exception 'Encore lost';end if;
 if expected is distinct from final or triggers is distinct from p->'curtainTriggers' or encore is distinct from p->'encoreAfter' then raise exception 'Full reel final state mismatch';end if;
 for r in 0..5 loop for row in 0..jsonb_array_length(initial->r)-1 loop symbol:=initial->r->row->>'symbol';
  if symbol='show_ticket' and not exists(select 1 from jsonb_array_elements(features) e where (e->>'reel')::integer=r and (e->>'triggerCell')::integer=row and not coalesce((e->>'carried')::boolean,false)) then raise exception 'Unplanned ticket';end if;
  if symbol='wild' and not exists(select 1 from jsonb_array_elements(features) e where (e->>'reel')::integer=r and coalesce((e->>'carried')::boolean,false)) then raise exception 'Unplanned carried Wild';end if;
  if symbol not in ('ten','j','q','k','a','dog','duck','boot','weight','skate','fish','scatter','show_ticket','wild') then raise exception 'Unknown symbol';end if;
 end loop;end loop;
 if is_bonus then meter:=coalesce((previous->>'meterAfter')::integer,0);armed:=coalesce((previous->>'armedAfter')::boolean,false);end if;
 if meter is distinct from (p->>'meterBefore')::integer or armed is distinct from (p->>'armedBefore')::boolean then raise exception 'Applause checkpoint mismatch';end if;
 meter:=case when armed then 0 else meter end+case when is_bonus then 3*(select count(*)::integer from jsonb_array_elements(features) e where not coalesce((e->>'carried')::boolean,false)) else 0 end;
 if meter is distinct from (p->>'meterAfter')::integer or (is_bonus and meter>=12) is distinct from (p->>'armedAfter')::boolean or (is_bonus and armed) is distinct from (p->>'standingOvation')::boolean or is_bonus and armed and jsonb_array_length(features)=0 then raise exception 'Invalid Applause';end if;
 spins:=case sc when 3 then 10 when 4 then 12 when 5 then 15 when 6 then 20 else 0 end;if sc is distinct from (p->>'scatters')::integer or spins is distinct from (p->>'freeSpins')::integer then raise exception 'Scatter mismatch';end if;
 value:=public.big_top_v2_grid_win(final);if (p->>'purchase')::boolean then if is_bonus or sc<>3 then raise exception 'Invalid purchase trigger';end if;value:=0;end if;
 if value is distinct from (p->>'winX')::numeric then raise exception 'Invalid Big Top Ways payout';end if;return value;
end $$;
revoke all on function public.big_top_v2_validate_plan(jsonb,boolean,jsonb) from public,anon,authenticated;
