"""Regenerate mode coefficients and versioned SQL from checked-in fit reports."""
from pathlib import Path
import json,re
r=Path(__file__).resolve().parent.parent; fit=json.loads((r/'reports/critter-calibration-fit.json').read_text());sc={k:round(v,12) for k,v in fit['payScales'].items()};price=round(fit['boostPrice'],6)
refine=r/'reports/critter-refine-fit.json'
if refine.exists():
 f=json.loads(refine.read_text());sc.update(normal=round(f['bonus']['scale'],12),super=round(f['super']['scale'],12))
p=r/'critter/config.js';s=p.read_text();s=re.sub(r'payScale:[0-9.]+',f'payScale:{sc["base"]}',s);s=re.sub(r'payScales:\{[^}]+\}','payScales:{'+','.join(f'{k}:{v}' for k,v in sc.items())+'}',s);s=re.sub(r'boostCost:[0-9.]+',f'boostCost:{price}',s);p.write_text(s)
s=(r/'supabase_critter_v4.sql').read_text();a=s.index('create or replace function public.critter_v4_evaluate');b=s.index('create or replace function public.settle_critter_round');helpers=s[a:b].replace('critter_v4_', 'critter_v5_').replace('evaluate(g jsonb,is_bonus boolean)', 'evaluate(g jsonb,is_bonus boolean,pay_scale numeric)').replace('raw*0.000699792925918','raw*pay_scale').replace('evaluate(jsonb,boolean)','evaluate(jsonb,boolean,numeric)').replace("version' is distinct from '4'", "version' is distinct from '5'").replace('v4','v5').replace('then 3 else 1 end',f'then {price} else 1 end').replace('public.critter_v5_evaluate(g,is_bonus)', f'public.critter_v5_evaluate(g,is_bonus,case when not is_bonus then {sc["base"]} when count_spins=20 then {sc["super"]} else {sc["normal"]} end)')
s=s[:b]+helpers+s[b:];s=s.replace("'gameplayVersion',4,'roundVersions',jsonb_build_array(1,2,3,4)","'gameplayVersion',4,'mathVersion',5,'roundVersions',jsonb_build_array(1,2,3,4,5)")
needle=" if c->>'version'='4' then\n  perform public.critter_v4_validate(c);"
replacement=" if c->>'version'='5' then\n  perform public.critter_v5_validate(c);\n  if (c->>'roundId')::uuid is distinct from p_round_id then raise exception 'Invalid Critter round id';end if;\n  base_stake:=(c->>'bet')::numeric;stake:=(c->>'cost')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;triggered:=c->'bonus'<>'null'::jsonb;\n elsif c->>'version'='4' then\n  perform public.critter_v4_validate(c);"
assert needle in s;s=s.replace(needle,replacement)
for name in ['supabase_critter_v5.sql','supabase_critter_v5.txt','supabase_critter.sql','supabase_critter.txt']:(r/name).write_text(s)

from pathlib import Path
import json,re
r=Path(__file__).resolve().parent.parent;f=json.loads((r/'reports/swamp-calibration-fit.json').read_text());price=round(f['boostPrice'],6)
p=r/'swamp/config.js';s=p.read_text();s=re.sub(r'costMultiplier:[0-9.]+',f'costMultiplier:{price}',s);s=re.sub(r'collectorChance:[0-9.]+',f'collectorChance:{f["collectorChance"]:.12f}',s);s=re.sub(r'lineScale:[0-9.]+',f'lineScale:{f["lineScale"]:.12f}',s);p.write_text(s)
old=(r/'supabase_swamp_levels.sql').read_text();a=old.index('create or replace function public.swamp_bonus_v2_validate_begin');b=old.index('-- Patch known');helpers=old[a:b].replace('swamp_bonus_v2_','swamp_bonus_v3_').replace("version' is distinct from '2'", "version' is distinct from '3'").replace("'version',2,'featureId'","'version',3,'featureId'")
patch="""-- Swamp calibrated math4; preserves legacy math2/math3 entitlements and financial bodies.
begin;
"""+helpers+"""
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
  def:=replace(def,anchor,'round((p_metadata->>''baseBet'')::numeric*(case when p_metadata->>''mathVersion''=''4'' then PRICE else 1.5 end),6)');
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
""".replace('PRICE',str(price))
for ext in ['sql','txt']:(r/f'supabase_swamp_math_v4.{ext}').write_text(patch)
combined='-- VAULT RELEASE: run this whole file in Supabase SQL Editor. Existing project schema is required.\n-- One transaction; any error rolls everything back. Never paste only a selected fragment.\nbegin;\n'
for name in ['supabase_critter_v5.sql','supabase_swamp_levels.sql','supabase_swamp_math_v4.sql']:
 s=(r/name).read_text();s='\n'.join(line for line in s.splitlines() if line.strip().lower() not in ['begin;','commit;']);combined+='\n-- '+name+'\n'+s+'\n'
combined+='\ncommit;\nselect public.critter_capabilities(),public.swamp_slot_capabilities();\n'
for ext in ['sql','txt']:(r/f'VAULT_RELEASE_SETUP.{ext}').write_text(combined)
