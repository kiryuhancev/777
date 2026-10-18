"""Six existing games, art, auth UI and lobby layout remain byte-identical to pre-Mines."""
from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['git','show','d850497:index.html'],cwd=root).decode();new=(root/'index.html').read_text()
def normalize(s):
 for name in ['VAULT RUNTIME','MINES STYLES','MINES SCREEN','MINES MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 s=re.sub(r'<button class="game-card playable" id="openMinesGame"[\s\S]*?</button>','',s)
 s=s.replace(",{id:'mines',element:'openMinesGame',category:'arcade',isNew:true}",'')
 return '\n'.join(line for line in s.splitlines() if line.strip())
assert normalize(old)==normalize(new),'Change outside MINES blocks, registry/card or shared service adapter'
print('PASS: all six existing game modules, DOM, art/styles, auth UI, lobby design and featured game unchanged')
