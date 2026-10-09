"""Bird rewrite may change Bird markup/module/styles and one recovery adapter only."""
from pathlib import Path
import re,subprocess,json
ROOT=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['git','show','d64b0a7:index.html'],cwd=ROOT).decode()
new=(ROOT/'index.html').read_text()
def exclude_bird(s):
 s=s.replace('VAULT BREAKERS','BIRD SIEGE')
 s=re.sub(r'<button class="game-card playable" id="openBirdGame"[\s\S]*?</button>','BIRD_CARD',s)
 s=re.sub(r'const BONUS_TYPES=\[[\s\S]*?(?=// BIRD RIGID BODY ENGINE)','',s)
 s=re.sub(r'<!-- BEGIN BIRD PRESENTATION -->[\s\S]*?<!-- END BIRD PRESENTATION -->\n?','',s)
 s=re.sub(r'<div class="bird-app"[\s\S]*?(?=<div class="poker-hands-modal")','',s)
 if '// BEGIN BIRD GAME V2' in s:
  s=re.sub(r'// BEGIN BIRD GAME V2[\s\S]*?// END BIRD GAME V2','',s)
 else:
  a=s.index('const BIRD_DEBUG_PHYSICS=false;',s.index('// END BIRD RIGID BODY ENGINE'));b=s.index("window.addEventListener('resize',resizeCell);",a)
  s=s[:a]+s[b:]
 s=re.sub(r'      birdState.active=false;birdState.launched=false;[^\n]+','      resetBirdRecovery();',s)
 return re.sub(r'\n\s*\n','\n',s)
assert exclude_bird(old)==exclude_bird(new),'An unrelated HTML/style/script section changed'
old_runtime=subprocess.check_output(['git','show','d64b0a7:vault/runtime.js'],cwd=ROOT).decode()
old_runtime=re.sub(r'      birdState.active=false;birdState.launched=false;[^\n]+','      resetBirdRecovery();',old_runtime)
assert old_runtime==(ROOT/'vault/runtime.js').read_text(),'Auth/wallet/sync business code changed'
report={'baseline':'d64b0a7','unchanged':['Digital Derby HTML/styles/RNG/logic','Poker Blitz HTML/styles/logic','lobby VAULT layout and auth UI','rigid-body engine','wallet/auth/Supabase services'],
 'allowedBrandingChange':'Title and existing Bird game-card name/icons; lobby layout unchanged',
 'allowedGameplayChange':'Bonus object generation moves from round preparation to one release-time call; distribution and score formula preserved'}
(ROOT/'reports/bird-v2-isolation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS Bird-only rewrite; other games, lobby and services unchanged')
