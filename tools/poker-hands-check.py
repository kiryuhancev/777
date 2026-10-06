"""Browser checks for read-only poker guide and contextual gameplay controls."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
report={'checks':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(1280,900),(390,844),(320,640),(844,390)]:
  ctx=b.new_context(viewport={'width':width,'height':height},has_touch=width<500,is_mobile=width<500);ctx.set_offline(True)
  page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.set_content((ROOT/'index.html').read_text(),wait_until='load');page.locator('#openPokerGame').click()
  snapshot=lambda:page.evaluate('JSON.stringify({pokerState,balance:state.balance})')
  for phase in ['idle','draft','actions','finished']:
   if phase=='draft':page.locator('#pokerStartBtn').click()
   if phase=='actions':
    page.locator('#choice0').click();page.locator('#choice1').click()
   if phase=='finished':
    page.locator('#pokerStartBtn').click();page.locator('#pokerStartBtn').click();page.locator('#pokerStartBtn').click();page.wait_for_timeout(850)
   before=snapshot();page.locator('#pokerHandsBtn').click()
   assert page.locator('.poker-hand-row').count()==10
   assert page.evaluate("POKER_HAND_INFO.every(h=>evalFive(h.cards.map(text=>({rank:RANKS.find(r=>r[1]===text.slice(0,-1))[0],suit:text.slice(-1)}))).cat===h.cat)")
   assert page.evaluate("POKER_HAND_INFO.every(h=>el('pokerHandsList').querySelector('[data-hand='+h.id+'] .poker-hand-payout').textContent==='×'+POKER_PAYOUTS[h.cat])")
   assert page.locator('[data-hand=quads] .hand-primary').count()==4
   assert page.locator('[data-hand=quads] .hand-kicker').count()==1
   assert page.locator('[data-hand=full-house] .hand-primary').count()==3
   assert page.locator('[data-hand=full-house] .hand-secondary').count()==2
   assert page.evaluate("getComputedStyle(document.body).overflow==='hidden'")
   page.locator('[data-hand=full-house]').click()
   assert not page.locator('#hand-desc-full-house').evaluate('(e)=>e.hidden'),(width,phase,page.locator('.poker-hand-trigger[aria-expanded=true]').evaluate_all('(es)=>es.map(e=>e.dataset.hand)'))
   page.locator('[data-hand=quads]').click();assert page.locator('#hand-desc-full-house').evaluate('(e)=>e.hidden')
   assert not page.locator('#hand-desc-quads').evaluate('(e)=>e.hidden')
   assert page.evaluate("document.querySelector('.poker-hands-dialog').getBoundingClientRect().right<=innerWidth && document.querySelector('.poker-hands-dialog').getBoundingClientRect().bottom<=innerHeight")
   assert page.evaluate("document.querySelector('.poker-hands-scroll').scrollWidth<=document.querySelector('.poker-hands-scroll').clientWidth")
   if phase=='idle':
    page.locator('#pokerHandsClose').focus();page.keyboard.press('Shift+Tab');assert page.locator('[data-hand=high]').evaluate('(e)=>e===document.activeElement')
    page.keyboard.press('Tab');assert page.locator('#pokerHandsClose').evaluate('(e)=>e===document.activeElement')
    page.keyboard.press('Tab');assert page.locator('[data-hand=royal]').evaluate('(e)=>e===document.activeElement')
    page.keyboard.press('Space');page.keyboard.press('Enter')
   page.keyboard.press('Escape');assert page.locator('#pokerHandsModal').is_hidden();assert snapshot()==before
   assert page.locator('#pokerHandsBtn').evaluate('(e)=>e===document.activeElement')
  assert page.evaluate("pokerState.resolved && pokerState.community.length===5")
  page.locator('#pokerHandsBtn').click();page.locator('.poker-hands-scroll').evaluate('(e)=>e.scrollTop=0')
  out=ROOT.parent/'output';out.mkdir(exist_ok=True)
  page.screenshot(path=str(out/f'poker-hands-{width}.png'))
  page.locator('#pokerHandsClose').click()
  page.locator('#pokerStartBtn').click();page.locator('#choice0').click();page.locator('#choice0').click()
  assert page.locator('.poker-actions button:visible').count()==2
  page.locator('#tacticalBtn').click();assert page.locator('#peekHidden').is_visible();page.locator('#replaceOwn1').click()
  assert page.evaluate('pokerState.tacticalUsed')
  page.locator('#pokerFoldBtn').click();assert page.evaluate("pokerState.winner==='fold' && pokerState.resolved")
  report['checks'].append(f'{width}×{height}: 4 phases, guide state isolation, payouts, card groups, scroll, keyboard, full deal, CHANGE, FOLD')
  ctx.close()
 b.close()
assert not report['errors'],report
(ROOT/'reports'/'poker-hands.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
