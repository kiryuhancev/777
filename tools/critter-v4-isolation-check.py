"""Verify the v4 scope against the complete v3 implementation."""
from pathlib import Path
import subprocess,re,json
root=Path(__file__).resolve().parent.parent;base='7611de9'
def before(p):return subprocess.check_output(['git','show',base+':'+p],cwd=root)
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root).decode().splitlines()
protected=[p for p in paths if p.startswith(('bird/','poker/','tables/','swamp/','heist/','magnet/','mines/','slot-animation/','slot-hud/','assets/')) or p.startswith('vault/') and p!='vault/runtime.js' or p.endswith(('.sql','.txt')) and not p.startswith('supabase_critter')]
for path in protected:assert (root/path).read_bytes()==before(path),path
old=before('vault/runtime.js').decode();new=(root/'vault/runtime.js').read_text()
# Money service, auth and all generic round tracking unchanged.
for begin,end in [('  const VaultWalletService','  Object.defineProperty'),('  const VaultRoundService','  const VaultRecovery'),('  function renderIdentity','  function applyRemote')]:
 assert old[old.index(begin):old.index(end)]==new[new.index(begin):new.index(end)],begin
# All changes outside the Critter adapter are exact, explicit recovery call/data additions.
mask=lambda s:re.sub(r'  // Critter is a whole deterministic paid round:[\s\S]*?  // MAGNET owns','  // MAGNET owns',s)
s=new
s=s.replace(',critterProgress:null','').replace('    out.recovery.critterProgress=CRITTER_MODEL.validateProgress(out.recovery.critterRound,x.recovery?.critterProgress);\n','')
s=s.replace('VaultCritter.restore(data.recovery.critterRound,data.recovery.critterProgress);','VaultCritter.restore(data.recovery.critterRound);')
s=s.replace("if(wallet){data.recovery.critterRound=CRITTER_MODEL.validate(remote.wallet.recovery?.critterRound);data.recovery.critterProgress=CRITTER_MODEL.validateProgress(data.recovery.critterRound,data.recovery.critterProgress);}","if(wallet)data.recovery.critterRound=CRITTER_MODEL.validate(remote.wallet.recovery?.critterRound);")
s=s.replace('data.recovery.critterProgress=CRITTER_MODEL.validateProgress(critterCursor,data.recovery.critterProgress);VaultCritter.restore(critterCursor,data.recovery.critterProgress);','VaultCritter.restore(critterCursor);')
assert mask(old)==mask(s),'Runtime changed outside Critter adapter/recovery fields'
def clean(s):
 for name in ['CRITTER STYLES','CRITTER SCREEN','CRITTER MODULE','VAULT RUNTIME']:s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 return s
assert clean(before('index.html').decode())==clean((root/'index.html').read_text())
marker=' select * into w from public.wallets where user_id=u for update;'
a=before('supabase_critter_v3.sql').decode();b=(root/'supabase_critter_v4.sql').read_text();assert a[a.index(marker):]==b[b.index(marker):],'Atomic wallet/stats/access/grants tail changed'
for ext in ['sql','txt']:assert (root/f'supabase_critter_v4.{ext}').read_bytes()==(root/f'supabase_critter.{ext}').read_bytes()
assert (root/'supabase_critter_v4.sql').read_bytes()==(root/'supabase_critter_v4.txt').read_bytes()
# Legacy3 is an exact freeze, not a regenerated approximation.
a=before('critter/model.js').decode().replace('const CRITTER_MODEL=','const CRITTER_MODEL_V3=',1).replace("require('./config.js'):CRITTER_CONFIG","require('./config-v3.js'):CRITTER_CONFIG_V3").replace('module.exports=CRITTER_MODEL;','module.exports=CRITTER_MODEL_V3;');assert a==(root/'critter/model-v3.js').read_text()
report={'baseline':base,'protectedFiles':len(protected),'checks':['All other games/assets/animation and Universal HUD byte-identical','Shared wallet, generic rounds and auth unchanged','Only owner-bound Critter progress added to recovery','Embedded source outside Critter/runtime byte-identical','SQL atomic wallet/statistics/access/grants unchanged; legacy3 exact freeze']}
(root/'reports/critter-v4-isolation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',report)
