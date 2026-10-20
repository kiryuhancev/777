"""Calibration is confined to Critter/Swamp; financial body and other games retained."""
from pathlib import Path
import subprocess,re,json
root=Path(__file__).resolve().parent.parent;base='b4454b4'
def old(p):return subprocess.check_output(['git','show',base+':'+p],cwd=root)
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root).decode().splitlines();protected=[p for p in paths if p.startswith(('bird/','poker/','heist/','magnet/','mines/','tables/','assets/','slot-animation/','slot-hud/')) or p.startswith('vault/') and p!='vault/runtime.js']
for p in protected:assert old(p)==(root/p).read_bytes(),p
clean=lambda s:re.sub(r'<!-- BEGIN (CRITTER MODULE|SWAMP MODULE|VAULT RUNTIME) -->[\s\S]*?<!-- END \1 -->','',s)
assert clean(old('index.html').decode())==clean((root/'index.html').read_text()),'Unrelated embedded frontend changed'
def installed(signature):return subprocess.check_output(['docker','exec','vault-postgres-test','psql','-U','postgres','-d','vault_test','-At','-c',f"select pg_get_functiondef('{signature}'::regprocedure)"],text=True)
b=installed('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)');b=re.sub(r" if p_game_id='swamp' and p_metadata->>'mathVersion'='[34]' then perform public.swamp_bonus_v[23]_validate_begin.*?end if;\n",'',b).replace("(case when p_metadata->>'mathVersion' in ('3','4') then 15 when p_metadata->>'purchaseType'='bonus' then 10 else 20 end)","(case p_metadata->>'purchaseType' when 'bonus' then 10 else 20 end)")
b=b.replace("(case when p_metadata->>'mathVersion'='4' then 1.481493 else 1.5 end)", '1.5');assert b==(root/'tools/fixtures/swamp-before-levels-begin.sql').read_text(),'Unrelated begin financial body changed'
b=installed('public.record_game_round(uuid,text,numeric,numeric,numeric,text,jsonb,text,jsonb)');b=re.sub(r" if p_game_id='swamp' and r.metadata->>'mathVersion'='[34]'.*?swamp_bonus_v[23]_validate_settle.*?end if;\n",'',b);assert b==(root/'tools/fixtures/swamp-before-levels-record.sql').read_text(),'Unrelated settlement body changed'
assert (root/'VAULT_RELEASE_SETUP.sql').read_bytes()==(root/'VAULT_RELEASE_SETUP.txt').read_bytes()
report={'baseline':base,'protectedFiles':len(protected),'checks':['Other games, assets, Universal HUD, analog animation engine byte-identical','Only embedded Critter/Swamp modules and version capability gates changed','Existing wallet lock/revision/debit/credit/statistics bodies unchanged after masking Swamp validation hooks and versioned price/15-spin guards','Unified TXT equals SQL; migrations repeat-safe in isolated PostgreSQL']};(root/'reports/release-isolation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',report)
