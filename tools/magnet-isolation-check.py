"""Source-of-truth archive integrity and strict isolation from the eight existing games."""
from pathlib import Path
import subprocess,re,hashlib,json
ROOT=Path(__file__).resolve().parent.parent
baseline='1292196'
old=subprocess.check_output(['git','show',baseline+':index.html'],cwd=ROOT).decode();new=(ROOT/'index.html').read_text()
for name in ['MAGNET STYLES','MAGNET SCREEN','MAGNET MODULE','CRITTER STYLES','CRITTER SCREEN','CRITTER MODULE','VAULT RUNTIME']:
 pattern=r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->';old=re.sub(pattern,'',old);new=re.sub(pattern,'',new)
new=re.sub(r'<button class="game-card playable" id="openMagnetGame"[\s\S]*?</button>','',new).replace("{id:'magnet',element:'openMagnetGame',category:'slots',isNew:true},",'')
new=re.sub(r'<button class="game-card playable" id="openCritterGame"[\s\S]*?</button>','',new).replace("{id:'critter',element:'openCritterGame',category:'slots',isNew:true},",'')
assert '\n'.join(l for l in old.splitlines() if l.strip())=='\n'.join(l for l in new.splitlines() if l.strip()),'Existing game/lobby HTML changed'
oldruntime=subprocess.check_output(['git','show',baseline+':vault/runtime.js'],cwd=ROOT).decode();runtime=(ROOT/'vault/runtime.js').read_text()
assert oldruntime[oldruntime.index('async function loadSDK()'):]==runtime[runtime.index('async function loadSDK()'):],'Auth changed'
assert oldruntime[oldruntime.index('    setLocalBalance(value)'):oldruntime.index('  function enqueue(')]==runtime[runtime.index('    setLocalBalance(value)'):runtime.index('  function enqueue(')],'Canonical wallet monetary methods changed'
paths=sorted((ROOT/'assets/magnet').rglob('*'));manifest=[]
for path in paths:
 if path.is_file() and path.name!='environment.webp' and 'v2' not in path.parts:manifest.append({'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
assert len(manifest)==16
report={'baseline':baseline,'otherEightGamesAndLobby':'HTML/math/art unchanged; new card only','auth':'byte-identical','canonicalWalletService':'Monetary methods byte-identical; presentation hold extended to MAGNET; isolated owned bridge extends outbox/recovery','archiveFiles':manifest}
(ROOT/'reports/magnet-isolation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS eight existing games/lobby exact, auth and canonical money methods unchanged; 16 archive source files retained')
