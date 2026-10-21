-- VAULT latest bonus update. Run the WHOLE file. No account/balance reset.
begin;

-- supabase_critter_v6.sql
-- Critter v6: left-to-right Ways, legacy rounds retained. Execute the complete file.
-- Critter Chaos v4: NO CASCADE; persistent running Wilds with personal bonus multipliers. Run this WHOLE file on the existing VAULT database.
-- No existing account, wallet, game outcome or auth setting is reset.
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
create or replace function public.critter_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',2,'featuresVersion',3,'gameplayVersion',6,'mathVersion',6,'roundVersions',jsonb_build_array(1,2,3,4,5,6));$$;
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
create or replace function public.critter_v6_evaluate(g jsonb,is_bonus boolean,pay_scale numeric) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare syms text[]:=array['ten','jack','king','ace','cat','pigeon','possum','bulldog','wild'];s text;counts integer[];regs integer[];wc integer[];wm numeric[];len integer;c integer;r integer;i integer;k integer;n integer;ways numeric;weighted numeric;pure numeric;pure_weight numeric;term numeric;raw numeric;pay numeric;factor numeric;positions integer[];active integer[]:=array[]::integer[];wins jsonb:='[]';total numeric:=0;total_raw numeric:=0;has_other boolean;rows jsonb:='{"ten":[0.2,0.3,0.45],"jack":[0.25,0.4,0.55],"king":[0.3,0.45,0.7],"ace":[0.4,0.6,0.9],"cat":[0.6,0.9,1.3],"pigeon":[0.8,1.2,1.7],"possum":[1,1.5,2.2],"bulldog":[1.5,2.2,3],"wild":[1.5,2.2,3]}';
begin
 if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 then raise exception 'Invalid v6 grid';end if;
 for i in 0..24 loop
  if (g->i->>'uid')::integer is distinct from i or not (coalesce(g->i->>'symbol','')=any(syms||array['scatter'])) then raise exception 'Invalid v6 tile';end if;
  if g->i->>'symbol'='wild' then
   factor:=(g->i->>'multiplier')::numeric;
   if factor is null or not exists(select 1 from generate_series(0,40) v where power(2::numeric,v)=factor) then raise exception 'Invalid v6 Wild multiplier';end if;
  end if;
 end loop;
 foreach s in array syms loop
  counts:=array[]::integer[];regs:=array[]::integer[];wc:=array[]::integer[];wm:=array[]::numeric[];len:=0;
  for c in 0..4 loop
   n:=0;counts:=array_append(counts,0);regs:=array_append(regs,0);wc:=array_append(wc,0);wm:=array_append(wm,0);
   for r in 0..4 loop
    i:=r*5+c;
    if g->i->>'symbol'='wild' then counts[c+1]:=counts[c+1]+1;wc[c+1]:=wc[c+1]+1;wm[c+1]:=wm[c+1]+(g->i->>'multiplier')::numeric;
    elsif g->i->>'symbol'=s then counts[c+1]:=counts[c+1]+1;regs[c+1]:=regs[c+1]+1;end if;
   end loop;
   exit when counts[c+1]=0;len:=len+1;
  end loop;
  if len<3 then continue;end if;
  ways:=1;pure:=1;weighted:=1;pure_weight:=0;
  for c in 1..len loop ways:=ways*counts[c];pure:=pure*wc[c];weighted:=weighted*regs[c];end loop;
  if is_bonus then
   for c in 1..len loop
    term:=wm[c];for k in 1..len loop if k<>c then term:=term*counts[k];end if;end loop;weighted:=weighted+term;
    term:=wm[c];for k in 1..len loop if k<>c then term:=term*wc[k];end if;end loop;pure_weight:=pure_weight+term;
   end loop;
  else weighted:=ways;pure_weight:=pure;end if;
  if s<>'wild' then ways:=ways-pure;weighted:=weighted-pure_weight;end if;
  if ways=0 then continue;end if;
  positions:=array[]::integer[];
  for c in 0..len-1 loop
   has_other:=false;for k in 1..len loop if k<>c+1 and regs[k]>0 then has_other:=true;end if;end loop;
   for r in 0..4 loop i:=r*5+c;
    if g->i->>'symbol'=s or g->i->>'symbol'='wild' and (s='wild' or has_other) then positions:=array_append(positions,i);end if;
   end loop;
  end loop;
  raw:=round((rows->s->>(len-3))::numeric*weighted,6);pay:=round(raw*pay_scale,6);
  wins:=wins||jsonb_build_array(jsonb_build_object('symbol',s,'length',len,'ways',ways,'weightedWays',weighted,'positions',to_jsonb(positions),'rawWinX',raw,'winX',pay,'multiplier',round(weighted/ways,6)));
  total:=total+pay;total_raw:=total_raw+raw;
  foreach i in array positions loop if g->i->>'symbol'='wild' and not i=any(active) then active:=array_append(active,i);end if;end loop;
 end loop;
 return jsonb_build_object('wins',wins,'winX',round(total,6),'rawWinX',round(total_raw,6),'activeWilds',to_jsonb(active));
end $$;
revoke all on function public.critter_v6_evaluate(jsonb,boolean,numeric) from public,anon,authenticated;

create or replace function public.critter_v6_validate(c jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare p jsonb;g jsonb;initial jsonb;expected jsonb;result jsonb;before jsonb:='[]';after_wilds jsonb;new_wilds jsonb;wild jsonb;old_wild jsonb;move jsonb;updates jsonb;updated jsonb;mutable jsonb;swap jsonb;plans jsonb[];is_bonus boolean;idx integer:=0;i integer;j integer;dest integer;from_pos integer;sc integer;count_spins integer;bonus_win numeric:=0;factor numeric;win_total numeric;purchase text:=c->>'purchaseType';price numeric;active_ids text[];ids text[];cells integer[];normal_move boolean;
begin
 if (c->>'wildMultiplierCap')::numeric is distinct from 1099511627776 then raise exception 'Invalid Wild cap';end if;
 if c->>'version' is distinct from '6' or c->>'gameId' is distinct from 'critter' or c->>'status' is distinct from 'SETTLED' or not c ?& array['roundId','seed','bet','cost','scatterBoost','purchaseType','base','bonus','payout','winX','result'] then raise exception 'Invalid v6 checkpoint';end if;
 if (c->>'seed')::numeric is null or (c->>'seed')::numeric not between 0 and 4294967295 or (c->>'seed')::numeric<>trunc((c->>'seed')::numeric) or (c->>'bet')::numeric not between 0.000001 and 1000000000 or (c->>'bet')::numeric is null then raise exception 'Invalid v6 values';end if;
 if purchase is not null and purchase not in ('bonus','super') or jsonb_typeof(c->'scatterBoost') is distinct from 'boolean' or purchase is not null and (c->>'scatterBoost')::boolean then raise exception 'Invalid v6 feature';end if;
 price:=round((c->>'bet')::numeric*(case when purchase='bonus' then 50 when purchase='super' then 500 when (c->>'scatterBoost')::boolean then 2.675367 else 1 end),6);
 if (c->>'cost')::numeric is distinct from price then raise exception 'Invalid Critter feature price';end if;
 select count(*) into sc from jsonb_array_elements(c->'base'->'finalGrid') t where t->>'symbol'='scatter';
 if (c->'base'->>'scatters')::integer is distinct from sc or ((c->'bonus')<>'null'::jsonb) is distinct from (purchase is not null or sc>=3) then raise exception 'Invalid v6 trigger';end if;
 plans:=array[c->'base'];
 if c->'bonus'<>'null'::jsonb then
  count_spins:=case when purchase='super' or purchase is null and sc>=4 then 20 else 10 end;
  if jsonb_typeof(c->'bonus'->'spins') is distinct from 'array' or jsonb_array_length(c->'bonus'->'spins')<>count_spins or (c->'bonus'->>'spinCount')::integer is distinct from count_spins or c->'bonus'->>'kind' is distinct from (case when count_spins=20 then 'super' else 'normal' end) then raise exception 'Invalid v6 bonus';end if;
  for p in select value from jsonb_array_elements(c->'bonus'->'spins') loop plans:=array_append(plans,p);end loop;
 end if;
 foreach p in array plans loop
  is_bonus:=idx>0;
  if not p ?& array['initialGrid','finalGrid','updatedGrid','persistentWildsBefore','persistentWildsAfter','movements','newWilds','multiplierUpdates','wins','activeWilds','winX','rawWinX','scatters'] or p ?| array['steps','removed','gravityGrid','nextGrid'] then raise exception 'No cascade allowed in v6';end if;
  g:=p->'finalGrid';initial:=p->'initialGrid';
  if jsonb_typeof(initial) is distinct from 'array' or jsonb_array_length(initial)<>25 then raise exception 'Invalid v6 initial grid';end if;
  for i in 0..24 loop
   if (initial->i->>'uid')::integer is distinct from i or coalesce(initial->i->>'symbol','') not in ('ten','jack','king','ace','cat','pigeon','possum','bulldog','wild','scatter') then raise exception 'Invalid v6 initial tile';end if;
  end loop;
  if not is_bonus and exists(select 1 from jsonb_array_elements(g) with ordinality t(v,n) where v->>'symbol'='scatter' group by (n-1)%5 having count(*)>1) then raise exception 'One Scatter per reel';end if;
  result:=public.critter_v6_evaluate(g,is_bonus,case when not is_bonus then 0.089580411515765 when count_spins=20 then 0.000007596199575 else 0.002621672353986 end);
  if not is_bonus and purchase is not null then
   if sc<>0 or (p->>'winX')::numeric is distinct from 0 or p->'wins'<>'[]'::jsonb then raise exception 'Purchased bonus must skip base';end if;
  elsif p->'wins' is distinct from result->'wins' or (p->>'winX')::numeric is distinct from (result->>'winX')::numeric or (p->>'rawWinX')::numeric is distinct from (result->>'rawWinX')::numeric or p->'activeWilds' is distinct from result->'activeWilds' then raise exception 'Invalid v6 one-spin result';end if;
  if not is_bonus then
   if initial is distinct from g or p->'updatedGrid' is distinct from g or p->'persistentWildsBefore'<>'[]'::jsonb or p->'persistentWildsAfter'<>'[]'::jsonb or p->'movements'<>'[]'::jsonb or p->'newWilds'<>'[]'::jsonb or p->'multiplierUpdates'<>'[]'::jsonb then raise exception 'Base Wild must be standard';end if;
   for wild in select value from jsonb_array_elements(g) where value->>'symbol'='wild' loop if (wild->>'multiplier')::numeric is distinct from 1 then raise exception 'Base Wild must be x1';end if;end loop;
  else
   if (p->>'scatters')::integer is distinct from 0 or exists(select 1 from jsonb_array_elements(g) t where t->>'symbol'='scatter') or p->'persistentWildsBefore' is distinct from before then raise exception 'Lost v6 persistent state';end if;
   new_wilds:=p->'newWilds';after_wilds:='[]';updates:='[]';active_ids:=array[]::text[];ids:=array[]::text[];cells:=array[]::integer[];mutable:=initial;
   if jsonb_typeof(new_wilds) is distinct from 'array' or jsonb_typeof(p->'movements') is distinct from 'array' or jsonb_array_length(p->'movements')<>jsonb_array_length(before) then raise exception 'Invalid v6 movements';end if;
   for i in select value::integer from jsonb_array_elements_text(result->'activeWilds') loop active_ids:=array_append(active_ids,g->i->>'wildId');end loop;
   normal_move:=exists(select 1 from jsonb_array_elements(initial) t where t->>'symbol'<>'wild');
   for old_wild in select value from jsonb_array_elements(before) loop
    from_pos:=(old_wild->>'cell')::integer;
    select value into move from jsonb_array_elements(p->'movements') where value->>'wildId'=old_wild->>'id';
    dest:=(move->>'to')::integer;
    if move is null or (move->>'from')::integer is distinct from from_pos or dest is null or dest not between 0 and 24 or dest=from_pos or initial->from_pos->>'wildId' is distinct from old_wild->>'id' or (initial->from_pos->>'multiplier')::numeric is distinct from (old_wild->>'multiplier')::numeric then raise exception 'Invalid v6 Wild move';end if;
    if normal_move then
     if mutable->dest->>'symbol'='wild' then raise exception 'Wild landing occupied';end if;
     swap:=mutable->from_pos;mutable:=jsonb_set(mutable,array[from_pos::text],mutable->dest);mutable:=jsonb_set(mutable,array[dest::text],swap);
    end if;
    after_wilds:=after_wilds||jsonb_build_array(jsonb_set(old_wild,'{cell}',to_jsonb(dest)));
   end loop;
   for wild in select value from jsonb_array_elements(new_wilds) loop
    dest:=coalesce((wild->>'landedCell')::integer,(wild->>'cell')::integer);
    if (wild->>'multiplier')::numeric is distinct from 1 or dest is null or dest not between 0 and 24 or initial->dest->>'wildId' is distinct from wild->>'id' or (initial->dest->>'multiplier')::numeric is distinct from 1 or exists(select 1 from jsonb_array_elements(before) t where t->>'id'=wild->>'id' or (t->>'cell')::integer=dest) then raise exception 'Invalid v6 new Wild';end if;
    after_wilds:=after_wilds||jsonb_build_array(wild);
   end loop;
   for i in 0..24 loop
    if normal_move then mutable:=jsonb_set(mutable,array[i::text,'uid'],to_jsonb(i));end if;
    if initial->i->>'symbol'='wild' and not exists(select 1 from jsonb_array_elements(before||new_wilds) t where t->>'id'=initial->i->>'wildId') then raise exception 'Untracked v6 Wild';end if;
   end loop;
   if normal_move and mutable is distinct from g then raise exception 'Invalid v6 movement replay';end if;
   updated:=g;expected:='[]';
   for wild in select value from jsonb_array_elements(after_wilds) loop
    dest:=(wild->>'cell')::integer;factor:=(wild->>'multiplier')::numeric;
    if coalesce(wild->>'id','')='' or length(wild->>'id')>60 or wild->>'id'=any(ids) or dest is null or dest not between 0 and 24 or dest=any(cells) or g->dest->>'symbol' is distinct from 'wild' or g->dest->>'wildId' is distinct from wild->>'id' or (g->dest->>'multiplier')::numeric is distinct from factor then raise exception 'Invalid v6 final Wild';end if;
    ids:=array_append(ids,wild->>'id');cells:=array_append(cells,dest);
    if wild->>'id'=any(active_ids) then updates:=updates||jsonb_build_array(jsonb_build_object('wildId',wild->>'id','from',factor,'to',least(1099511627776,factor*2)));factor:=least(1099511627776,factor*2);end if;
    expected:=expected||jsonb_build_array(jsonb_set(wild,'{multiplier}',to_jsonb(factor)));updated:=jsonb_set(updated,array[dest::text,'multiplier'],to_jsonb(factor));
   end loop;
   if (select count(*) from jsonb_array_elements(g) t where t->>'symbol'='wild')<>cardinality(ids) or p->'multiplierUpdates' is distinct from updates or p->'updatedGrid' is distinct from updated or p->'persistentWildsAfter' is distinct from expected then raise exception 'Invalid v6 multiplier progression';end if;
   before:=expected;bonus_win:=round(bonus_win+(p->>'winX')::numeric,6);
  end if;
  idx:=idx+1;
 end loop;
 if c->'bonus'<>'null'::jsonb and ((c->'bonus'->>'winX')::numeric is distinct from bonus_win or c->'bonus'->'persistentWilds' is distinct from before) then raise exception 'Invalid v6 bonus total';end if;
 win_total:=round(least(10000,(c->'base'->>'winX')::numeric+bonus_win),6);
 if (c->>'winX')::numeric is distinct from win_total or (c->>'payout')::numeric is distinct from round(win_total*(c->>'bet')::numeric,6) or c->>'result' is distinct from (case when c->'bonus'<>'null'::jsonb then 'persistent-running-wilds' else 'base' end) then raise exception 'Invalid Critter settlement';end if;
end $$;
revoke all on function public.critter_v6_validate(jsonb) from public,anon,authenticated;
create or replace function public.settle_critter_round(p_round_id uuid,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;p jsonb;g jsonb;cell jsonb;s jsonb;win jsonb;idx integer;
 stake numeric;pay numeric;total numeric;computed numeric;base_win numeric;bonus_win numeric:=0;triggered boolean;sc integer;sum_win numeric;sum_raw numeric;step_win numeric;win_value numeric;bonus jsonb;plans jsonb[];v2 boolean;spin_plan jsonb;previous_grid jsonb;expected_multiplier numeric;pos integer;wild_cell jsonb;counts jsonb;expected_count integer;pay_rows jsonb;raw_expected numeric;size_index integer;v3 boolean;purchase text;base_stake numeric;expected_cost numeric;move jsonb;mutable_grid jsonb;swap_cell jsonb;move_from integer;move_to integer;seen_dest integer[];
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>2097152 or not c ?& array['version','roundId','gameId','seed','bet','status','base','bonus','winX','payout','result'] then raise exception 'Invalid Critter checkpoint';end if;
 if c->>'version'='6' then
  perform public.critter_v6_validate(c);
  if (c->>'roundId')::uuid is distinct from p_round_id then raise exception 'Invalid Critter round id';end if;
  base_stake:=(c->>'bet')::numeric;stake:=(c->>'cost')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;triggered:=c->'bonus'<>'null'::jsonb;
 elsif c->>'version'='5' then
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

-- supabase_bonus_sessions.sql
-- VAULT feature escrow. Apply after current game migrations. No credentials or reset.
create table if not exists public.vault_bonus_sessions(
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, game_id text not null check(game_id in ('slot','swamp','vault_heist','magnet','critter')),
 held_win numeric not null default 0 check(held_win>=0 and held_win<=1000000000000),
 status text not null default 'active' check(status in ('active','settled')),
 created_at timestamptz not null default now(),settled_at timestamptz,
 primary key(user_id,session_id),unique(session_id)
);
create unique index if not exists vault_bonus_one_active on public.vault_bonus_sessions(user_id,game_id) where status='active';
create table if not exists public.vault_bonus_events(
 user_id uuid not null,session_id uuid not null,event_key text not null,
 primary key(user_id,session_id,event_key),foreign key(user_id,session_id) references public.vault_bonus_sessions(user_id,session_id) on delete cascade
);
alter table public.vault_bonus_sessions enable row level security;
alter table public.vault_bonus_events enable row level security;
revoke all on public.vault_bonus_sessions,public.vault_bonus_events from public,anon,authenticated;
grant select on public.vault_bonus_sessions to authenticated;
drop policy if exists bonus_read_self on public.vault_bonus_sessions;
create policy bonus_read_self on public.vault_bonus_sessions for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.vault_bonus_capabilities() returns jsonb language sql stable set search_path='' as $$select '{"version":1}'::jsonb;$$;
revoke all on function public.vault_bonus_capabilities() from public,anon;
grant execute on function public.vault_bonus_capabilities() to authenticated;
create or replace function public.apply_bonus_checkpoint(p_action text,p_payload jsonb,p_session_id uuid,p_game_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;s public.vault_bonus_sessions;r jsonb;c jsonb:=p_payload->'p_checkpoint';rid uuid:=(p_payload->>'p_round_id')::uuid;key text;held numeric:=0;rev bigint;existing boolean;mirror jsonb;
begin
 if u is null or p_game_id not in ('slot','swamp','vault_heist','magnet','critter') or p_action not in ('begin','settle','critter','heist','magnet') or p_session_id is null or rid is null then raise exception 'Invalid bonus event';end if;
 if p_action in ('begin','settle') and p_payload->>'p_game_id' is distinct from p_game_id or p_action='critter' and p_game_id<>'critter' or p_action='heist' and p_game_id<>'vault_heist' or p_action='magnet' and p_game_id<>'magnet' then raise exception 'Bonus game mismatch';end if;
 select * into w from public.wallets where user_id=u for update;if not found then raise exception 'Wallet missing';end if;
 select * into s from public.vault_bonus_sessions where user_id=u and session_id=p_session_id;existing:=found;
 if existing and s.game_id<>p_game_id then raise exception 'Bonus identity mismatch';end if;
 key:=p_action||':'||rid::text||':'||coalesce(c->>'step','0');
 if exists(select 1 from public.vault_bonus_events where user_id=u and session_id=p_session_id and event_key=key) then return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);end if;
 if existing and s.status='settled' then raise exception 'Bonus already settled';end if;
 if not existing then
  if p_session_id<>rid then raise exception 'Bonus root missing';end if;
  if p_action='critter' and (c->'bonus' is null or c->'bonus'='null') or p_action='magnet' and coalesce((c->'bonus'->>'triggered')::boolean,false)=false or p_action='heist' and c->>'status'='SETTLED' and c->>'result'='base' then raise exception 'Bonus entitlement missing';end if;
  if p_action='settle' and (p_payload->'p_recovery'->(case when p_game_id='slot' then 'slotBonus' else 'swampBonus' end) is null or p_payload->'p_recovery'->(case when p_game_id='slot' then 'slotBonus' else 'swampBonus' end)='null') then raise exception 'Bonus checkpoint missing';end if;
 end if;
 rev:=case when existing then w.revision else (p_payload->>'p_expected_revision')::bigint end;
 if p_action='begin' then r:=public.begin_game_round(rid,p_game_id,(p_payload->>'p_bet')::numeric,rev,p_payload->'p_metadata',p_payload->'p_recovery');
 elsif p_action='settle' then r:=public.record_game_round(rid,p_game_id,(p_payload->>'p_bet')::numeric,(p_payload->>'p_payout')::numeric,(p_payload->>'p_multiplier')::numeric,p_payload->>'p_result',p_payload->'p_metadata',p_payload->>'p_status',p_payload->'p_recovery');if coalesce((p_payload->'p_metadata'->>'freeSpin')::boolean,false) then held:=(p_payload->>'p_payout')::numeric;end if;
 elsif p_action='critter' then r:=public.settle_critter_round(rid,rev,c);held:=greatest(0,(c->>'payout')::numeric-least((c->>'payout')::numeric,round((c->'base'->>'winX')::numeric*(c->>'bet')::numeric,6)));
 elsif p_action='heist' then r:=public.apply_heist_checkpoint(rid,(p_payload->>'p_previous_step')::integer,rev,c);if c->>'status'='SETTLED' then held:=(c->>'payout')::numeric;end if;
 elsif c->>'version'='2' then r:=public.apply_magnet_v2_checkpoint(rid,(p_payload->>'p_previous_step')::integer,rev,c);if c->>'status'='SETTLED' then held:=(c->>'payout')::numeric;end if;
 else r:=public.apply_magnet_checkpoint(rid,(p_payload->>'p_previous_step')::integer,rev,c);if c->>'status'='SETTLED' then held:=(c->>'payout')::numeric;end if;end if;
 if coalesce((r->>'duplicate')::boolean,false) then raise exception 'Legacy round already applied';end if;
 if not existing then insert into public.vault_bonus_sessions(user_id,session_id,game_id) values(u,p_session_id,p_game_id);end if;
 insert into public.vault_bonus_events values(u,p_session_id,key);
 update public.vault_bonus_sessions set held_win=held_win+held where user_id=u and session_id=p_session_id returning * into s;
 mirror:=jsonb_build_object('version',1,'id',s.session_id,'gameId',s.game_id,'status',s.status,'heldWin',s.held_win,'totalWin',s.held_win);
 -- Old RPC credit and escrow transfer are in one transaction; no intermediate credit is observable.
 update public.wallets set balance=balance-held,recovery=jsonb_set(recovery,'{bonusSessions}',coalesce(recovery->'bonusSessions','{}')||jsonb_build_object(p_game_id,mirror),true) where user_id=u returning * into w;
 return r||jsonb_build_object('balance',w.balance,'revision',w.revision,'bonusSession',mirror);
end $$;
revoke all on function public.apply_bonus_checkpoint(text,jsonb,uuid,text) from public,anon;
grant execute on function public.apply_bonus_checkpoint(text,jsonb,uuid,text) to authenticated;
create or replace function public.settle_bonus_session(p_session_id uuid,p_game_id text,p_expected_revision bigint,p_completion jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;s public.vault_bonus_sessions;c jsonb;terminal boolean:=false;mirror jsonb;
begin
 if u is null then raise exception 'Authentication required';end if;
 select * into w from public.wallets where user_id=u for update;
 select * into s from public.vault_bonus_sessions where user_id=u and session_id=p_session_id for update;
 if not found or s.game_id is distinct from p_game_id then raise exception 'Bonus session missing';end if;
 if s.status='settled' then return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);end if;
 if p_game_id='slot' then c:=w.recovery->'slotBonus';terminal:=c is not null and (c->>'freeSpins')::integer=0;
 elsif p_game_id='swamp' then c:=w.recovery->'swampBonus';terminal:=c->>'featureId'=p_session_id::text and c->>'phase'='complete';
 else c:=w.recovery->(case p_game_id when 'critter' then 'critterRound' when 'magnet' then 'magnetRound' else 'heistRound' end);terminal:=c->>'roundId'=p_session_id::text and c->>'status'='SETTLED';end if;
 if terminal is distinct from true then raise exception 'Bonus is not complete';end if;
 update public.vault_bonus_sessions set status='settled',settled_at=now() where user_id=u and session_id=p_session_id returning * into s;
 mirror:=jsonb_build_object('version',1,'id',s.session_id,'gameId',s.game_id,'status',s.status,'heldWin',s.held_win,'totalWin',s.held_win);
 update public.wallets set balance=balance+s.held_win,revision=revision+1,recovery=jsonb_set(recovery,'{bonusSessions}',coalesce(recovery->'bonusSessions','{}')||jsonb_build_object(p_game_id,mirror),true),updated_at=now() where user_id=u returning * into w;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'bonusSession',mirror);
end $$;
revoke all on function public.settle_bonus_session(uuid,text,bigint,jsonb) from public,anon;
grant execute on function public.settle_bonus_session(uuid,text,bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select public.critter_capabilities(),public.vault_bonus_capabilities(),public.swamp_slot_capabilities();
