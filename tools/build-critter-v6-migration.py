from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
s=(root/'supabase_critter_v5.sql').read_text()
config=(root/'critter/config.js').read_text()
base,normal,super_=re.search(r'payScales:\{base:([^,]+),normal:([^,]+),super:([^}]+)',config).groups()
boost=re.search(r'boostCost:([^,]+)',config)[1]
eval_sql=(root/'critter/ways-evaluator.sql').read_text()
a=s.index('create or replace function public.critter_v5_validate(');b=s.index('create or replace function public.settle_critter_round(',a)
validator=s[a:b].replace('critter_v5','critter_v6').replace('v5','v6').replace("distinct from '5'","distinct from '6'")
validator=validator.replace('3.122183728683',base).replace('0.001288816678',super_).replace('0.23129493968',normal).replace('2.675265',boost)
validator=validator.replace(" if c->>'version'", " if (c->>'wildMultiplierCap')::numeric is distinct from 1099511627776 then raise exception 'Invalid Wild cap';end if;\n if c->>'version'",1)
validator=validator.replace("  result:=public.critter_v6_evaluate", "  if not is_bonus and exists(select 1 from jsonb_array_elements(g) with ordinality t(v,n) where v->>'symbol'='scatter' group by (n-1)%5 having count(*)>1) then raise exception 'One Scatter per reel';end if;\n  result:=public.critter_v6_evaluate")
validator=validator.replace("'to',factor*2));factor:=factor*2;","'to',least(1099511627776,factor*2)));factor:=least(1099511627776,factor*2);")
s=s[:b]+eval_sql+'\n'+validator+s[b:]
s=s.replace(" if c->>'version'='5' then", " if c->>'version'='6' then\n  perform public.critter_v6_validate(c);\n  if (c->>'roundId')::uuid is distinct from p_round_id then raise exception 'Invalid Critter round id';end if;\n  base_stake:=(c->>'bet')::numeric;stake:=(c->>'cost')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;triggered:=c->'bonus'<>'null'::jsonb;\n elsif c->>'version'='5' then")
s=s.replace("'gameplayVersion',4,'mathVersion',5,'roundVersions',jsonb_build_array(1,2,3,4,5)","'gameplayVersion',6,'mathVersion',6,'roundVersions',jsonb_build_array(1,2,3,4,5,6)")
s='-- Critter v6: left-to-right Ways, legacy rounds retained. Execute the complete file.\n'+s
for ext in ['sql','txt']:(root/f'supabase_critter_v6.{ext}').write_text(s)
