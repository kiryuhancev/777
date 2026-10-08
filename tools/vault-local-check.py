"""Real browser reload/recovery tests. Serve this repo on VAULT_TEST_URL first."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
URL=os.environ.get('VAULT_TEST_URL','http://127.0.0.1:8777/')
report={'passed':[],'pageErrors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000});page=ctx.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
 def ready():page.wait_for_function('window.VaultSession?.ready')
 def reload():page.reload();ready()
 page.goto(URL);ready()
 assert page.evaluate('VaultSession.mode')=='guest'
 assert page.evaluate("(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;})()")
 page.locator('#openMainGame').click();page.locator('#betPlus').click();page.evaluate("toggleSetting('sound');toggleSetting('fastGame');saveVaultState()")
 page.locator('#backLobby').click();page.locator('#openPokerGame').click();page.locator('#pokerBetPlus').click();page.locator('#pokerStartBtn').click();page.locator('#choice0').click();page.locator('#choice1').click();page.locator('#pokerFoldBtn').click()
 balance=page.evaluate('state.balance');assert balance<1000000
 reload();assert page.evaluate('state.balance')==balance;assert page.evaluate('state.betIndex')==3;assert page.evaluate('pokerState.betIndex')==3;assert page.evaluate('!state.sound&&state.fastGame&&currentGame==="poker"')
 report['passed'].append('Critical F5: shared balance, bets, settings, last screen survive a real reload')
 count=page.evaluate('VaultStorage.inspect().data.rounds.length');reload();assert page.evaluate('VaultStorage.inspect().data.rounds.length')==count;assert page.evaluate('state.balance')==balance
 report['passed'].append('Settled round/payout/statistics not replayed on repeated reload')
 page.locator('#pokerStartBtn').click();before=page.evaluate('state.balance');roundid=page.evaluate('VaultRoundService.get("poker").roundId')
 snapshot=page.evaluate("JSON.parse(localStorage.getItem('vault:v1:guest')).data");shadow=ctx.new_page();shadow.goto(URL);shadow.wait_for_function('VaultSession.ready');assert shadow.evaluate('VaultStorage.inspect().locked');assert snapshot==page.evaluate("JSON.parse(localStorage.getItem('vault:v1:guest')).data");shadow.close()
 report['passed'].append('Read-only second tab does not cancel or overwrite a live round in the first tab')
 reload()
 assert page.evaluate('state.balance')==before;assert page.evaluate('pokerState.phase')=='idle'
 assert page.evaluate('id=>VaultStorage.inspect().data.rounds.filter(r=>r.roundId===id&&r.status==="cancelled").length',roundid)==1
 reload();assert page.evaluate('state.balance')==before
 report['passed'].append('Interrupted Poker draft: no refund, no second debit, no tactical/draft replay')
 page.locator('#backLobbyPoker').click();page.locator('#openBirdGame').click();page.locator('#birdStartBtn').click()
 page.evaluate('damagePig(birdState.pigs[0],birdState.pigs[0].hp)');bird_balance=page.evaluate('state.balance');bird_id=page.evaluate('VaultRoundService.get("bird").roundId');reload()
 assert page.evaluate('state.balance')==bird_balance;assert page.evaluate('!birdState.active&&birdState.world===null&&birdState.birds.length===0')
 assert page.evaluate('id=>VaultStorage.inspect().data.rounds.find(r=>r.roundId===id).payout>0',bird_id)
 report['passed'].append('Bird interrupted after a pig payout: paid progress retained; physics reset; no replay')
 page.locator('#backLobbyBird').click();page.locator('#openMainGame').click();page.evaluate("()=>{state.fastGame=false;state.sound=false;spin();}")
 page.wait_for_function('state.busy&&VaultRoundService.get("slot")');slot_balance=page.evaluate('state.balance');reload();assert page.evaluate('state.balance')==slot_balance;assert page.evaluate('!state.busy&&!state.bonusAutoRunning')
 report['passed'].append('Interrupted paid slot animation: exact debit retained, active cascade discarded')
 # Fixture starts a stable bonus without running its intro or timer.
 page.evaluate("()=>{const m=SLOT_MATH.newBonus('super',rand);state.bonus=true;state.bonusType='super';state.slotProfile='super';writeSlotModel(m);VaultRecovery.checkpointSlot();state.fastBonus=false;spin();}")
 page.wait_for_function('state.busy');remaining=page.evaluate('state.freeSpins');bonus_balance=page.evaluate('state.balance');reload()
 assert page.evaluate('state.freeSpins')==remaining;assert page.evaluate('state.bonus&&!state.busy&&!state.bonusAutoRunning');assert page.evaluate('state.balance')==bonus_balance
 report['passed'].append('Interrupted free spin is consumed; remaining bonus and safe checkpoint restored, autoplay paused')
 # Clear the test bonus; exercise a purchased entitlement interrupted before the intro.
 page.evaluate('state.bonus=false;state.freeSpins=0;VaultRecovery.checkpointSlot()');page.evaluate("()=>{buyBonusFeature('normal');}")
 page.wait_for_function('state.busy');purchase_balance=page.evaluate('state.balance');reload();assert page.evaluate('state.balance')==purchase_balance;assert page.evaluate("state.bonus&&state.bonusType==='normal'&&state.freeSpins===8")
 report['passed'].append('Interrupted bonus purchase retains its paid bonus entitlement without another charge')
 page.evaluate('state.bonus=false;state.freeSpins=0;VaultRecovery.checkpointSlot();openLobby();saveVaultState()')
 duplicate=ctx.new_page();duplicate.goto(URL);duplicate.wait_for_function('VaultSession.ready');assert duplicate.evaluate('VaultStorage.inspect().locked');assert not duplicate.evaluate('VaultRoundService.canPlay("poker")');duplicate.close()
 report['passed'].append('Second tab cannot spend the same local wallet concurrently')
 ctx.set_offline(True);page.locator('#openPokerGame').click();page.locator('#pokerStartBtn').click();assert page.evaluate('pokerState.phase')=='draft';ctx.set_offline(False)
 report['passed'].append('Guest gameplay remains available offline')
 ctx.close()
 # Corrupt snapshots and unavailable storage never crash initialization.
 ctx=b.new_context();page=ctx.new_page();page.goto(URL);ready();page.evaluate("localStorage.setItem('vault:v1:guest','{broken');")
 reload();assert page.evaluate('state.balance')==1000000
 page.evaluate("localStorage.setItem('vault:v1:guest',JSON.stringify({version:1,data:{balance:-50,bets:{slot:99}}}));")
 reload();assert page.evaluate('state.balance')==1000000
 report['passed'].append('Malformed JSON, negative wallet and invalid bets are rejected')
 page.set_viewport_size({'width':320,'height':640});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#vaultSignIn').click();assert page.locator('#vaultAuthDialog').is_visible();assert page.locator('#vaultAuthMessage').inner_text();page.keyboard.press('Escape')
 report['passed'].append('Small-screen auth form and unconfigured guest fallback')
 try:
  page.goto('file://'+str(ROOT/'index.html'));ready();assert page.evaluate('VaultSession.mode')=='guest'
  report['passed'].append('Standalone file:// guest startup works without SDK/network')
 except Exception as error:
  if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(error):raise
  report['notRun']=['file:// navigation is blocked by managed Chromium policy; check in a normal browser']
  page=ctx.new_page();page.set_content((ROOT/'index.html').read_text());ready();assert page.evaluate('VaultSession.mode')=='guest'
  report['passed'].append('Inline standalone guest startup degrades gracefully without origin storage')
 b.close()
assert not report['pageErrors'],report
(ROOT/'reports/vault-local.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
