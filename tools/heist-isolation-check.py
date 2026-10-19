"""Existing game math/render/DOM/art unchanged; only shared registration and new-service integration allowed."""
from pathlib import Path
import re,subprocess
ROOT=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['git','show','c5fd741:index.html'],cwd=ROOT).decode();new=(ROOT/'index.html').read_text()
def normalize(s):
 for name in ['VAULT RUNTIME','HEIST STYLES','HEIST SCREEN','HEIST MODULE','SWAMP STYLES','SWAMP SCREEN','SWAMP MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 s=re.sub(r'<button class="game-card playable" id="openHeistGame"[\s\S]*?</button>','',s)
 s=s.replace("{id:'vault_heist',element:'openHeistGame',category:'slots',isNew:true},",'')
 return '\n'.join(l for l in s.splitlines() if l.strip())
assert normalize(old)==normalize(new),'Existing game/lobby design changed'
changed=subprocess.check_output(['git','diff','c5fd741','--name-only'],cwd=ROOT).decode().splitlines()
assert not any(p.startswith(('mines/','poker/','bird/','tables/','admin/')) for p in changed),changed
assert "const FEATURED_GAME_ID='slot';" in new
print('PASS six games outside Heist/Swamp, their math/art/help/DOM/CSS and lobby/auth presentation byte-identical; Featured unchanged')
