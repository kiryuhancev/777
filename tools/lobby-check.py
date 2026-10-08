"""Offline lobby filtering, navigation, responsive layout and game isolation."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
report={'viewports':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(1440,900),(1024,768),(768,1024),(390,844),(320,640),(844,390)]:
  ctx=b.new_context(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=w<700);ctx.set_offline(True)
  page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.set_content((ROOT/'index.html').read_text(),wait_until='load')
  assert page.locator('.game-card:visible').count()==3
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('#lobbyBalance').inner_text()==page.evaluate('fmt(state.balance)')
  for card in page.locator('.game-card').all():
   box=card.bounding_box();assert abs(box['width']/box['height']-16/9)<.02
  page.screenshot(path=str(ROOT.parent/'output'/f'lobby-{w}.png'),full_page=True)
  initial=page.evaluate('JSON.stringify({pokerState,balance:state.balance,board:state.board})')
  for category,id in [('slots','openMainGame'),('table','openPokerGame'),('arcade','openBirdGame'),('new',None),('all',None)]:
   page.locator(f'[data-filter={category}]').click()
   assert page.locator('.game-card:visible').count()==(3 if category=='all' else 0 if category=='new' else 1)
   assert page.locator(f'[data-filter={category}]').get_attribute('aria-pressed')=='true'
   if id:assert page.locator('#'+id).is_visible()
   if category=='new':assert page.locator('#lobbyEmpty').is_visible()
  assert initial==page.evaluate('JSON.stringify({pokerState,balance:state.balance,board:state.board})')
  for id,active,back in [('openMainGame','slot-active','backLobby'),('openPokerGame','poker-active','backLobbyPoker'),('openBirdGame','bird-active','backLobbyBird')]:
   page.locator('#'+id).focus();page.keyboard.press('Enter');assert page.evaluate(f"document.body.classList.contains('{active}')")
   assert page.locator('#lobby').is_hidden();page.locator('#'+back).click();assert page.locator('#lobby').is_visible()
  report['viewports'].append({'width':w,'height':h,'cards16x9':True,'noOverflow':True,'filters':True,'keyboardLaunchAllGames':True})
  ctx.close()
 b.close()
assert not report['errors'],report
(ROOT/'reports/lobby-layout.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
