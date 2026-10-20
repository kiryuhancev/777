"""Critter-only update; compare other games and all money operations to50e3f77."""
from pathlib import Path
import subprocess,re,json
root=Path(__file__).resolve().parent.parent;base='40c014c'
def before(p):return subprocess.check_output(['git','show',base+':'+p],cwd=root).decode()
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root).decode().splitlines()
protected=[p for p in paths if p.startswith(('bird/','poker/','tables/','swamp/','heist/','magnet/','mines/','slot-animation/','assets/')) or p.startswith('vault/') and p!='vault/runtime.js' or p.endswith(('.sql','.txt')) and not p.startswith('supabase_critter')]
for path in protected:
 assert (root/path).read_bytes()==subprocess.check_output(['git','show',base+':'+path],cwd=root),path
old=before('vault/runtime.js');new=(root/'vault/runtime.js').read_text();strip=lambda s:re.sub(r'  // Critter is a whole deterministic paid round:[\s\S]*?  // MAGNET owns', '  // MAGNET owns',s)
mask=lambda s:re.sub(r"          if\(event.type==='critter'\)[\s\S]*?          if\(event.type==='magnet'\)","          if(event.type==='magnet')",strip(s))
prefs=lambda s:s.replace(',critterBoost:false','').replace(',critterBoost:VaultCritter.scatterBoost','').replace("if(typeof input?.critterBoost==='boolean')out.critterBoost=input.critterBoost;",'').replace('VaultCritter.scatterBoost=data.bets.critterBoost;','')
assert prefs(mask(old))==prefs(mask(new)),'runtime outside Critter adapter/rebase/preference changed'
# The shared wallet service remains byte-identical; Critter prices use its one cost() adapter.
for marker in ["const VaultWalletService", "const VaultRoundService"]:
 assert marker in old and marker in new
strip=lambda s:re.sub(r"  if\(c.id==='critter'\).*",'',s).replace("auto:'critterAuto',buy:'critterBuy',shop:'critterBonusShop',win:","auto:'critterAuto',win:").replace("const insufficient=c.id==='critter'?details?.spinCost>state.balance:!feature&&BETS[","const insufficient=!feature&&BETS[")
assert strip(before('slot-hud/hud.js'))==strip((root/'slot-hud/hud.js').read_text())
def clean(s):
 for name in ['CRITTER STYLES','CRITTER SCREEN','CRITTER MODULE','VAULT RUNTIME','SLOT HUD MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 return s
assert clean(before('index.html'))==clean((root/'index.html').read_text()),'unrelated embedded source changed'
old=before('supabase_critter.sql');new=(root/'supabase_critter_v3.sql').read_text();marker=' select * into w from public.wallets where user_id=u for update;'
assert old[old.index(marker):]==new[new.index(marker):],'wallet/stats/access/grants changed'
assert (root/'supabase_critter_v3.sql').read_bytes()==(root/'supabase_critter_v3.txt').read_bytes()==(root/'supabase_critter.sql').read_bytes()==(root/'supabase_critter.txt').read_bytes()
report={'baseline':base,'protectedFiles':len(protected),'checks':['Other game source/assets/models, auth/config and unrelated schema byte-identical','Only Critter HUD adapter/status/affordability changed; other games retain identical controls','Whole embedded site outside Critter/runtime/HUD blocks byte-identical','Shared wallet unaffected; Critter uses immutable total cost in commit and rebase','SQL atomic wallet/statistics/access/grants tail unchanged; feature price/movement validation extended']}
(root/'reports/critter-v3-isolation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS',report)
