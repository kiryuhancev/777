"""Only the two shared HUD blocks may differ in the generated standalone source."""
import re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
baseline='ef1a03f'
old=subprocess.check_output(['git','show',baseline+':index.html'],cwd=root).decode()
new=(root/'index.html').read_text()
new=re.sub(r'<!-- BEGIN SLOT HUD (?:STYLES|MODULE) -->[\s\S]*?<!-- END SLOT HUD (?:STYLES|MODULE) -->\n?','',new)
assert new==old,'Existing embedded game/auth/wallet/table source changed'
protected=['vault','bird','poker','tables','swamp','heist','magnet','critter','mines']
changed=subprocess.check_output(['git','diff',baseline,'--',*protected],cwd=root).decode()
assert not changed,'Existing controllers/models/configs/art or services changed'
print('PASS full existing standalone source byte-identical after removing only shared HUD blocks; all game/controller/RNG/auth/wallet/table sources unchanged')
