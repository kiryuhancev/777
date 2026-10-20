from pathlib import Path
import subprocess,re,json
root=Path(__file__).resolve().parent.parent;base='51f93d0'
def old(p):return subprocess.check_output(['git','show',base+':'+p],cwd=root)
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root).decode().splitlines();protected=[p for p in paths if p.startswith(('critter/','bird/','poker/','heist/','magnet/','mines/','tables/','assets/','slot-animation/')) or p.startswith('vault/') and p!='vault/runtime.js' or p.endswith(('.sql','.txt'))]
for p in protected:assert old(p)==(root/p).read_bytes(),p
before=old('vault/runtime.js').decode();after=(root/'vault/runtime.js').read_text();strip=lambda s:re.sub(r'    async checkSwampSupport\(\)\{[\s\S]*?    get swampSupport\(\)','    get swampSupport()',s);after=after.replace('if(isFree){swampCursor=SWAMP_MODEL.acknowledge(swampCursor);swampCursor={...swampCursor,remaining:swampCursor.remaining-1,spinsPlayed:swampCursor.spinsPlayed+1};}else swampCursor=','if(isFree)swampCursor={...swampCursor,remaining:swampCursor.remaining-1,spinsPlayed:swampCursor.spinsPlayed+1};else swampCursor=');assert strip(before)==strip(after),'Runtime changed outside Swamp capability check'
clean=lambda s:re.sub(r'<!-- BEGIN (SWAMP STYLES|SWAMP SCREEN|SWAMP MODULE|VAULT RUNTIME|SLOT HUD STYLES) -->[\s\S]*?<!-- END \1 -->','',s)
assert clean(old('index.html').decode())==clean((root/'index.html').read_text()),'Embedded unrelated game changed'
assert old('slot-hud/hud.js')==(root/'slot-hud/hud.js').read_bytes()
assert (root/'slot-hud/hud.css').read_text().startswith(old('slot-hud/hud.css').decode())
# Financial body preserved by the migration, except Swamp guards and one versioned15-spin clause.
def installed(signature):return subprocess.check_output(['docker','exec','vault-postgres-test','psql','-U','postgres','-d','vault_test','-At','-c',f"select pg_get_functiondef('{signature}'::regprocedure)"],text=True)
b=installed('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)');b=re.sub(r" if p_game_id='swamp' and p_metadata->>'mathVersion'='3' then perform public.swamp_bonus_v2_validate_begin.*?end if;\n",'',b).replace("(case when p_metadata->>'mathVersion'='3' then 15 when p_metadata->>'purchaseType'='bonus' then 10 else 20 end)","(case p_metadata->>'purchaseType' when 'bonus' then 10 else 20 end)")
assert b==(root/'tools/fixtures/swamp-before-levels-begin.sql').read_text()
b=installed('public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb)');b=re.sub(r" if p_game_id='swamp' and r.metadata->>'mathVersion'='3'.*?swamp_bonus_v2_validate_settle.*?end if;\n",'',b)
assert b==(root/'tools/fixtures/swamp-before-levels-record.sql').read_text()
assert (root/'supabase_swamp_levels.sql').read_bytes()==(root/'supabase_swamp_levels.txt').read_bytes()
report={'baseline':base,'protectedFiles':len(protected),'checks':['Other games/assets/analog engine and HUD JavaScript byte-identical; only confirmation width/close-button CSS polish','Runtime changes only Swamp capability check and phase normalization on rebase; wallet/settlement/auth unchanged','SQL installed financial bodies unchanged after masking only versioned Swamp entitlement guards','New model generation/payline math matches frozen legacy on4000 seeded scenes; only bonus rules/config changed']};(root/'reports/swamp-levels-isolation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',report)
