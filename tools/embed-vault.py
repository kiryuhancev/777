"""Embed the isolated VAULT layer; deployed index.html remains standalone."""
from pathlib import Path
import re
import base64
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'index.html';s=p.read_text()
# A small independent guard precedes every game/SDK script.
boot='<!-- BEGIN VAULT BOOT GUARD -->\n<script>\n'+(ROOT/'vault/boot.js').read_text()+'\n</script>\n<!-- END VAULT BOOT GUARD -->'
pattern=r'<!-- BEGIN VAULT BOOT GUARD -->[\s\S]*?<!-- END VAULT BOOT GUARD -->'
if re.search(pattern,s):s=re.sub(pattern,lambda _:boot,s)
else:s=s.replace('<head>','<head>\n'+boot,1)
p.write_text(s)

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
bird='// BEGIN BIRD GAME V2\n'+'\n'.join((ROOT/'bird'/f).read_text().rstrip() for f in ['config.js','model.js','assets.js','game.js'])+'\n// END BIRD GAME V2'
bird=re.sub(r'__VB_ASSET_([^\s\'"<>]+)__',lambda m:'data:image/webp;base64,'+base64.b64encode((ROOT/'assets/breakers'/m[1]).read_bytes()).decode(),bird)
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
# Symbol entry is a shared presentation engine, loaded after game handlers and HUD.
for name,text,tag in [('SYMBOL DROP STYLES',(ROOT/'slot-animation/presentation.css').read_text()+'\n'+(ROOT/'slot-animation/analog.css').read_text(),'style'),('SYMBOL DROP MODULE','\n'.join((ROOT/'slot-animation'/f).read_text() for f in ['engine.js','analog.js','derby.js']),'script')]:
 block=f'<!-- BEGIN {name} -->\n<{tag}>\n{text}\n</{tag}>\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 else:s=s.replace('</head>' if tag=='style' else '</body>',block+('\n</head>' if tag=='style' else '\n</body>'),1)
p.write_text(s)
print('Embedded VAULT configuration, UI and data layer')
# Adjacent tables inherit the approved Poker materials and card components.
s=p.read_text()
shared=(ROOT/'poker/presentation.css').read_text().replace('#pokerApp','.vault-table').replace('body.poker-active #tacticalModal','body.table-active #unusedTacticalModal')
shared=shared.replace('__POKER_SCENE__','data:image/webp;base64,'+base64.b64encode((ROOT/'assets/poker-scene.webp').read_bytes()).decode())
for name,text,tag in [('TABLE PRESENTATION',shared+'\n'+(ROOT/'tables/presentation.css').read_text(),'style'),('TABLE SCREENS',(ROOT/'tables/screens.html').read_text(),None),('TABLE RULES',(ROOT/'tables/rules.js').read_text(),'script'),('TABLE GAMES',(ROOT/'tables/game.js').read_text(),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
p.write_text(s)

# Auth initializes with the page, including when the SDK CDN is unavailable.
s=p.read_text()
sdk=base64.b64encode((ROOT/'vendor/supabase-2.49.8.js').read_bytes()).decode()
# The unmodified Webpack UMD runtime requires currentScript.src. A data URL
# supplies it without a network request or a separate file beside the HTML.
block='<!-- BEGIN SUPABASE SDK -->\n<script src="data:application/javascript;base64,'+sdk+'"></script>\n<!-- END SUPABASE SDK -->'
pattern=r'<!-- BEGIN SUPABASE SDK -->[\s\S]*?<!-- END SUPABASE SDK -->'
if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
p.write_text(s)
# Swamp is an isolated sixth game; archive originals stay on disk as art sources.
s=p.read_text()
def swamp_assets(text):
 return re.sub(r'__SWAMP_([^\s\'"<>]+)__',lambda m:'data:image/webp;base64,'+base64.b64encode((ROOT/'assets/swamp'/m[1]).read_bytes()).decode(),text)
for name,text,tag in [('SWAMP STYLES',swamp_assets((ROOT/'swamp/presentation.css').read_text()),'style'),('SWAMP SCREEN',(ROOT/'swamp/screen.html').read_text(),None),('SWAMP MODULE',swamp_assets('\n'.join((ROOT/'swamp'/f).read_text() for f in ['config.js','model.js','assets.js','game.js'])),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
# The card reuses the regular lobby component and separate 16:9 art.
art='data:image/webp;base64,'+base64.b64encode((ROOT/'assets/swamp/lobby_card.webp').read_bytes()).decode()
s=re.sub(r'(<img id="swampLobbyArt")([^>]*)(>)',lambda m:m[1]+re.sub(r' src="[^"]*"','',m[2])+' src="'+art+'"'+m[3],s)
p.write_text(s)
# Mines shares only the VAULT service boundary and adds no framework/dependency.
s=p.read_text()
for name,text,tag in [('MINES STYLES',(ROOT/'mines/presentation.css').read_text(),'style'),('MINES SCREEN',(ROOT/'mines/screen.html').read_text(),None),('MINES MODULE','\n'.join((ROOT/'mines'/f).read_text() for f in ['config.js','model.js','game.js']),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
art='data:image/svg+xml;base64,'+base64.b64encode((ROOT/'assets/mines/lobby-card.svg').read_bytes()).decode()
s=re.sub(r'(<img id="minesLobbyArt")([^>]*)(>)',lambda m:m[1]+re.sub(r' src="[^"]*"','',m[2])+' src="'+art+'"'+m[3],s)
p.write_text(s)
# Admin tools are an optional, separately authorized panel; ordinary users retain the same header.
s=p.read_text()
for name,text,tag in [('ADMIN STYLES',(ROOT/'admin/presentation.css').read_text(),'style'),('ADMIN SCREEN',(ROOT/'admin/screen.html').read_text(),None),('ADMIN MODULE','\n'.join((ROOT/'admin'/f).read_text() for f in ['service.js','game.js']),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
p.write_text(s)
# VAULT HEIST isolated math, scene and controller; all files remain embedded for local use.
s=p.read_text()
def heist_assets(text):
 return re.sub(r'__HEIST_([^\s\x27"<>]+)__',lambda m:'data:image/webp;base64,'+base64.b64encode((ROOT/'assets/heist'/m[1]).read_bytes()).decode(),text)
for name,text,tag in [('HEIST STYLES',(ROOT/'heist/presentation.css').read_text(),'style'),('HEIST SCREEN',(ROOT/'heist/screen.html').read_text(),None),('HEIST MODULE',heist_assets('\n'.join((ROOT/'heist'/f).read_text() for f in ['config.js','model.js','assets.js','game.js'])),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
art='data:image/webp;base64,'+base64.b64encode((ROOT/'assets/heist/lobby-card.webp').read_bytes()).decode()
s=re.sub(r'(<img id="heistLobbyArt")([^>]*)(>)',lambda m:m[1]+re.sub(r' src="[^"]*"','',m[2])+' src="'+art+'"'+m[3],s)
p.write_text(s)

# MAGNET: independent 5x5 model, plan-driven presentation and owned wallet checkpoint.
s=p.read_text()
def magnet_assets(text):
 return re.sub(r'__MAGNET_([^\s\x27"<>]+)__',lambda m:'data:image/webp;base64,'+base64.b64encode((ROOT/'assets/magnet'/m[1]).read_bytes()).decode(),text)
for name,text,tag in [('MAGNET STYLES',(ROOT/'magnet/presentation.css').read_text(),'style'),('MAGNET SCREEN',(ROOT/'magnet/screen.html').read_text(),None),('MAGNET MODULE',magnet_assets('\n'.join((ROOT/'magnet'/f).read_text() for f in ['config.js','model.js','features-model.js','assets.js','game.js'])),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
if 'id="openMagnetGame"' not in s:
 card='<button class="game-card playable" id="openMagnetGame" data-category="slots" aria-label="Играть в MAGNET"><div class="art"><img id="magnetLobbyArt" alt="" loading="lazy"></div><span class="info"><strong>MAGNET</strong><small>Магнитное поле · Overdrive</small></span><span class="lobby-play" aria-hidden="true">PLAY</span></button>'
 s=s.replace('<button class="game-card playable" id="openHeistGame"',card+'<button class="game-card playable" id="openHeistGame"',1)
 if 'id="openMagnetGame"' not in s:raise RuntimeError('MAGNET lobby insertion point missing')
if "id:'magnet',element:'openMagnetGame'" not in s:
 s=s.replace("{id:'mines',element:'openMinesGame'","{id:'magnet',element:'openMagnetGame',category:'slots',isNew:true},{id:'mines',element:'openMinesGame'",1)
s=s.replace('<small>Магнитное поле · Overdrive</small>','<small>WHEEL · Magnet Chamber</small>')
art='data:image/webp;base64,'+base64.b64encode((ROOT/'assets/magnet/environment.webp').read_bytes()).decode()
s=re.sub(r'(<img id="magnetLobbyArt")([^>]*)(>)',lambda m:m[1]+re.sub(r' src="[^"]*"','',m[2])+' src="'+art+'"'+m[3],s)
p.write_text(s)

# Critter Chaos is isolated from all existing game modules.
s=p.read_text()
def critter_assets(text):
 return re.sub(r'__CRITTER_([^\s\x27"<>]+)__',lambda m:'data:image/webp;base64,'+base64.b64encode((ROOT/'assets/critter'/m[1]).read_bytes()).decode(),text)
for name,text,tag in [('CRITTER STYLES',(ROOT/'critter/presentation.css').read_text(),'style'),('CRITTER SCREEN',(ROOT/'critter/screen.html').read_text(),None),('CRITTER MODULE',critter_assets('\n'.join((ROOT/'critter'/f).read_text() for f in ['config-v1.js','model-v1.js','config.js','model.js','assets.js','game.js'])),'script')]:
 block=f'<!-- BEGIN {name} -->\n'+(f'<{tag}>\n{text}\n</{tag}>' if tag else text)+f'\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 elif tag=='style':s=s.replace('</head>',block+'\n</head>',1)
 else:s=s.replace('<!-- BEGIN VAULT RUNTIME -->',block+'\n<!-- BEGIN VAULT RUNTIME -->',1)
if 'id="openCritterGame"' not in s:
 card='<button class="game-card playable" id="openCritterGame" data-category="slots" aria-label="Играть в Critter Chaos"><div class="art"><img id="critterLobbyArt" alt="" loading="lazy"></div><span class="info"><strong>Critter Chaos</strong><small>Running Wild · Dumpster Dash</small></span><span class="lobby-play" aria-hidden="true">PLAY</span></button>'
 s=s.replace('<button class="game-card playable" id="openMagnetGame"',card+'<button class="game-card playable" id="openMagnetGame"',1)
 if 'id="openCritterGame"' not in s:raise RuntimeError('Critter lobby insertion point missing')
if "id:'critter',element:'openCritterGame'" not in s:
 s=s.replace("{id:'magnet',element:'openMagnetGame'","{id:'critter',element:'openCritterGame',category:'slots',isNew:true},{id:'magnet',element:'openMagnetGame'",1)
art='data:image/webp;base64,'+base64.b64encode((ROOT/'assets/critter/references/02_scene_alt.webp').read_bytes()).decode()
s=re.sub(r'(<img id="critterLobbyArt")([^>]*)(>)',lambda m:m[1]+re.sub(r' src="[^"]*"','',m[2])+' src="'+art+'"'+m[3],s)
# One presentation module adapts all five slot controllers after their handlers exist.
for name,path,tag in [('SLOT HUD STYLES','hud.css','style'),('SLOT HUD MODULE','hud.js','script')]:
 text=(ROOT/'slot-hud'/path).read_text()
 block=f'<!-- BEGIN {name} -->\n<{tag}>\n{text}\n</{tag}>\n<!-- END {name} -->'
 pattern=rf'<!-- BEGIN {name} -->[\s\S]*?<!-- END {name} -->'
 if re.search(pattern,s):s=re.sub(pattern,lambda _:block,s)
 else:s=s.replace('</head>' if tag=='style' else '</body>',block+('\n</head>' if tag=='style' else '\n</body>'),1)
p.write_text(s)
