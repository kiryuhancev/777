"""Embed the isolated VAULT layer; deployed index.html remains standalone."""
from pathlib import Path
import re
import base64
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'index.html';s=p.read_text()
for name,path,tag in [('VAULT STYLES','auth.css','style'),('VAULT CONFIG','config.js','script'),('VAULT AUTH UI','auth.html',None),('VAULT RUNTIME','runtime.js','script')]:
 text=(ROOT/'vault'/path).read_text().rstrip()
 if name=='VAULT STYLES':text=text.replace('__VAULT_STADIUM__','data:image/webp;base64,'+base64.b64encode((ROOT/'assets/derby-stadium.webp').read_bytes()).decode())
 mark='data:image/png;base64,'+base64.b64encode((ROOT/'assets/vault-mark.png').read_bytes()).decode()
 text=text.replace('__VAULT_MARK__',mark)
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif name in ['VAULT STYLES','VAULT CONFIG']:s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('</body>',block+'\n</body>',1)
# Poker presentation is isolated from business/auth code.
css=(ROOT/'poker/presentation.css').read_text().replace('__POKER_SCENE__','data:image/webp;base64,'+base64.b64encode((ROOT/'assets/poker-scene.webp').read_bytes()).decode())
block='<!-- BEGIN POKER PRESENTATION -->\n<style>\n'+css+'\n</style>\n<!-- END POKER PRESENTATION -->'
pattern=r'<!-- BEGIN POKER PRESENTATION -->[\s\S]*?<!-- END POKER PRESENTATION -->'
if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
else:s=s.replace('</head>',block+'\n</head>',1)
# Header lives outside the embedded auth block; replace the same shared mark there too.
bird='// BEGIN BIRD GAME V2\n'+'\n'.join((ROOT/'bird'/f).read_text().rstrip() for f in ['config.js','model.js','game.js'])+'\n// END BIRD GAME V2'
pattern=r'// BEGIN BIRD GAME V2[\s\S]*?// END BIRD GAME V2'
if re.search(pattern,s):s=re.sub(pattern,lambda _:bird,s)
else:
 start=s.index('const BIRD_DEBUG_PHYSICS=false;',s.index('// END BIRD RIGID BODY ENGINE'))
 end=s.index("window.addEventListener('resize',resizeCell);",start)
 s=s[:start]+bird+'\n\n'+s[end:]
css=(ROOT/'bird/presentation.css').read_text()
block='<!-- BEGIN BIRD PRESENTATION -->\n<style>\n'+css+'\n</style>\n<!-- END BIRD PRESENTATION -->'
pattern=r'<!-- BEGIN BIRD PRESENTATION -->[\s\S]*?<!-- END BIRD PRESENTATION -->'
if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
else:s=s.replace('</head>',block+'\n</head>',1)
s=re.sub(r'(<img class="vault-mark" data-vault-mark src=")[^"]*(")',lambda m:m[1]+mark+m[2],s)
p.write_text(s)
print('Embedded VAULT configuration, UI and data layer')
