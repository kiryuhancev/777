"""Prove the change is restricted to the Bird Siege JavaScript section."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parent.parent
BASE='07b826edd6b5a16c947e07b9d2c1993d653a2dbc'
old=subprocess.check_output(['git','show',f'{BASE}:index.html'],cwd=ROOT).decode()
new=(ROOT/'index.html').read_text()
start="const birdCanvas=el('birdCanvas');"
end="window.addEventListener('resize',resizeCell);"
old_before,old_rest=old.split(start,1);new_before,new_rest=new.split(start,1)
old_after=old_rest.split(end,1)[1];new_after=new_rest.split(end,1)[1]
assert old_before==new_before,'Change outside Bird Siege before its script'
assert old_after==new_after,'Change outside Bird Siege after its script'
report={'baselineCommit':BASE,'htmlSha256':hashlib.sha256(new.encode()).hexdigest(),
        'unchangedBeforeBirdSha256':hashlib.sha256(new_before.encode()).hexdigest(),
        'unchangedAfterBirdSha256':hashlib.sha256(new_after.encode()).hexdigest(),
        'checks':['all HTML/CSS/assets unchanged','Football Cascade and Poker Duel code unchanged',
                  'shared balance and lobby code unchanged','only Bird Siege script changed']}
(ROOT/'reports/bird-isolation.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: only the Bird Siege JavaScript section changed')
