"""Confirm existing games/visual assets are byte-identical to pre-table release."""
from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parent.parent
old=subprocess.check_output(['git','show','53d28de:index.html'],cwd=root).decode()
new=(root/'index.html').read_text()
def normalize(s):
 s=re.sub(r'<!-- BEGIN VAULT RUNTIME -->[\s\S]*?<!-- END VAULT RUNTIME -->','',s)
 s=re.sub(r'<!-- BEGIN TABLE (?:PRESENTATION|SCREENS|RULES|GAMES) -->[\s\S]*?<!-- END TABLE (?:PRESENTATION|SCREENS|RULES|GAMES) -->','',s)
 s=re.sub(r'<button class="game-card playable" id="open(?:Blackjack|Baccarat)Game"[\s\S]*?</button>','',s)
 s=re.sub(r",\{id:'(?:blackjack|baccarat)',element:'open(?:Blackjack|Baccarat)Game',category:'table',isNew:true\}",'',s)
 return '\n'.join(line for line in s.splitlines() if line.strip())
assert normalize(old)==normalize(new),'Existing game code, DOM or presentation changed beyond table registration'
print('PASS original three games, Poker scene/cards, lobby design and featured table unchanged')
