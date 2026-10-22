"""Additive final Curtain persistence migration; leaves v1/v2 settlement available."""
from pathlib import Path
R=Path(__file__).resolve().parent.parent
import re
scale=re.search(r'bonusPayoutScale:([\d.]+)',(R/'big-top/config.js').read_text())[1]
v=(R/'big-top/validate-v2.sql').read_text().replace('big_top_v2_validate_plan','big_top_v3_validate_plan')
v=v.replace("symbol text;","symbol text;playing integer[];before_state jsonb;after_state jsonb;states jsonb:='[]';record jsonb;")
v=v.replace("if is_bonus and p->'encoreBefore' is distinct from coalesce(previous->'encoreAfter','[]') then raise exception 'Encore boundary mismatch';end if;", "before_state:=case when is_bonus then coalesce(previous->'persistentAfter','[]') else '[]'::jsonb end;after_state:=before_state;playing:=public.big_top_playing_reels(final);if p->'persistentBefore' is distinct from before_state or p->'encoreBefore' is distinct from '[]'::jsonb or p->'encoreAfter' is distinct from '[]'::jsonb then raise exception 'Persistence boundary mismatch';end if;")
a=v.index("   if not is_bonus or not coalesce(previous->'encoreAfter'");b=v.index('  else\n',a)
v=v[:a]+"   if not is_bonus or not exists(select 1 from jsonb_array_elements(before_state) e where e->>'curtainId'=f->>'id' and (e->>'reelIndex')::integer=r and e->>'winnerClownId'=f->>'winner' and e->>'multiplier'=f->>'multiplier') then raise exception 'Invalid persistent carry';end if;\n"+v[b:]
a=v.index("  if (f->>'encore')::boolean");b=v.index(' end loop;',a)
v=v[:a]+"""  if (f->>'encore')::boolean is distinct from false then raise exception 'Legacy Encore in v3';end if;
  if is_bonus and not coalesce((f->>'carried')::boolean,false) and r=any(playing) then
   after_state:=after_state||jsonb_build_array(jsonb_build_object('curtainId',f->>'id','reelIndex',r,'winnerClownId',f->>'winner','multiplier',(f->>'multiplier')::integer,'persistent',true,'bonusSessionId',p->>'bonusSessionId'));
  end if;
  states:=states||jsonb_build_array(jsonb_build_object('curtainId',f->>'id','reelIndex',r,'participates',r=any(playing),'persistent',is_bonus and (coalesce((f->>'carried')::boolean,false) or r=any(playing)),'visualState',case when coalesce((f->>'carried')::boolean,false) and not(r=any(playing)) then 'CLOSED_HIGHLIGHTED' else 'OPEN_WINNER' end));
"""+v[b:]
a=v.index(" if is_bonus and exists(select 1 from jsonb_array_elements(coalesce(previous->'encoreAfter'");b=v.index(' for r in 0..5 loop for row',a)
v=v[:a]+""" if exists(select 1 from jsonb_array_elements(before_state) e where not exists(select 1 from jsonb_array_elements(features) ff where ff->>'id'=e->>'curtainId' and coalesce((ff->>'carried')::boolean,false))) then raise exception 'Persistent Curtain lost';end if;
 select coalesce(jsonb_agg(x order by (x->>'reelIndex')::integer),'[]') into after_state from jsonb_array_elements(after_state) x;
 if expected is distinct from final or triggers is distinct from p->'curtainTriggers' or after_state is distinct from p->'persistentAfter' or states is distinct from p->'curtainStates' then raise exception 'Persistent final state mismatch';end if;
"""+v[b:]
v=v.replace('value:=public.big_top_v2_grid_win(final);', 'value:=public.big_top_v2_grid_win(final);if is_bonus then value:=round(value*'+scale+',6);end if;')
helper="""create or replace function public.big_top_playing_reels(g jsonb) returns integer[] language plpgsql immutable set search_path='' as $$
declare ids text[]:=array['ten','j','q','k','a','dog','duck','boot','weight','skate','fish'];sym text;r integer;len integer;hit boolean;wild_reels integer[];result integer[]:=array[]::integer[];
begin
 foreach sym in array ids loop len:=0;wild_reels:=array[]::integer[];
 for r in 0..5 loop
  select exists(select 1 from jsonb_array_elements(g->r) s where s->>'symbol' in (sym,'wild')) into hit;if not hit then exit;end if;len:=len+1;
  if exists(select 1 from jsonb_array_elements(g->r) s where s->>'symbol'='wild') then wild_reels:=array_append(wild_reels,r);end if;
 end loop;
 if len>=3 then result:=result||wild_reels;end if;
 end loop;return array(select distinct x from unnest(result) x order by x);
end $$;
revoke all on function public.big_top_playing_reels(jsonb) from public,anon,authenticated;
"""
base=(R/'supabase_big_top_v2.txt').read_text();a=base.index('create or replace function public.settle_big_top_round');b=base.index('create or replace function public.big_top_capabilities',a);settle=base[a:b]
legacy=settle.replace('public.settle_big_top_round','public.settle_big_top_v2_round').replace('grant execute on function public.settle_big_top_v2_round(uuid,bigint,jsonb) to authenticated;','revoke all on function public.settle_big_top_v2_round(uuid,bigint,jsonb) from authenticated;')
current=settle.replace("if c->>'version'='1' then return public.settle_big_top_v1_round(p_round_id,p_expected_revision,p_checkpoint);end if;", "if c->>'version' in ('1','2') then return public.settle_big_top_v2_round(p_round_id,p_expected_revision,p_checkpoint);end if;")
current=current.replace("c->>'version' is distinct from '2'","c->>'version' is distinct from '3'").replace('public.big_top_v2_validate_plan','public.big_top_v3_validate_plan')
current=current.replace("for p in select * from jsonb_array_elements(c->'bonus'->'spins') loop", "for p in select * from jsonb_array_elements(c->'bonus'->'spins') loop if p->>'bonusSessionId' is distinct from p_round_id::text then raise exception 'Bonus owner mismatch';end if;")
current=current.replace("'complete',false);","'complete',false,'persistentCurtains','[]'::jsonb);")
cost=re.search(r'buyMultiplier:(\d+)',(R/'big-top/config.js').read_text())[1]
current=current.replace('then 244 else 1','then '+cost+' else 1')
orig=(R/'supabase_big_top.txt').read_text();a=orig.index('create or replace function public.save_big_top_progress');b=orig.index('--',a) if False else orig.index('grant execute on function public.save_big_top_progress',a);b=orig.index(';',b)+1
progress=orig[a:b].replace(" if p is distinct from expected", " if c->>'version'='3' then expected:=expected||jsonb_build_object('persistentCurtains',coalesce(last->'persistentAfter','[]'));end if;\n if p is distinct from expected")
(R/'supabase_big_top_v3.txt').write_text('-- FINAL handoff: apply AFTER supabase_big_top_v2.txt. Existing balances unchanged.\nbegin;\n'+helper+v+legacy+current+progress+"\ncreate or replace function public.big_top_capabilities() returns jsonb language sql stable set search_path='' as $$select '{\"version\":1,\"mathVersion\":3,\"roundVersions\":[1,2,3]}'::jsonb;$$;\nnotify pgrst,'reload schema';\ncommit;\nselect public.big_top_capabilities();\n")
print('Generated supabase_big_top_v3.txt (includes verification SELECT)')
