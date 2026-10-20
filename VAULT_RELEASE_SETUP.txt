-- VAULT RELEASE: run this whole file in Supabase SQL Editor. Existing project schema is required.
-- One transaction; any error rolls everything back. Never paste only a selected fragment.
begin;

-- supabase_critter_v5.sql
-- Critter Chaos v4: NO CASCADE; persistent running Wilds with personal bonus multipliers. Run this WHOLE file on the existing VAULT database.
-- No existing account, wallet, game outcome or auth setting is reset.
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
create or replace function public.critter_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',2,'featuresVersion',3,'gameplayVersion',4,'mathVersion',5,'roundVersions',jsonb_build_array(1,2,3,4,5));$$;
revoke all on function public.critter_capabilities() from public,anon;
grant execute on function public.critter_capabilities() to authenticated;
-- v4 pure structural/evaluation validators. No wallet writes and no RNG changes.
create or replace function public.critter_v4_evaluate(g jsonb,is_bonus boolean) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare symbols text[]:=array['ten','jack','king','ace','cat','pigeon','possum','bulldog','wild'];symbol text;seen integer[];q integer[];grp integer[];used integer[]:=array[]::integer[];active integer[]:=array[]::integer[];i integer;j integer;k integer;n integer;has_regular boolean;wins jsonb:='[]';win jsonb;raw numeric;factor numeric;total numeric:=0;total_raw numeric:=0;pay_rows jsonb:='{"ten":[0.2,0.3,0.45,0.65,0.9,1.4,3],"jack":[0.25,0.4,0.55,0.8,1.2,1.8,4],"king":[0.3,0.45,0.7,1,1.5,2.2,5],"ace":[0.4,0.6,0.9,1.3,1.8,2.8,6],"cat":[0.6,0.9,1.3,1.8,2.5,4,8],"pigeon":[0.8,1.2,1.7,2.5,3.5,5,10],"possum":[1,1.5,2.2,3,4.5,7,15],"bulldog":[1.5,2.2,3,4.5,6,10,25],"wild":[1.5,2.2,3,4.5,6,10,25]}';
begin
 if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 then raise exception 'Invalid v4 grid';end if;
 for i in 0..24 loop
  if (g->i->>'uid')::integer is distinct from i or not (coalesce(g->i->>'symbol','')=any(symbols||array['scatter'])) then raise exception 'Invalid v4 tile';end if;
  if g->i->>'symbol'='wild' and ((g->i->>'multiplier')::numeric is null or not ((g->i->>'multiplier')::numeric=any(array[1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536,131072,262144,524288,1048576]::numeric[]))) then raise exception 'Invalid v4 Wild multiplier';end if;
 end loop;
 foreach symbol in array symbols loop
  seen:=array[]::integer[];
  for i in 0..24 loop
   if i=any(seen) or not (g->i->>'symbol'=any(array[symbol,'wild'])) then continue;end if;
   q:=array[i];seen:=array_append(seen,i);grp:=array[]::integer[];has_regular:=false;
   while cardinality(q)>0 loop
    j:=q[1];q:=q[2:];grp:=array_append(grp,j);has_regular:=has_regular or g->j->>'symbol'=symbol;
    foreach k in array array[case when j%5>0 then j-1 else -1 end,case when j%5<4 then j+1 else -1 end,case when j>=5 then j-5 else -1 end,case when j<20 then j+5 else -1 end] loop
     if k>=0 and not k=any(seen) and g->k->>'symbol'=any(array[symbol,'wild']) then seen:=array_append(seen,k);q:=array_append(q,k);end if;
    end loop;
   end loop;
   n:=cardinality(grp);if n<5 or not has_regular or symbol='wild' and grp&&used then continue;end if;
   select array_agg(v order by v) into grp from unnest(grp) v;
   raw:=(pay_rows->symbol->>(case when n>=15 then 6 when n>=10 then 5 else n-5 end))::numeric;
   factor:=1;if is_bonus then select greatest(1,coalesce(sum((g->v->>'multiplier')::numeric),0)) into factor from unnest(grp) v where g->v->>'symbol'='wild';end if;
   win:=jsonb_build_object('symbol',symbol,'size',n,'positions',to_jsonb(grp),'rawWinX',raw,'winX',round(round(raw*0.000699792925918,6)*factor,6),'multiplier',factor);
   wins:=wins||jsonb_build_array(win);total:=total+(win->>'winX')::numeric;total_raw:=total_raw+raw;used:=used||grp;
   foreach j in array grp loop if g->j->>'symbol'='wild' and not j=any(active) then active:=array_append(active,j);end if;end loop;
  end loop;
 end loop;
 return jsonb_build_object('wins',wins,'winX',round(total,6),'rawWinX',round(total_raw,6),'activeWilds',to_jsonb(active));
end $$;
revoke all on function public.critter_v4_evaluate(jsonb,boolean) from public,anon,authenticated;
create or replace function public.critter_v4_validate(c jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb;g jsonb;initial jsonb;expected jsonb;result jsonb;before jsonb:='[]';after_wilds jsonb;new_wilds jsonb;wild jsonb;old_wild jsonb;move jsonb;updates jsonb;updated jsonb;mutable jsonb;swap jsonb;plans jsonb[];is_bonus boolean;idx integer:=0;i integer;j integer;dest integer;from_pos integer;sc integer;count_spins integer;bonus_win numeric:=0;factor numeric;win_total numeric;purchase text:=c->>'purchaseType';price numeric;active_ids text[];ids text[];cells integer[];normal_move boolean;
begin
 if c->>'version' is distinct from '4' or c->>'gameId' is distinct from 'critter' or c->>'status' is distinct from 'SETTLED' or not c ?& array['roundId','seed','bet','cost','scatterBoost','purchaseType','base','bonus','payout','winX','result'] then raise exception 'Invalid v4 checkpoint';end if;
 if (c->>'seed')::numeric is null or (c->>'seed')::numeric not between 0 and 4294967295 or (c->>'seed')::numeric<>trunc((c->>'seed')::numeric) or (c->>'bet')::numeric not between 0.000001 and 1000000000 or (c->>'bet')::numeric is null then raise exception 'Invalid v4 values';end if;
 if purchase is not null and purchase not in ('bonus','super') or jsonb_typeof(c->'scatterBoost') is distinct from 'boolean' or purchase is not null and (c->>'scatterBoost')::boolean then raise exception 'Invalid v4 feature';end if;
 price:=round((c->>'bet')::numeric*(case when purchase='bonus' then 50 when purchase='super' then 500 when (c->>'scatterBoost')::boolean then 3 else 1 end),6);
 if (c->>'cost')::numeric is distinct from price then raise exception 'Invalid Critter feature price';end if;
 select count(*) into sc from jsonb_array_elements(c->'base'->'finalGrid') t where t->>'symbol'='scatter';
 if (c->'base'->>'scatters')::integer is distinct from sc or ((c->'bonus')<>'null'::jsonb) is distinct from (purchase is not null or sc>=3) then raise exception 'Invalid v4 trigger';end if;
 plans:=array[c->'base'];
 if c->'bonus'<>'null'::jsonb then
  count_spins:=case when purchase='super' or purchase is null and sc>=4 then 20 else 10 end;
  if jsonb_typeof(c->'bonus'->'spins') is distinct from 'array' or jsonb_array_length(c->'bonus'->'spins')<>count_spins or (c->'bonus'->>'spinCount')::integer is distinct from count_spins or c->'bonus'->>'kind' is distinct from (case when count_spins=20 then 'super' else 'normal' end) then raise exception 'Invalid v4 bonus';end if;
  for p in select value from jsonb_array_elements(c->'bonus'->'spins') loop plans:=array_append(plans,p);end loop;
 end if;
 foreach p in array plans loop
  is_bonus:=idx>0;
  if not p ?& array['initialGrid','finalGrid','updatedGrid','persistentWildsBefore','persistentWildsAfter','movements','newWilds','multiplierUpdates','wins','activeWilds','winX','rawWinX','scatters'] or p ?| array['steps','removed','gravityGrid','nextGrid'] then raise exception 'No cascade allowed in v4';end if;
  g:=p->'finalGrid';initial:=p->'initialGrid';
  if jsonb_typeof(initial) is distinct from 'array' or jsonb_array_length(initial)<>25 then raise exception 'Invalid v4 initial grid';end if;
  for i in 0..24 loop
   if (initial->i->>'uid')::integer is distinct from i or coalesce(initial->i->>'symbol','') not in ('ten','jack','king','ace','cat','pigeon','possum','bulldog','wild','scatter') then raise exception 'Invalid v4 initial tile';end if;
  end loop;
  result:=public.critter_v4_evaluate(g,is_bonus);
  if not is_bonus and purchase is not null then
   if sc<>0 or (p->>'winX')::numeric is distinct from 0 or p->'wins'<>'[]'::jsonb then raise exception 'Purchased bonus must skip base';end if;
  elsif p->'wins' is distinct from result->'wins' or (p->>'winX')::numeric is distinct from (result->>'winX')::numeric or (p->>'rawWinX')::numeric is distinct from (result->>'rawWinX')::numeric or p->'activeWilds' is distinct from result->'activeWilds' then raise exception 'Invalid v4 one-spin result';end if;
  if not is_bonus then
   if initial is distinct from g or p->'updatedGrid' is distinct from g or p->'persistentWildsBefore'<>'[]'::jsonb or p->'persistentWildsAfter'<>'[]'::jsonb or p->'movements'<>'[]'::jsonb or p->'newWilds'<>'[]'::jsonb or p->'multiplierUpdates'<>'[]'::jsonb then raise exception 'Base Wild must be standard';end if;
   for wild in select value from jsonb_array_elements(g) where value->>'symbol'='wild' loop if (wild->>'multiplier')::numeric is distinct from 1 then raise exception 'Base Wild must be x1';end if;end loop;
  else
   if (p->>'scatters')::integer is distinct from 0 or exists(select 1 from jsonb_array_elements(g) t where t->>'symbol'='scatter') or p->'persistentWildsBefore' is distinct from before then raise exception 'Lost v4 persistent state';end if;
   new_wilds:=p->'newWilds';after_wilds:='[]';updates:='[]';active_ids:=array[]::text[];ids:=array[]::text[];cells:=array[]::integer[];mutable:=initial;
   if jsonb_typeof(new_wilds) is distinct from 'array' or jsonb_typeof(p->'movements') is distinct from 'array' or jsonb_array_length(p->'movements')<>jsonb_array_length(before) then raise exception 'Invalid v4 movements';end if;
   for i in select value::integer from jsonb_array_elements_text(result->'activeWilds') loop active_ids:=array_append(active_ids,g->i->>'wildId');end loop;
   normal_move:=exists(select 1 from jsonb_array_elements(initial) t where t->>'symbol'<>'wild');
   for old_wild in select value from jsonb_array_elements(before) loop
    from_pos:=(old_wild->>'cell')::integer;
    select value into move from jsonb_array_elements(p->'movements') where value->>'wildId'=old_wild->>'id';
    dest:=(move->>'to')::integer;
    if move is null or (move->>'from')::integer is distinct from from_pos or dest is null or dest not between 0 and 24 or dest=from_pos or initial->from_pos->>'wildId' is distinct from old_wild->>'id' or (initial->from_pos->>'multiplier')::numeric is distinct from (old_wild->>'multiplier')::numeric then raise exception 'Invalid v4 Wild move';end if;
    if normal_move then
     if mutable->dest->>'symbol'='wild' then raise exception 'Wild landing occupied';end if;
     swap:=mutable->from_pos;mutable:=jsonb_set(mutable,array[from_pos::text],mutable->dest);mutable:=jsonb_set(mutable,array[dest::text],swap);
    end if;
    after_wilds:=after_wilds||jsonb_build_array(jsonb_set(old_wild,'{cell}',to_jsonb(dest)));
   end loop;
   for wild in select value from jsonb_array_elements(new_wilds) loop
    dest:=coalesce((wild->>'landedCell')::integer,(wild->>'cell')::integer);
    if (wild->>'multiplier')::numeric is distinct from 1 or dest is null or dest not between 0 and 24 or initial->dest->>'wildId' is distinct from wild->>'id' or (initial->dest->>'multiplier')::numeric is distinct from 1 or exists(select 1 from jsonb_array_elements(before) t where t->>'id'=wild->>'id' or (t->>'cell')::integer=dest) then raise exception 'Invalid v4 new Wild';end if;
    after_wilds:=after_wilds||jsonb_build_array(wild);
   end loop;
   for i in 0..24 loop
    if normal_move then mutable:=jsonb_set(mutable,array[i::text,'uid'],to_jsonb(i));end if;
    if initial->i->>'symbol'='wild' and not exists(select 1 from jsonb_array_elements(before||new_wilds) t where t->>'id'=initial->i->>'wildId') then raise exception 'Untracked v4 Wild';end if;
   end loop;
   if normal_move and mutable is distinct from g then raise exception 'Invalid v4 movement replay';end if;
   updated:=g;expected:='[]';
   for wild in select value from jsonb_array_elements(after_wilds) loop
    dest:=(wild->>'cell')::integer;factor:=(wild->>'multiplier')::numeric;
    if coalesce(wild->>'id','')='' or length(wild->>'id')>60 or wild->>'id'=any(ids) or dest is null or dest not between 0 and 24 or dest=any(cells) or g->dest->>'symbol' is distinct from 'wild' or g->dest->>'wildId' is distinct from wild->>'id' or (g->dest->>'multiplier')::numeric is distinct from factor then raise exception 'Invalid v4 final Wild';end if;
    ids:=array_append(ids,wild->>'id');cells:=array_append(cells,dest);
    if wild->>'id'=any(active_ids) then updates:=updates||jsonb_build_array(jsonb_build_object('wildId',wild->>'id','from',factor,'to',factor*2));factor:=factor*2;end if;
    expected:=expected||jsonb_build_array(jsonb_set(wild,'{multiplier}',to_jsonb(factor)));updated:=jsonb_set(updated,array[dest::text,'multiplier'],to_jsonb(factor));
   end loop;
   if (select count(*) from jsonb_array_elements(g) t where t->>'symbol'='wild')<>cardinality(ids) or p->'multiplierUpdates' is distinct from updates or p->'updatedGrid' is distinct from updated or p->'persistentWildsAfter' is distinct from expected then raise exception 'Invalid v4 multiplier progression';end if;
   before:=expected;bonus_win:=round(bonus_win+(p->>'winX')::numeric,6);
  end if;
  idx:=idx+1;
 end loop;
 if c->'bonus'<>'null'::jsonb and ((c->'bonus'->>'winX')::numeric is distinct from bonus_win or c->'bonus'->'persistentWilds' is distinct from before) then raise exception 'Invalid v4 bonus total';end if;
 win_total:=round(least(10000,(c->'base'->>'winX')::numeric+bonus_win),6);
 if (c->>'winX')::numeric is distinct from win_total or (c->>'payout')::numeric is distinct from round(win_total*(c->>'bet')::numeric,6) or c->>'result' is distinct from (case when c->'bonus'<>'null'::jsonb then 'persistent-running-wilds' else 'base' end) then raise exception 'Invalid Critter settlement';end if;
end $$;
revoke all on function public.critter_v4_validate(jsonb) from public,anon,authenticated;
create or replace function public.critter_v5_evaluate(g jsonb,is_bonus boolean,pay_scale numeric) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare symbols text[]:=array['ten','jack','king','ace','cat','pigeon','possum','bulldog','wild'];symbol text;seen integer[];q integer[];grp integer[];used integer[]:=array[]::integer[];active integer[]:=array[]::integer[];i integer;j integer;k integer;n integer;has_regular boolean;wins jsonb:='[]';win jsonb;raw numeric;factor numeric;total numeric:=0;total_raw numeric:=0;pay_rows jsonb:='{"ten":[0.2,0.3,0.45,0.65,0.9,1.4,3],"jack":[0.25,0.4,0.55,0.8,1.2,1.8,4],"king":[0.3,0.45,0.7,1,1.5,2.2,5],"ace":[0.4,0.6,0.9,1.3,1.8,2.8,6],"cat":[0.6,0.9,1.3,1.8,2.5,4,8],"pigeon":[0.8,1.2,1.7,2.5,3.5,5,10],"possum":[1,1.5,2.2,3,4.5,7,15],"bulldog":[1.5,2.2,3,4.5,6,10,25],"wild":[1.5,2.2,3,4.5,6,10,25]}';
begin
 if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 then raise exception 'Invalid v5 grid';end if;
 for i in 0..24 loop
  if (g->i->>'uid')::integer is distinct from i or not (coalesce(g->i->>'symbol','')=any(symbols||array['scatter'])) then raise exception 'Invalid v5 tile';end if;
  if g->i->>'symbol'='wild' and ((g->i->>'multiplier')::numeric is null or not ((g->i->>'multiplier')::numeric=any(array[1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536,131072,262144,524288,1048576]::numeric[]))) then raise exception 'Invalid v5 Wild multiplier';end if;
 end loop;
 foreach symbol in array symbols loop
  seen:=array[]::integer[];
  for i in 0..24 loop
   if i=any(seen) or not (g->i->>'symbol'=any(array[symbol,'wild'])) then continue;end if;
   q:=array[i];seen:=array_append(seen,i);grp:=array[]::integer[];has_regular:=false;
   while cardinality(q)>0 loop
    j:=q[1];q:=q[2:];grp:=array_append(grp,j);has_regular:=has_regular or g->j->>'symbol'=symbol;
    foreach k in array array[case when j%5>0 then j-1 else -1 end,case when j%5<4 then j+1 else -1 end,case when j>=5 then j-5 else -1 end,case when j<20 then j+5 else -1 end] loop
     if k>=0 and not k=any(seen) and g->k->>'symbol'=any(array[symbol,'wild']) then seen:=array_append(seen,k);q:=array_append(q,k);end if;
    end loop;
   end loop;
   n:=cardinality(grp);if n<5 or not has_regular or symbol='wild' and grp&&used then continue;end if;
   select array_agg(v order by v) into grp from unnest(grp) v;
   raw:=(pay_rows->symbol->>(case when n>=15 then 6 when n>=10 then 5 else n-5 end))::numeric;
   factor:=1;if is_bonus then select greatest(1,coalesce(sum((g->v->>'multiplier')::numeric),0)) into factor from unnest(grp) v where g->v->>'symbol'='wild';end if;
   win:=jsonb_build_object('symbol',symbol,'size',n,'positions',to_jsonb(grp),'rawWinX',raw,'winX',round(round(raw*pay_scale,6)*factor,6),'multiplier',factor);
   wins:=wins||jsonb_build_array(win);total:=total+(win->>'winX')::numeric;total_raw:=total_raw+raw;used:=used||grp;
   foreach j in array grp loop if g->j->>'symbol'='wild' and not j=any(active) then active:=array_append(active,j);end if;end loop;
  end loop;
 end loop;
 return jsonb_build_object('wins',wins,'winX',round(total,6),'rawWinX',round(total_raw,6),'activeWilds',to_jsonb(active));
end $$;
revoke all on function public.critter_v5_evaluate(jsonb,boolean,numeric) from public,anon,authenticated;
create or replace function public.critter_v5_validate(c jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb;g jsonb;initial jsonb;expected jsonb;result jsonb;before jsonb:='[]';after_wilds jsonb;new_wilds jsonb;wild jsonb;old_wild jsonb;move jsonb;updates jsonb;updated jsonb;mutable jsonb;swap jsonb;plans jsonb[];is_bonus boolean;idx integer:=0;i integer;j integer;dest integer;from_pos integer;sc integer;count_spins integer;bonus_win numeric:=0;factor numeric;win_total numeric;purchase text:=c->>'purchaseType';price numeric;active_ids text[];ids text[];cells integer[];normal_move boolean;
begin
 if c->>'version' is distinct from '5' or c->>'gameId' is distinct from 'critter' or c->>'status' is distinct from 'SETTLED' or not c ?& array['roundId','seed','bet','cost','scatterBoost','purchaseType','base','bonus','payout','winX','result'] then raise exception 'Invalid v5 checkpoint';end if;
 if (c->>'seed')::numeric is null or (c->>'seed')::numeric not between 0 and 4294967295 or (c->>'seed')::numeric<>trunc((c->>'seed')::numeric) or (c->>'bet')::numeric not between 0.000001 and 1000000000 or (c->>'bet')::numeric is null then raise exception 'Invalid v5 values';end if;
 if purchase is not null and purchase not in ('bonus','super') or jsonb_typeof(c->'scatterBoost') is distinct from 'boolean' or purchase is not null and (c->>'scatterBoost')::boolean then raise exception 'Invalid v5 feature';end if;
 price:=round((c->>'bet')::numeric*(case when purchase='bonus' then 50 when purchase='super' then 500 when (c->>'scatterBoost')::boolean then 2.675265 else 1 end),6);
 if (c->>'cost')::numeric is distinct from price then raise exception 'Invalid Critter feature price';end if;
 select count(*) into sc from jsonb_array_elements(c->'base'->'finalGrid') t where t->>'symbol'='scatter';
 if (c->'base'->>'scatters')::integer is distinct from sc or ((c->'bonus')<>'null'::jsonb) is distinct from (purchase is not null or sc>=3) then raise exception 'Invalid v5 trigger';end if;
 plans:=array[c->'base'];
 if c->'bonus'<>'null'::jsonb then
  count_spins:=case when purchase='super' or purchase is null and sc>=4 then 20 else 10 end;
  if jsonb_typeof(c->'bonus'->'spins') is distinct from 'array' or jsonb_array_length(c->'bonus'->'spins')<>count_spins or (c->'bonus'->>'spinCount')::integer is distinct from count_spins or c->'bonus'->>'kind' is distinct from (case when count_spins=20 then 'super' else 'normal' end) then raise exception 'Invalid v5 bonus';end if;
  for p in select value from jsonb_array_elements(c->'bonus'->'spins') loop plans:=array_append(plans,p);end loop;
 end if;
 foreach p in array plans loop
  is_bonus:=idx>0;
  if not p ?& array['initialGrid','finalGrid','updatedGrid','persistentWildsBefore','persistentWildsAfter','movements','newWilds','multiplierUpdates','wins','activeWilds','winX','rawWinX','scatters'] or p ?| array['steps','removed','gravityGrid','nextGrid'] then raise exception 'No cascade allowed in v5';end if;
  g:=p->'finalGrid';initial:=p->'initialGrid';
  if jsonb_typeof(initial) is distinct from 'array' or jsonb_array_length(initial)<>25 then raise exception 'Invalid v5 initial grid';end if;
  for i in 0..24 loop
   if (initial->i->>'uid')::integer is distinct from i or coalesce(initial->i->>'symbol','') not in ('ten','jack','king','ace','cat','pigeon','possum','bulldog','wild','scatter') then raise exception 'Invalid v5 initial tile';end if;
  end loop;
  result:=public.critter_v5_evaluate(g,is_bonus,case when not is_bonus then 3.122183728683 when count_spins=20 then 0.001288816678 else 0.23129493968 end);
  if not is_bonus and purchase is not null then
   if sc<>0 or (p->>'winX')::numeric is distinct from 0 or p->'wins'<>'[]'::jsonb then raise exception 'Purchased bonus must skip base';end if;
  elsif p->'wins' is distinct from result->'wins' or (p->>'winX')::numeric is distinct from (result->>'winX')::numeric or (p->>'rawWinX')::numeric is distinct from (result->>'rawWinX')::numeric or p->'activeWilds' is distinct from result->'activeWilds' then raise exception 'Invalid v5 one-spin result';end if;
  if not is_bonus then
   if initial is distinct from g or p->'updatedGrid' is distinct from g or p->'persistentWildsBefore'<>'[]'::jsonb or p->'persistentWildsAfter'<>'[]'::jsonb or p->'movements'<>'[]'::jsonb or p->'newWilds'<>'[]'::jsonb or p->'multiplierUpdates'<>'[]'::jsonb then raise exception 'Base Wild must be standard';end if;
   for wild in select value from jsonb_array_elements(g) where value->>'symbol'='wild' loop if (wild->>'multiplier')::numeric is distinct from 1 then raise exception 'Base Wild must be x1';end if;end loop;
  else
   if (p->>'scatters')::integer is distinct from 0 or exists(select 1 from jsonb_array_elements(g) t where t->>'symbol'='scatter') or p->'persistentWildsBefore' is distinct from before then raise exception 'Lost v5 persistent state';end if;
   new_wilds:=p->'newWilds';after_wilds:='[]';updates:='[]';active_ids:=array[]::text[];ids:=array[]::text[];cells:=array[]::integer[];mutable:=initial;
   if jsonb_typeof(new_wilds) is distinct from 'array' or jsonb_typeof(p->'movements') is distinct from 'array' or jsonb_array_length(p->'movements')<>jsonb_array_length(before) then raise exception 'Invalid v5 movements';end if;
   for i in select value::integer from jsonb_array_elements_text(result->'activeWilds') loop active_ids:=array_append(active_ids,g->i->>'wildId');end loop;
   normal_move:=exists(select 1 from jsonb_array_elements(initial) t where t->>'symbol'<>'wild');
   for old_wild in select value from jsonb_array_elements(before) loop
    from_pos:=(old_wild->>'cell')::integer;
    select value into move from jsonb_array_elements(p->'movements') where value->>'wildId'=old_wild->>'id';
    dest:=(move->>'to')::integer;
    if move is null or (move->>'from')::integer is distinct from from_pos or dest is null or dest not between 0 and 24 or dest=from_pos or initial->from_pos->>'wildId' is distinct from old_wild->>'id' or (initial->from_pos->>'multiplier')::numeric is distinct from (old_wild->>'multiplier')::numeric then raise exception 'Invalid v5 Wild move';end if;
    if normal_move then
     if mutable->dest->>'symbol'='wild' then raise exception 'Wild landing occupied';end if;
     swap:=mutable->from_pos;mutable:=jsonb_set(mutable,array[from_pos::text],mutable->dest);mutable:=jsonb_set(mutable,array[dest::text],swap);
    end if;
    after_wilds:=after_wilds||jsonb_build_array(jsonb_set(old_wild,'{cell}',to_jsonb(dest)));
   end loop;
   for wild in select value from jsonb_array_elements(new_wilds) loop
    dest:=coalesce((wild->>'landedCell')::integer,(wild->>'cell')::integer);
    if (wild->>'multiplier')::numeric is distinct from 1 or dest is null or dest not between 0 and 24 or initial->dest->>'wildId' is distinct from wild->>'id' or (initial->dest->>'multiplier')::numeric is distinct from 1 or exists(select 1 from jsonb_array_elements(before) t where t->>'id'=wild->>'id' or (t->>'cell')::integer=dest) then raise exception 'Invalid v5 new Wild';end if;
    after_wilds:=after_wilds||jsonb_build_array(wild);
   end loop;
   for i in 0..24 loop
    if normal_move then mutable:=jsonb_set(mutable,array[i::text,'uid'],to_jsonb(i));end if;
    if initial->i->>'symbol'='wild' and not exists(select 1 from jsonb_array_elements(before||new_wilds) t where t->>'id'=initial->i->>'wildId') then raise exception 'Untracked v5 Wild';end if;
   end loop;
   if normal_move and mutable is distinct from g then raise exception 'Invalid v5 movement replay';end if;
   updated:=g;expected:='[]';
   for wild in select value from jsonb_array_elements(after_wilds) loop
    dest:=(wild->>'cell')::integer;factor:=(wild->>'multiplier')::numeric;
    if coalesce(wild->>'id','')='' or length(wild->>'id')>60 or wild->>'id'=any(ids) or dest is null or dest not between 0 and 24 or dest=any(cells) or g->dest->>'symbol' is distinct from 'wild' or g->dest->>'wildId' is distinct from wild->>'id' or (g->dest->>'multiplier')::numeric is distinct from factor then raise exception 'Invalid v5 final Wild';end if;
    ids:=array_append(ids,wild->>'id');cells:=array_append(cells,dest);
    if wild->>'id'=any(active_ids) then updates:=updates||jsonb_build_array(jsonb_build_object('wildId',wild->>'id','from',factor,'to',factor*2));factor:=factor*2;end if;
    expected:=expected||jsonb_build_array(jsonb_set(wild,'{multiplier}',to_jsonb(factor)));updated:=jsonb_set(updated,array[dest::text,'multiplier'],to_jsonb(factor));
   end loop;
   if (select count(*) from jsonb_array_elements(g) t where t->>'symbol'='wild')<>cardinality(ids) or p->'multiplierUpdates' is distinct from updates or p->'updatedGrid' is distinct from updated or p->'persistentWildsAfter' is distinct from expected then raise exception 'Invalid v5 multiplier progression';end if;
   before:=expected;bonus_win:=round(bonus_win+(p->>'winX')::numeric,6);
  end if;
  idx:=idx+1;
 end loop;
 if c->'bonus'<>'null'::jsonb and ((c->'bonus'->>'winX')::numeric is distinct from bonus_win or c->'bonus'->'persistentWilds' is distinct from before) then raise exception 'Invalid v5 bonus total';end if;
 win_total:=round(least(10000,(c->'base'->>'winX')::numeric+bonus_win),6);
 if (c->>'winX')::numeric is distinct from win_total or (c->>'payout')::numeric is distinct from round(win_total*(c->>'bet')::numeric,6) or c->>'result' is distinct from (case when c->'bonus'<>'null'::jsonb then 'persistent-running-wilds' else 'base' end) then raise exception 'Invalid Critter settlement';end if;
end $$;
revoke all on function public.critter_v5_validate(jsonb) from public,anon,authenticated;
create or replace function public.settle_critter_round(p_round_id uuid,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;p jsonb;g jsonb;cell jsonb;s jsonb;win jsonb;idx integer;
 stake numeric;pay numeric;total numeric;computed numeric;base_win numeric;bonus_win numeric:=0;triggered boolean;sc integer;sum_win numeric;sum_raw numeric;step_win numeric;win_value numeric;bonus jsonb;plans jsonb[];v2 boolean;spin_plan jsonb;previous_grid jsonb;expected_multiplier numeric;pos integer;wild_cell jsonb;counts jsonb;expected_count integer;pay_rows jsonb;raw_expected numeric;size_index integer;v3 boolean;purchase text;base_stake numeric;expected_cost numeric;move jsonb;mutable_grid jsonb;swap_cell jsonb;move_from integer;move_to integer;seen_dest integer[];
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>2097152 or not c ?& array['version','roundId','gameId','seed','bet','status','base','bonus','winX','payout','result'] then raise exception 'Invalid Critter checkpoint';end if;
 if c->>'version'='5' then
  perform public.critter_v5_validate(c);
  if (c->>'roundId')::uuid is distinct from p_round_id then raise exception 'Invalid Critter round id';end if;
  base_stake:=(c->>'bet')::numeric;stake:=(c->>'cost')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;triggered:=c->'bonus'<>'null'::jsonb;
 elsif c->>'version'='4' then
  perform public.critter_v4_validate(c);
  if (c->>'roundId')::uuid is distinct from p_round_id then raise exception 'Invalid Critter round id';end if;
  base_stake:=(c->>'bet')::numeric;stake:=(c->>'cost')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;triggered:=c->'bonus'<>'null'::jsonb;
 else
 v3:=c->>'version'='3';purchase:=c->>'purchaseType';base_stake:=(c->>'bet')::numeric;
 stake:=case when v3 then (c->>'cost')::numeric else base_stake end;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;bonus:=c->'bonus';triggered:=bonus<>'null'::jsonb;
 if coalesce(c->>'version','') not in ('1','2','3') or c->>'gameId' is distinct from 'critter' or c->>'status' is distinct from 'SETTLED' or (c->>'roundId')::uuid is distinct from p_round_id
  or (c->>'seed')::bigint is null or (c->>'seed')::bigint not between 0 and 4294967295
  or stake is null or stake<=0 or stake>1000000000000 or stake::text in ('NaN','Infinity','-Infinity')
  or pay is null or pay<0 or pay>10000*base_stake or pay::text in ('NaN','Infinity','-Infinity')
  or total is null or total<0 or total>10000 or total::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid Critter values';end if;
 if base_stake is null or base_stake<=0 or base_stake>1000000000 or base_stake::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid base bet';end if;
 if v3 then
  if not c ?& array['cost','purchaseType','scatterBoost'] or (purchase is not null and purchase not in ('bonus','super')) or jsonb_typeof(c->'scatterBoost') is distinct from 'boolean' or purchase is not null and (c->>'scatterBoost')::boolean then raise exception 'Invalid Critter purchase mode';end if;
  expected_cost:=round(base_stake*(case when purchase='bonus' then 50 when purchase='super' then 500 when (c->>'scatterBoost')::boolean then 3 else 1 end),6);
  if stake is distinct from expected_cost then raise exception 'Invalid Critter feature price';end if;
  if purchase is not null and ((c->'base'->>'winX')::numeric is distinct from 0 or (c->'base'->>'scatters')::integer is distinct from 0 or jsonb_array_length(c->'base'->'steps')<>0) then raise exception 'Purchased bonus must skip paid base';end if;
 end if;
 v2:=c->>'version' in ('2','3');plans:=array[c->'base'];
 if triggered then
  if v2 then
   if jsonb_typeof(bonus->'spins') is distinct from 'array' or jsonb_array_length(bonus->'spins')<>(case when (purchase='super' or purchase is null and (c->'base'->>'scatters')::integer>=4) then 20 else 10 end) or (bonus->>'spinCount')::integer is distinct from (case when (purchase='super' or purchase is null and (c->'base'->>'scatters')::integer>=4) then 20 else 10 end) or bonus->>'kind' is distinct from (case when (purchase='super' or purchase is null and (c->'base'->>'scatters')::integer>=4) then 'super' else 'normal' end) then raise exception 'Invalid persistent Wild bonus';end if;
   previous_grid:=null;
   for spin_plan in select value from jsonb_array_elements(bonus->'spins') loop
    if jsonb_typeof(spin_plan->'initialGrid') is distinct from 'array' or jsonb_array_length(spin_plan->'initialGrid')<>25 then raise exception 'Invalid bonus grid';end if;
    if previous_grid is not null then
     for pos in 0..24 loop
      if previous_grid->pos->>'symbol'='wild' and spin_plan->'initialGrid'->pos->>'symbol' is distinct from 'wild' then raise exception 'Lost persistent Wild';end if;
     end loop;
    end if;
    previous_grid:=spin_plan->'finalGrid';plans:=array_append(plans,spin_plan);
   end loop;
   if bonus->'persistentWilds' is distinct from (select coalesce(jsonb_agg(n-1 order by n),'[]'::jsonb) from jsonb_array_elements(previous_grid) with ordinality as t(v,n) where v->>'symbol'='wild') then raise exception 'Invalid persistent Wild positions';end if;
  else plans:=array_append(plans,bonus->'plan');end if;
 end if;
 foreach p in array plans loop
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'steps') is distinct from 'array' or jsonb_array_length(p->'steps')>12 then raise exception 'Invalid Critter plan';end if;
  foreach g in array array[p->'initialGrid',p->'finalGrid'] loop
   if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 or (select count(distinct (v->>'uid')::integer) from jsonb_array_elements(g) v)<>25 then raise exception 'Invalid Critter grid';end if;
   for cell in select value from jsonb_array_elements(g) loop
    if not cell ?& array['uid','symbol'] or (cell->>'uid')::integer is null or (cell->>'uid')::integer not between 0 and 9999 or cell->>'symbol' is null or cell->>'symbol' not in ('ten','jack','king','ace','cat','pigeon','possum','bulldog','wild','scatter') then raise exception 'Invalid Critter symbol';end if;
   end loop;
  end loop;
  sum_win:=0;sum_raw:=0;counts:='{}'::jsonb;
  if v2 then
   for cell in select value from jsonb_array_elements(p->'initialGrid') where value->>'symbol'='wild' loop
    if (cell->>'multiplier')::integer is distinct from 1 then raise exception 'Wild must start at x1';end if;
   end loop;
  end if;
  for s,idx in select value,(ordinality-1)::integer from jsonb_array_elements(p->'steps') with ordinality loop
   if (s->>'index')::integer is distinct from idx or jsonb_typeof(s->'wins') is distinct from 'array' or jsonb_array_length(s->'wins') not between 1 and 40 or jsonb_typeof(s->'grid') is distinct from 'array' or jsonb_array_length(s->'grid')<>25 then raise exception 'Invalid Critter cascade';end if;
   if idx=0 and s->'grid' is distinct from p->'initialGrid' then raise exception 'Invalid Critter initial cascade';end if;
   if idx>0 and s->'grid' is distinct from p->'steps'->(idx-1)->'nextGrid' then raise exception 'Invalid Critter cascade prefix';end if;
   if jsonb_typeof(s->'moves') is distinct from 'array' or jsonb_array_length(s->'moves')>25 then raise exception 'Invalid Critter running wilds';end if;
   if (select count(distinct v->>'uid') from jsonb_array_elements(s->'moves') v)<>jsonb_array_length(s->'moves') then raise exception 'Duplicate Critter Wild movement';end if;
   step_win:=0;
   if v2 then
    for cell in select value from jsonb_array_elements(s->'grid') where value->>'symbol'='wild' loop
     if (cell->>'multiplier')::numeric is distinct from coalesce((counts->>(cell->>'uid'))::numeric,1) then raise exception 'Invalid Wild multiplier progression';end if;
    end loop;
   end if;
   for win in select value from jsonb_array_elements(s->'wins') loop
    win_value:=(win->>'winX')::numeric;expected_multiplier:=1;
    if v2 then
     if jsonb_typeof(win->'positions') is distinct from 'array' then raise exception 'Invalid cluster positions';end if;
     if (select count(distinct value::integer) from jsonb_array_elements_text(win->'positions'))<>jsonb_array_length(win->'positions') then raise exception 'Duplicate cluster position';end if;
     for pos in select value::integer from jsonb_array_elements_text(win->'positions') loop
      if pos not between 0 and 24 then raise exception 'Invalid cluster position';end if;
      wild_cell:=s->'grid'->pos;
      if wild_cell->>'symbol'='wild' then expected_multiplier:=greatest(expected_multiplier,(wild_cell->>'multiplier')::numeric);
      elsif wild_cell->>'symbol' is distinct from win->>'symbol' then raise exception 'Wrong cluster symbol';end if;
     end loop;
     if (win->>'multiplier')::numeric is distinct from expected_multiplier then raise exception 'Invalid cluster multiplier';end if;
     pay_rows:='{"ten":[0.2,0.3,0.45,0.65,0.9,1.4,3],"jack":[0.25,0.4,0.55,0.8,1.2,1.8,4],"king":[0.3,0.45,0.7,1,1.5,2.2,5],"ace":[0.4,0.6,0.9,1.3,1.8,2.8,6],"cat":[0.6,0.9,1.3,1.8,2.5,4,8],"pigeon":[0.8,1.2,1.7,2.5,3.5,5,10],"possum":[1,1.5,2.2,3,4.5,7,15],"bulldog":[1.5,2.2,3,4.5,6,10,25],"wild":[1.5,2.2,3,4.5,6,10,25]}'::jsonb;
     size_index:=case when (win->>'size')::integer>=15 then 6 when (win->>'size')::integer>=10 then 5 else (win->>'size')::integer-5 end;
     raw_expected:=(pay_rows->(win->>'symbol')->>size_index)::numeric;
     if raw_expected is null or (win->>'rawWinX')::numeric is distinct from raw_expected then raise exception 'Invalid Critter paytable';end if;
    end if;
    if (win->>'size')::integer is null or (win->>'size')::integer not between 5 and 25 or jsonb_typeof(win->'positions') is distinct from 'array' or jsonb_array_length(win->'positions')<>(win->>'size')::integer
     or win_value is null or win_value<0 or win_value>1000000 or win_value::text in ('NaN','Infinity','-Infinity') or win_value is distinct from round(round((win->>'rawWinX')::numeric*(case when v2 then 0.000699792925918 else 3.7256 end),6)*expected_multiplier,6) then raise exception 'Invalid Critter cluster';end if;
    step_win:=step_win+win_value;
   end loop;
   if (s->>'winX')::numeric is distinct from round(step_win,6) or (s->>'rawWinX')::numeric is null or (s->>'rawWinX')::numeric<0 then raise exception 'Invalid Critter cascade payout';end if;
   if v2 then
    for cell in select distinct s->'grid'->(v.value::integer) from jsonb_array_elements(s->'wins') as award(value) cross join lateral jsonb_array_elements_text(award.value->'positions') v where s->'grid'->(v.value::integer)->>'symbol'='wild' loop
     counts:=jsonb_set(counts,array[cell->>'uid'],to_jsonb((cell->>'multiplier')::numeric*2));
    end loop;
    if not v3 and p is distinct from c->'base' and jsonb_array_length(s->'moves')<>0 then raise exception 'Bonus Wild cannot run';end if;
    if s->'nextGrid'<>'null'::jsonb then
     for cell in select value from jsonb_array_elements(s->'nextGrid') where value->>'symbol'='wild' loop
      if (cell->>'multiplier')::numeric is distinct from coalesce((counts->>(cell->>'uid'))::numeric,1) then raise exception 'Invalid next Wild multiplier';end if;
     end loop;
     if not v3 and p is distinct from c->'base' then
      for pos in 0..24 loop
       if s->'grid'->pos->>'symbol'='wild' and s->'nextGrid'->pos->>'symbol' is distinct from 'wild' then raise exception 'Bonus Wild moved';end if;
      end loop;
     end if;
    end if;
   end if;
   if v3 and s->'nextGrid'<>'null'::jsonb then
    if jsonb_typeof(s->'gravityGrid') is distinct from 'array' or jsonb_array_length(s->'gravityGrid')<>25 then raise exception 'Invalid Running Wild gravity';end if;
    mutable_grid:=s->'gravityGrid';seen_dest:=array[]::integer[];
    for pos in 0..24 loop
     cell:=s->'grid'->pos;
     if cell->>'symbol'='wild' and (mutable_grid->pos->>'uid' is distinct from cell->>'uid' or (mutable_grid->pos->>'multiplier')::numeric is distinct from coalesce((counts->>(cell->>'uid'))::numeric,1)) then raise exception 'Wild anchor lost during gravity';end if;
    end loop;
    for move in select value from jsonb_array_elements(s->'moves') loop
     move_from:=(move->>'from')::integer;move_to:=(move->>'to')::integer;
     if move_from is null or move_to is null or move_from not between 0 and 24 or move_to not between 0 and 24 or move_to=any(seen_dest) or mutable_grid->move_from->>'symbol' is distinct from 'wild' or mutable_grid->move_from->>'uid' is distinct from move->>'uid' or not (s->'activeWilds' @> jsonb_build_array((move->>'uid')::integer)) or coalesce(mutable_grid->move_to->>'symbol','') in ('wild','scatter','') then raise exception 'Invalid Running Wild move';end if;
     swap_cell:=mutable_grid->move_from;mutable_grid:=jsonb_set(mutable_grid,array[move_from::text],mutable_grid->move_to);mutable_grid:=jsonb_set(mutable_grid,array[move_to::text],swap_cell);seen_dest:=array_append(seen_dest,move_to);
    end loop;
    if mutable_grid is distinct from s->'nextGrid' then raise exception 'Running Wild replay mismatch';end if;
   end if;
   sum_win:=sum_win+step_win;sum_raw:=sum_raw+(s->>'rawWinX')::numeric;
  end loop;
  if (p->>'winX')::numeric is distinct from round(sum_win,6) or (p->>'rawWinX')::numeric is distinct from round(sum_raw,6) then raise exception 'Invalid Critter plan payout';end if;
  if jsonb_array_length(p->'steps')=0 then
   if p->'initialGrid' is distinct from p->'finalGrid' then raise exception 'Invalid Critter empty plan';end if;
  else
   s:=p->'steps'->(jsonb_array_length(p->'steps')-1);
   if p->'finalGrid' is distinct from (case when s->'nextGrid'='null'::jsonb then s->'grid' else s->'nextGrid' end) then raise exception 'Invalid Critter final grid';end if;
  end if;
 end loop;
 select count(*) into sc from jsonb_array_elements(c->'base'->'finalGrid') v where v->>'symbol'='scatter';
 if (c->'base'->>'scatters')::integer is distinct from sc or triggered is distinct from (sc>=3 or purchase is not null) then raise exception 'Invalid Critter bonus trigger';end if;
 if triggered and not v2 then
  if (bonus->>'cashX')::numeric is null or (bonus->>'cashX')::numeric not in (2,5,10,25) or (bonus->>'extraWilds')::integer is null or (bonus->>'extraWilds')::integer not in (3,4,5)
   or (bonus->>'multiplier')::integer is null or (bonus->>'multiplier')::integer not in (2,3,5) or (bonus->'plan'->>'scatters')::integer is distinct from 0 then raise exception 'Invalid Dumpster Dash';end if;
  bonus_win:=round(((bonus->>'cashX')::numeric+(bonus->'plan'->>'winX')::numeric)*(bonus->>'multiplier')::numeric,6);
  if (bonus->>'winX')::numeric is distinct from bonus_win then raise exception 'Invalid Dumpster payout';end if;
 end if;
 if triggered and v2 then
  select round(sum((value->>'winX')::numeric),6) into bonus_win from jsonb_array_elements(bonus->'spins');
  if (bonus->>'winX')::numeric is distinct from bonus_win or exists(select 1 from jsonb_array_elements(bonus->'spins') v where (v->>'scatters')::integer is distinct from 0) then raise exception 'Invalid persistent bonus payout';end if;
 end if;
 computed:=round(least(10000,(c->'base'->>'winX')::numeric+bonus_win),6);
 if total is distinct from computed or pay is distinct from round(total*base_stake,6) then raise exception 'Invalid Critter settlement';end if;
 end if;
 select * into w from public.wallets where user_id=u for update;if not found then raise exception 'Wallet missing';end if;
 select * into r from public.game_rounds where round_id=p_round_id and user_id=u;
 if found then
  if r.game_id<>'critter' or r.status<>'settled' or r.metadata->'critter' is distinct from c then raise exception 'VAULT_WALLET_CONFLICT';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);
 end if;
 if w.revision is distinct from p_expected_revision or w.balance<stake or exists(select 1 from public.game_rounds where round_id=p_round_id) then raise exception 'VAULT_WALLET_CONFLICT';end if;
 if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
 insert into public.game_rounds(round_id,user_id,game_id,bet,payout,multiplier,result,status,metadata,settled_at)
 values(p_round_id,u,'critter',stake,pay,total,c->>'result','settled',jsonb_build_object('critter',c,'seed',c->'seed','dumpsterDash',triggered),now());
 update public.wallets set balance=balance-stake+pay,revision=revision+1,recovery=recovery||jsonb_build_object('critterRound',c),updated_at=now() where user_id=u returning * into w;
 insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier) values(u,'critter',1,stake,pay,pay,total)
 on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
 update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false);
end $$;
revoke all on function public.settle_critter_round(uuid,bigint,jsonb) from public,anon;
grant execute on function public.settle_critter_round(uuid,bigint,jsonb) to authenticated;
-- Settings function keeps its existing timestamp semantics; add only the new screen ID.
create or replace function public.save_vault_settings(p_settings jsonb,p_updated_at timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.user_settings;
begin
 if u is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_settings)<>'object' or octet_length(p_settings::text)>4096 or p_updated_at is null then raise exception 'Invalid settings';end if;
 select * into s from public.user_settings where user_id=u for update;
 if p_updated_at<=s.updated_at then return to_jsonb(s);end if;
 update public.user_settings set sound_enabled=coalesce((p_settings->>'sound')::boolean,s.sound_enabled),music_enabled=coalesce((p_settings->>'music')::boolean,s.music_enabled),fast_mode=coalesce((p_settings->>'fastGame')::boolean,s.fast_mode),
 fast_bonus=coalesce((p_settings->>'fastBonus')::boolean,s.fast_bonus),scatter_boost=coalesce((p_settings->>'scatterBoost')::boolean,s.scatter_boost),
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;
notify pgrst, 'reload schema';

-- supabase_swamp_levels.sql
-- Swamp bonus v2: fifteen spins per sequential qualified level. Run the whole file.
-- Extends only Swamp validation; financial updates/revision/duplicate/statistics code stays intact.
create or replace function public.swamp_bonus_v2_validate_begin(old_b jsonb,b jsonb,m jsonb,stake numeric,rid uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare expected jsonb;
begin
 if m->>'freeSpin'='true' then
  if old_b->>'version' is distinct from '2' then return;end if;
  expected:=(old_b-'previousTier')||jsonb_build_object('phase','playing','remaining',(old_b->>'remaining')::int-1,'spinsPlayed',(old_b->>'spinsPlayed')::int+1);
  if b is distinct from expected then raise exception 'Invalid Swamp level spin consumption';end if;
 elsif m ? 'purchaseType' then
  if m->>'purchaseType' is distinct from 'bonus' or (m->>'purchaseSpins')::int is distinct from 15 or b->>'version' is distinct from '2' or b->>'phase' is distinct from 'intro' or (b->>'remaining')::int is distinct from 15 or (b->>'triggerSeed')::bigint is distinct from (m->>'seed')::bigint or (m->>'seed')::bigint is null or (m->>'seed')::bigint not between 0 and 4294967295 then raise exception 'Invalid Swamp fifteen-spin purchase';end if;
 end if;
end $$;
create or replace function public.swamp_bonus_v2_validate_settle(old_b jsonb,b jsonb,m jsonb,started jsonb,payout numeric,rid uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare expected jsonb;tier int;count_f int;mult numeric;fish numeric;collected numeric;win numeric;total numeric;bet numeric;
begin
 if started ? 'purchaseType' then
  if b is distinct from old_b or payout<>0 then raise exception 'Invalid Swamp purchase settlement';end if;return;
 end if;
 if started->>'freeSpin'='true' then
  if old_b->>'version' is distinct from '2' then return;end if;
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
   expected:=jsonb_build_object('version',2,'featureId',rid::text,'bet',bet,'remaining',15,'collectors',0,'tier',0,'totalWinX',(m->>'winX')::numeric,'spinsPlayed',0,'phase','intro');
   if b is distinct from expected then raise exception 'Invalid Swamp natural bonus entitlement';end if;
  elsif b is not null and b<>'null'::jsonb then raise exception 'Unexpected Swamp bonus';end if;
 end if;
end $$;
revoke all on function public.swamp_bonus_v2_validate_begin(jsonb,jsonb,jsonb,numeric,uuid),public.swamp_bonus_v2_validate_settle(jsonb,jsonb,jsonb,jsonb,numeric,uuid) from public,anon,authenticated;
-- Patch known, narrowly scoped hooks into the currently installed financial functions.
-- Refuse an unfamiliar function layout rather than replacing unrelated wallet logic.
do $patch$
declare def text;anchor text;hook text;
begin
 select pg_get_functiondef('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)'::regprocedure) into def;
 if position('swamp_bonus_v2_validate_begin' in def)=0 then
  anchor:=' if p_game_id=''swamp'' then';
  if position(anchor in def)=0 then raise exception 'Swamp begin hook not found';end if;
  hook:=' if p_game_id=''swamp'' and p_metadata->>''mathVersion''=''3'' then perform public.swamp_bonus_v2_validate_begin(w.recovery->''swampBonus'',p_recovery->''swampBonus'',p_metadata,p_bet,p_round_id);end if;'||chr(10);
  def:=replace(def,anchor,hook||anchor);
  anchor:='(case p_metadata->>''purchaseType'' when ''bonus'' then 10 else 20 end)';
  if position(anchor in def)=0 then raise exception 'Swamp purchase hook not found';end if;
  def:=replace(def,anchor,'(case when p_metadata->>''mathVersion''=''3'' then 15 when p_metadata->>''purchaseType''=''bonus'' then 10 else 20 end)');
  execute def;
 end if;
 select pg_get_functiondef('public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb)'::regprocedure) into def;
 if position('swamp_bonus_v2_validate_settle' in def)=0 then
  anchor:=' if p_game_id=''mines'' then';
  if position(anchor in def)=0 then raise exception 'Swamp settlement hook not found';end if;
  hook:=' if p_game_id=''swamp'' and r.metadata->>''mathVersion''=''3'' and p_status=''settled'' then perform public.swamp_bonus_v2_validate_settle(w.recovery->''swampBonus'',p_recovery->''swampBonus'',p_metadata,r.metadata,p_payout,p_round_id);end if;'||chr(10);
  def:=replace(def,anchor,hook||anchor);execute def;
 end if;
end $patch$;
create or replace function public.swamp_slot_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',2,'purchaseVersion',1,'siteAdminVersion',1,'boostVersion',1,'bonusVersion',2);$$;
revoke all on function public.swamp_slot_capabilities() from public,anon;
grant execute on function public.swamp_slot_capabilities() to authenticated;
notify pgrst,'reload schema';

-- supabase_swamp_math_v4.sql
-- Swamp calibrated math4; preserves legacy math2/math3 entitlements and financial bodies.
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
select public.critter_capabilities(),public.swamp_slot_capabilities();
