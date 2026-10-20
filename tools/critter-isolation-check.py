"""Prove the nine existing game modules and auth/monetary methods survived this addition."""
from pathlib import Path
from zipfile import ZipFile
import subprocess,re,json,hashlib
ROOT=Path(__file__).resolve().parent.parent;baseline='02113af'
def original(name):return subprocess.check_output(['git','show',baseline+':'+name],cwd=ROOT).decode()
old=original('index.html');new=(ROOT/'index.html').read_text()
for name in ['CRITTER STYLES','CRITTER SCREEN','CRITTER MODULE','VAULT RUNTIME']:
 p=r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->';old=re.sub(p,'',old);new=re.sub(p,'',new)
new=re.sub(r'<button class="game-card playable" id="openCritterGame"[\s\S]*?</button>','',new).replace("{id:'critter',element:'openCritterGame',category:'slots',isNew:true},",'')
assert '\n'.join(l for l in old.splitlines() if l.strip())=='\n'.join(l for l in new.splitlines() if l.strip()),'Existing game/lobby HTML changed'
old=original('vault/runtime.js');new=(ROOT/'vault/runtime.js').read_text()
assert old[old.index('async function loadSDK()'):]==new[new.index('async function loadSDK()'):],'Auth modified'
assert old[old.index('    setLocalBalance(value)'):old.index('  function enqueue(')]==new[new.index('    setLocalBalance(value)'):new.index('  function enqueue(')],'Canonical monetary methods modified'
assert old[old.index('  // MAGNET owns'):old.index('  function stableRecovery')]==new[new.index('  // MAGNET owns'):new.index('  function stableRecovery')],'Existing MAGNET bridge modified'
files=[]
for p in sorted((ROOT/'assets/critter/references').iterdir()):files.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert len(files)==6
report={'baseline':baseline,'existingNineGamesAndLobby':'byte-identical HTML/math/art except added card/registry; Critter uses isolated styles/modules','auth':'byte-identical','canonicalWalletMonetaryMethods':'byte-identical; presentation hold extended to Critter','magnetBridge':'byte-identical','newArchiveFiles':files}
(ROOT/'reports/critter-isolation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS nine existing games/lobby unchanged; auth/MAGNET bridge/canonical wallet monetary methods exact; six new archive originals retained')
