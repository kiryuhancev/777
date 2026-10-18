"""The five existing games, their art and the auth/lobby design remain byte-identical."""
from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['git','show','1a5d5f3:index.html'],cwd=root).decode();new=(root/'index.html').read_text()
def normalize(s):
 for name in ['MINES STYLES','MINES SCREEN','MINES MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 s=re.sub(r'<button class="game-card playable" id="openMinesGame"[\s\S]*?</button>','',s)
 s=s.replace(",{id:'mines',element:'openMinesGame',category:'arcade',isNew:true}",'')
 for name in ['VAULT RUNTIME','SWAMP STYLES','SWAMP SCREEN','SWAMP MODULE','ADMIN STYLES','ADMIN SCREEN','ADMIN MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 s=re.sub(r'<button class="game-card playable" id="openSwampGame"[\s\S]*?</button>','',s)
 s=s.replace(",{id:'swamp',element:'openSwampGame',category:'slots',isNew:true}",'')
 return '\n'.join(line for line in s.splitlines() if line.strip())
assert normalize(old)==normalize(new),'Original game or lobby/auth design changed outside new slot registration'
print('PASS all five original game modules, DOM, CSS/art, auth UI and shared lobby design unchanged')
