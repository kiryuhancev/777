"""Only Swamp, its service integration and isolated admin panel may change in this update."""
from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['git','show','f239a0d:index.html'],cwd=root).decode();new=(root/'index.html').read_text()
def normalize(s):
 for name in ['VAULT RUNTIME','SWAMP STYLES','SWAMP SCREEN','SWAMP MODULE','ADMIN STYLES','ADMIN SCREEN','ADMIN MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 return '\n'.join(line for line in s.splitlines() if line.strip())
assert normalize(old)==normalize(new),'Another game, auth UI or shared lobby design was modified'
print('PASS: Digital Derby, Poker Blitz, Breakers, Blackjack, Baccarat, Mines, original assets, auth UI and lobby design unchanged')
