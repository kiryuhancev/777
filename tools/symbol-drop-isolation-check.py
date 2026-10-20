"""Presentation edits must not touch models, RNG, access, auth or money statements."""
from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parent.parent;base='cf40899'
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=root).decode().splitlines()
protected=[p for p in paths if p.startswith(('vault/','tables/','poker/','bird/','mines/')) or p.endswith(('/model.js','/config.js','/features-model.js')) or p.endswith(('.sql','.txt'))]
for path in protected:
 old=subprocess.check_output(['git','show',base+':'+path],cwd=root)
 assert (root/path).read_bytes()==old,path
pattern=r'(?:VaultWalletService|VaultRoundService|Vault\w+Bridge)\.(?:begin|finish|settleWithPayout|applyDelta|commit|holdPresentation|releasePresentation)\([^;]*'
for path in ['index.html','swamp/game.js','heist/game.js','magnet/game.js','critter/game.js']:
 old=subprocess.check_output(['git','show',base+':'+path],cwd=root).decode();new=(root/path).read_text()
 assert re.findall(pattern,old)==re.findall(pattern,new),path+' money statements changed'
old=subprocess.check_output(['git','show',base+':index.html'],cwd=root).decode();new=(root/'index.html').read_text()
start='const SLOT_MATH';end='// STATE ADAPTER'
assert old[old.index(start):old.index(end)]==new[new.index(start):new.index(end)],'Derby math changed'
print(f'PASS {len(protected)} protected source/config/schema files, full Derby math and every existing wallet/settlement/commit statement unchanged')
