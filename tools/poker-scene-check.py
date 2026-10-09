"""Poker presentation QA with isolated Supabase fixture; Poker/slot scripts compared byte-for-byte; Bird has its own QA."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');namespace={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),namespace)
globals().update({k:v for k,v in namespace.items() if not k.startswith('__')})
import subprocess,re
before=subprocess.check_output(['git','show','e531074:index.html'],cwd=ROOT,text=True)
current=(ROOT/'index.html').read_text()
def game_scripts(html):
 html=re.sub(r'const BONUS_TYPES=\[[\s\S]*?(?=// BIRD RIGID BODY ENGINE)','',html)
 html=re.sub(r'<!-- BEGIN VAULT RUNTIME -->[\s\S]*?<!-- END VAULT RUNTIME -->','',html)
 if '// BEGIN BIRD GAME V2' in html:html=re.sub(r'// BEGIN BIRD GAME V2[\s\S]*?// END BIRD GAME V2','',html)
 else:
  a=html.index('const BIRD_DEBUG_PHYSICS=false;',html.index('// END BIRD RIGID BODY ENGINE'));b=html.index("window.addEventListener('resize',resizeCell);",a);html=html[:a]+html[b:]
 return [re.sub(r'\n\s*\n','\n',s) for s in re.findall(r'<script[^>]*>([\s\S]*?)</script>',html)]
assert game_scripts(before)==game_scripts(current),'Poker/slot scripts changed'
assert re.search(r'<style>([\s\S]*?)</style>',before)[1]==re.search(r'<style>([\s\S]*?)</style>',current)[1]
for marker,end in [('<section class="lobby"','<div class="app">'),('<div class="app">','<div class="poker-app"')]:
 assert before.split(marker,1)[1].split(end,1)[0]==current.split(marker,1)[1].split(end,1)[0],marker
report={'viewports':[],'errors':[],'pokerAndSlotScriptsIdentical':True,'otherGameMarkupIdentical':True}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(1920,1080),(1440,900),(1366,768),(390,844),(360,800),(320,640),(844,390)]:
  c=b.new_context(viewport={'width':width,'height':height});c.route('https://**',lambda r:r.abort());c.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML))
  pg=c.new_page();pg.on('pageerror',lambda e:report['errors'].append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");pg.evaluate('openPokerGame()')
  balance=pg.evaluate('state.balance');assert pg.locator('#pokerHandsBtn').is_visible()
  pg.locator('#pokerBetPlus').click();pg.locator('#pokerBetMinus').click();assert pg.evaluate('state.balance')==balance
  pg.locator('#pokerStartBtn').click();pg.locator('#choice0').focus();pg.keyboard.press('Enter');pg.locator('#choice1').click()
  assert pg.locator('#dealerCards .dealer-hidden').count()==1
  assert pg.locator('#dealerCards .playing-card').count()==1
  assert pg.locator('#playerCards .playing-card').count()==2
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  if width in [1440,390]:pg.screenshot(path=f'/workspace/output/poker-scene-{width}-actions.png',full_page=True)
  # Guide must be read-only and keep the existing highlights/payouts.
  snapshot=pg.evaluate('JSON.stringify({pokerState,balance:state.balance})');pg.locator('#pokerHandsBtn').click();assert pg.locator('.poker-hand-row').count()==10;pg.locator('[data-hand=full-house]').click();assert pg.locator('[data-hand=full-house] .hand-primary').count()==3;pg.keyboard.press('Escape');assert pg.evaluate('JSON.stringify({pokerState,balance:state.balance})')==snapshot
  pg.locator('#pokerStartBtn').click();assert pg.locator('#communityCards .playing-card').count()==3
  pg.locator('#pokerStartBtn').click();assert pg.locator('#communityCards .playing-card').count()==4
  pg.locator('#pokerStartBtn').click();pg.wait_for_function('pokerState.resolved',timeout=10000)
  assert pg.locator('#communityCards .playing-card').count()==5
  assert pg.locator('#dealerCards .dealer-hidden').count()==0
  assert pg.locator('#dealerCards .playing-card').count()==2
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
  bounds=pg.evaluate("()=>{const cards=document.getElementById('playerCards').getBoundingClientRect(),ctrl=document.querySelector('#pokerApp .poker-controls').getBoundingClientRect();return cards.bottom<=ctrl.top}");assert bounds,width
  if width in [1440,390]:pg.screenshot(path=f'/workspace/output/poker-scene-{width}-showdown.png',full_page=True)
  pg.locator('#pokerStartBtn').click();pg.locator('#choice0').click();pg.locator('#choice0').click();pg.locator('#pokerFoldBtn').click();assert pg.evaluate('pokerState.winner')=='fold'
  if width in [1440,390]:
   for action in ['replaceOwn1','replaceOwn2','replaceDealerOpen','peekHidden']:
    pg.locator('#pokerStartBtn').click();pg.locator('#choice0').click();pg.locator('#choice1').click();previous=pg.evaluate('state.balance')
    pg.locator('#tacticalBtn').click();pg.locator('#'+action).click();assert pg.evaluate('pokerState.tacticalUsed');assert pg.evaluate('state.balance')==previous
    if action=='peekHidden':
     assert pg.locator('#dealerCards .dealer-hidden').count()==0;pg.wait_for_function('pokerState.peekUntil===0');assert pg.locator('#dealerCards .dealer-hidden').count()==1
    else:assert pg.locator('#dealerCards .dealer-hidden').count()==1
    pg.locator('#pokerFoldBtn').click()
  pg.evaluate('VaultSync.flush()');pg.wait_for_function('VaultStorage.inspect().data.queue.length===0');saved=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready');assert pg.evaluate('state.balance')==saved
  # Decorative background failure must not make the controls disappear.
  pg.evaluate("openPokerGame();document.querySelector('#pokerApp .poker-scene').style.backgroundImage='none'");assert pg.locator('#pokerStartBtn').is_visible()
  report['viewports'].append([width,height]);c.close()
 assert not report['errors'],report['errors'];b.close()
(ROOT/'reports/poker-scene.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
