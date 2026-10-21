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
