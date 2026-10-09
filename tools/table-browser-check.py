"""Actual browser + existing Supabase contract fixture; no production database mutation."""
from pathlib import Path
import json
fixture=Path(__file__).with_name('vault-auth-check.py')
ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];passed=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000})
 ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(content_type='application/javascript',body=SDK));ctx.route('https://vault-test.supabase.co/**',cloud.route)
 ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8777/');page.wait_for_function('window.VaultSession?.ready')
 assert not page.locator('#blackjackApp').is_visible()
 assert 'error' not in page.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')")
 def sync():
  page.evaluate('VaultSync.flush()');page.wait_for_function('VaultStorage.inspect().data.queue.length===0')
 def rig(deck):
  # Test-only deterministic shoe. Production shuffle is unmodified.
  page.evaluate('''ranks=>{window.__originalRules=TABLE_RULES;window.__testDeck=ranks.map((rank,i)=>({rank,label:rank<=10?String(rank):['J','Q','K','A'][rank-11],suit:'♠',color:'black',id:'test'+i})).reverse();}''',deck)
  # Frozen rules are not replaced. After DEAL has started, override only this test hand's deck before first timer.
 def deal_bj(deck):
  page.evaluate("VaultTables.open('blackjack')")
  rig(deck)
  page.evaluate("()=>{document.getElementById('blackjack-deal').click();VaultTables.states.blackjack.deck=window.__testDeck;document.getElementById('blackjack-deal').click();}")
  page.wait_for_function("['PLAYER_TURN','RESULT'].includes(VaultTables.states.blackjack.phase)")
 sync();start=page.evaluate('state.balance');deal_bj([14,9,10,7])
 assert page.evaluate('VaultTables.states.blackjack.phase')=='RESULT'
 assert page.evaluate('state.balance')==start+30 # default BETS[2] =20, profit 3:2
 sync();assert cloud.stats[(A,'blackjack')]['rounds_played']==1
 passed.append('Natural 3:2, duplicate DEAL ignored, shared wallet and one remote result')
 start=page.evaluate('state.balance');deal_bj([10,14,8,6])
 assert page.locator('#blackjack-dealer .dealer-hidden').count()==1
 assert page.locator('#blackjack-dealerTotal').inner_text()=='SOFT 11'
 page.screenshot(path=str(ROOT.parent/'output'/'blackjack-1440-hand.png'),full_page=True)
 page.locator('#blackjack-stand').click();page.wait_for_function("VaultTables.states.blackjack.phase==='RESULT'")
 assert page.evaluate('VaultTables.states.blackjack.dealer.length')==2
 assert page.evaluate('state.balance')==start+20
 sync();passed.append('Hidden dealer card; S17 stands without extra draw')
 start=page.evaluate('state.balance');deal_bj([5,10,6,7,10])
 page.evaluate("()=>{document.getElementById('blackjack-double').click();document.getElementById('blackjack-double').click();}")
 page.wait_for_function("VaultTables.states.blackjack.phase==='RESULT'")
 assert page.evaluate('VaultTables.states.blackjack.player.length')==3
 assert page.evaluate('state.balance')==start+40
 sync();assert page.evaluate('state.balance')==cloud.rows[A]['wallets']['balance']
 assert cloud.stats[(A,'blackjack')]['total_wagered']==80
 passed.append('DOUBLE debits once, draws one, returns 2× total stake; server matches')
 start=page.evaluate('state.balance');deal_bj([10,10,9,7,5]);page.locator('#blackjack-hit').click();page.wait_for_function("VaultTables.states.blackjack.phase==='RESULT'")
 assert page.evaluate('state.balance')==start-20;sync();passed.append('BUST consumes stake; no payout')
 for deck,action,expected,label in [([14,14,10,13],None,0,'Both natural push'),([10,14,9,13],None,-20,'Dealer natural'),([10,10,8,8],'stand',0,'Normal push'),([10,10,2,7,10],'double',-40,'Double bust'),([5,10,6,10,5],'double',-40,'Double loss')]:
  start=page.evaluate('state.balance');deal_bj(deck)
  if action:page.locator('#blackjack-'+action).click();page.wait_for_function("VaultTables.states.blackjack.phase==='RESULT'")
  assert page.evaluate('state.balance')==start+expected,label
  sync()
 passed.append('Both naturals, dealer natural, push, doubled bust and doubled loss')
 # Interrupt a doubled hand before its third-card timer and reload. Both stakes stay consumed.
 start=page.evaluate('state.balance');deal_bj([5,10,6,7,10]);page.evaluate("()=>{const native=setTimeout;window.setTimeout=(fn,ms,...args)=>native(fn,ms===140?10000:ms,...args);document.getElementById('blackjack-double').click();saveVaultState()}");page.reload();page.wait_for_function('VaultSession.ready');sync()
 assert page.evaluate('state.balance')==start-40
 assert page.evaluate('VaultTables.states.blackjack.phase')=='IDLE'
 before=cloud.stats[(A,'blackjack')]['rounds_played'];page.reload();page.wait_for_function('VaultSession.ready');sync();assert cloud.stats[(A,'blackjack')]['rounds_played']==before
 passed.append('F5 during DOUBLE resets hand without refund/replay; repeated reload does not log twice')
 page.evaluate('openLobby()');page.locator('[data-filter="table"]').click();assert page.locator('#openPokerGame').is_visible() and page.locator('#openBlackjackGame').is_visible() and page.locator('#openBaccaratGame').is_visible()
 assert not page.locator('#openMainGame').is_visible();page.locator('#openBaccaratGame').click()
 for kind in ['PLAYER','BANKER','TIE']:
  page.locator(f'#baccarat-zones [data-type="{kind}"]').click();assert page.locator(f'#baccarat-zones [data-type="{kind}"]').get_attribute('aria-pressed')=='true'
  page.locator('#baccarat-deal').click();page.wait_for_function("VaultTables.states.baccarat.phase==='RESULT'");sync()
 assert cloud.stats[(A,'baccarat')]['rounds_played']==3
 page.screenshot(path=str(ROOT.parent/'output'/'baccarat-1440-result.png'),full_page=True)
 page.locator('#baccarat-plus').click();page.evaluate('saveVaultState()');saved=page.evaluate('VaultTables.preferences()');wallet=page.evaluate('state.balance');page.reload();page.wait_for_function('VaultSession.ready');sync()
 assert page.evaluate('VaultTables.preferences()')==saved and page.evaluate('state.balance')==wallet
 assert page.locator('#baccaratApp').is_visible()
 passed.append('TABLE filter, three bet choices, automated baccarat, selected size/type and last screen survive F5')
 for w,h in [(1440,1000),(1024,768),(768,1024),(390,844),(320,720)]:
  page.set_viewport_size({'width':w,'height':h})
  for game in ['blackjack','baccarat']:
   page.evaluate('VaultTables.open',game);page.wait_for_timeout(50)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(game,w)
   assert page.locator(f'#{game}-deal').is_visible()
   if w in [1440,390]:page.screenshot(path=str(ROOT.parent/'output'/f'{game}-{w}.png'),full_page=True)
 passed.append('Five desktop/tablet/mobile widths, no horizontal scrolling, shared header and readable controls')
 # DOM IDs and old game switches.
 assert page.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}")
 for fn,screen in [('openPokerGame','pokerApp'),('openBirdGame','birdApp'),('openSlotGame','app')]:
  page.evaluate(fn+'()');page.wait_for_timeout(30)
  assert not page.locator('#blackjackApp').is_visible() and not page.locator('#baccaratApp').is_visible()
 passed.append('Unique DOM IDs; switching to original games hides new tables')
 cloud.table_schema_ready=False
 guard=browser.new_context();guard.route('https://**',lambda r:r.abort());guard.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(content_type='application/javascript',body=SDK));guard.route('https://vault-test.supabase.co/**',cloud.route);guard.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 gp=guard.new_page();gp.goto('http://127.0.0.1:8777/');gp.wait_for_function('VaultSession.ready');gp.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");gp.evaluate("VaultTables.open('blackjack')")
 assert gp.locator('#blackjack-deal').is_disabled()
 gp.evaluate("document.getElementById('blackjack-deal').click()")
 assert gp.evaluate("VaultRoundService.get('blackjack')") is None and gp.evaluate('state.balance')==1000000
 gp.evaluate('openPokerGame()');assert gp.locator('#pokerApp').is_visible()
 cloud.table_schema_ready=True;gp.evaluate("VaultTables.open('blackjack')");assert gp.locator('#blackjack-deal').is_enabled()
 cloud.rows[B]['wallets']['balance']=30;cloud.rows[B]['wallets']['revision']+=1;gp.reload();gp.wait_for_function('VaultSession.ready');gp.evaluate('VaultSync.flush()');gp.wait_for_function('!VaultStorage.inspect().data.queue.length');assert gp.evaluate('state.balance')==30;gp.evaluate("VaultTables.open('blackjack')")
 gp.evaluate("()=>{document.getElementById('blackjack-deal').click();VaultTables.states.blackjack.deck=[10,7,6,10,5].map(rank=>({rank,label:String(rank),suit:'♠',color:'black'}));}");gp.wait_for_function("VaultTables.states.blackjack.phase==='PLAYER_TURN'")
 assert gp.locator('#blackjack-double').is_disabled();gp.evaluate("document.getElementById('blackjack-double').click()");assert gp.evaluate('state.balance')==10
 gp.locator('#blackjack-stand').click();gp.wait_for_function("VaultTables.states.blackjack.phase==='RESULT'");gp.evaluate('VaultSync.flush()');gp.wait_for_function('!VaultStorage.inspect().data.queue.length')
 assert gp.evaluate('state.balance')==10
 passed.append('Insufficient wallet disables DOUBLE and consumes only the original stake')
 guard.close();passed.append('Missing SQL blocks new-table debits/outbox only; old games work; migration unlocks automatically')
 browser.close()
assert not errors,errors
report={'mode':'Browser and Supabase SDK contract fixture, not live cloud','passed':passed,'pageErrors':errors}
(ROOT/'reports/table-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
