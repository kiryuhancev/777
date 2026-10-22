"""Generate a single additive TXT migration while preserving the shipped v1 functions."""
from pathlib import Path
import re
R=Path(__file__).resolve().parent.parent
config=(R/'big-top/config-v2.js').read_text();scale=re.search(r'payoutScale:([\d.]+)',config)[1];cost=re.search(r'buyMultiplier:(\d+)',config)[1]
s=(R/'supabase_big_top.txt').read_text();a=s.index('create or replace function public.big_top_grid_win');b=s.index('create or replace function public.big_top_validate_plan');grid=s[a:b].replace('big_top_grid_win','big_top_v2_grid_win').replace('*2.55','*'+scale).replace('* 2.55','* '+scale)
a=s.index('create or replace function public.settle_big_top_round');b=s.index('create or replace function public.credit_big_top_base');settle=s[a:b];legacy=settle.replace('settle_big_top_round','settle_big_top_v1_round');current=settle.replace("c->>'version' is distinct from '1'","c->>'version' is distinct from '2'").replace('public.big_top_validate_plan','public.big_top_v2_validate_plan').replace('then 110 else 1','then '+cost+' else 1')
current=current.replace("if u is null then raise exception 'Authentication required';end if;", "if u is null then raise exception 'Authentication required';end if;if c->>'version'='1' then return public.settle_big_top_v1_round(p_round_id,p_expected_revision,p_checkpoint);end if;",1)
# Never expose the legacy direct entry under a new grant; public wrapper retains original escrow check.
legacy=legacy.replace('grant execute on function public.settle_big_top_v1_round(uuid,bigint,jsonb) to authenticated;','revoke all on function public.settle_big_top_v1_round(uuid,bigint,jsonb) from authenticated;')
validator=(R/'big-top/validate-v2.sql').read_text()
cap="""create or replace function public.big_top_capabilities() returns jsonb language sql stable set search_path='' as $$select '{"version":1,"mathVersion":2,"roundVersions":[1,2]}'::jsonb;$$;
notify pgrst,'reload schema';
commit;
"""
(R/'supabase_big_top_v2.txt').write_text('-- 2026-10-22 additive BIG TOP full-reel update. Run after prior BIG TOP and UPSIDE PAWS migrations.\nbegin;\n'+grid+validator+legacy+current+cap)
print('Generated supabase_big_top_v2.txt; scale='+scale+'; cost='+cost)
