"""Embed the isolated VAULT layer; deployed index.html remains standalone."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'index.html';s=p.read_text()
for name,path,tag in [('VAULT STYLES','auth.css','style'),('VAULT CONFIG','config.js','script'),('VAULT AUTH UI','auth.html',None),('VAULT RUNTIME','runtime.js','script')]:
 text=(ROOT/'vault'/path).read_text().rstrip()
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif name in ['VAULT STYLES','VAULT CONFIG']:s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('</body>',block+'\n</body>',1)
p.write_text(s)
print('Embedded VAULT configuration, UI and data layer')
