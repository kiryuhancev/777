"""Critter-only update; compare other games and all money operations to50e3f77."""
from pathlib import Path
import subprocess,re,json
root=Path(__file__).resolve().parent.parent;base='50e3f77'
def before(p):return subprocess.check_output(['git','show',base+':'+p],cwd=root).decode()
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root).decode().splitlines()
protected=[p for p in paths if p.startswith(('bird/','poker/','tables/','swamp/','heist/','magnet/','mines/','slot-animation/','assets/')) or p.startswith('vault/') and p!='vault/runtime.js' or p.endswith(('.sql','.txt')) and not p.startswith('supabase_critter')]
for path in protected:
 assert (root/path).read_bytes()==subprocess.check_output(['git','show',base+':'+path],cwd=root),path
old=before('vault/runtime.js');new=(root/'vault/runtime.js').read_text();strip=lambda s:re.sub(r'  // Critter is a whole deterministic paid round:[\s\S]*?  // MAGNET owns', '  // MAGNET owns',s)
assert strip(old)==strip(new),'runtime outside Critter adapter changed'
# Original debit, outbox, revision, rollback and checkpoint operations are byte-identical.
for marker in ['const rollback=','if(enqueue(\'critter\'','clientRevision++;canonicalBalance=','if(!VaultStorage.saveLocalState())']:
 assert next(l for l in old.splitlines() if marker in l)==next(l for l in new.splitlines() if marker in l),marker
strip=lambda s:re.sub(r"  if\(c.id==='critter'\).*",'',s)
assert strip(before('slot-hud/hud.js'))==strip((root/'slot-hud/hud.js').read_text())
def clean(s):
 for name in ['CRITTER STYLES','CRITTER SCREEN','CRITTER MODULE','VAULT RUNTIME','SLOT HUD MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 return s
assert clean(before('index.html'))==clean((root/'index.html').read_text()),'unrelated embedded source changed'
old=before('supabase_critter.sql');new=(root/'supabase_critter_v2.sql').read_text();marker=' select * into w from public.wallets where user_id=u for update;'
assert old[old.index(marker):]==new[new.index(marker):],'wallet/stats/access/grants changed'
assert (root/'supabase_critter_v2.sql').read_bytes()==(root/'supabase_critter_v2.txt').read_bytes()==(root/'supabase_critter.sql').read_bytes()==(root/'supabase_critter.txt').read_bytes()
report={'baseline':base,'protectedFiles':len(protected),'checks':['Other game source/assets/models, auth/config and unrelated schema byte-identical','Shared HUD changes only Critter status text','Whole embedded site outside Critter/runtime/HUD blocks byte-identical','Original debit/credit/outbox/revision/rollback unchanged','SQL wallet/statistics/access/grants tail unchanged; only Critter validation/capability extended']}
(root/'reports/critter-v2-isolation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',report)
