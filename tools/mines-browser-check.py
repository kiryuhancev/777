"""Chromium + real embedded SDK with an HTTP contract fixture; no live accounts."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
passed=[];errors=[];console=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1);c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));return c
 def ready(pg):pg.wait_for_function('VaultSession.ready')
 def sync(pg):
  pg.evaluate('VaultSync.flush()')
  try:pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=12000)
  except:
   print(json.dumps({'state':pg.evaluate('VaultStorage.inspect()'),'calls':cloud.calls[-8:],'console':console},indent=2));raise
 def snap(pg):return pg.evaluate('VaultMines.inspect().round')
 def safe(pg):return pg.evaluate('()=>{const r=VaultMines.inspect().round;return Array.from({length:25},(_,i)=>i).find(i=>!r.minePositions.includes(i)&&!r.opened.includes(i))}')
 def tile(pg,i):pg.locator('.mines-tile').nth(i).click()
 def login(pg,email='alice@example.test'):
  pg.goto('http://127.0.0.1:8777/');ready(pg);pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',email);pg.evaluate('VaultMines.open()');pg.wait_for_function('VaultMines.inspect().ready');sync(pg)
 ctx=context();pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 pg.goto('http://127.0.0.1:8777/');ready(pg);assert not pg.locator('#minesApp').is_visible();assert pg.locator('#openMinesGame').count()==1
 pg.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");pg.evaluate("filterLobby('arcade')");assert pg.locator('#openMinesGame').is_visible();pg.locator('#openMinesGame').click();pg.wait_for_function('VaultMines.inspect().ready');sync(pg)
 assert pg.locator('.mines-tile').count()==25;assert pg.locator('#minesDebug').is_hidden();passed.append('Auth gate, ARCADE lobby card, same shell and accessible 25-cell board')
 pg.locator('#minesCountPlus').click();pg.locator('#minesBetPlus').click();pg.evaluate('saveVaultState()');sync(pg);pg.reload();ready(pg);pg.wait_for_function('VaultMines.inspect().ready');assert pg.evaluate('VaultMines.inspect().mineCount')==4;assert pg.evaluate('VaultMines.inspect().betIndex')==3
 passed.append('Mine count and common bet preferences survive F5')
 before=pg.evaluate('state.balance');pg.locator('#minesAction').click();r=snap(pg);assert len(r['minePositions'])==4;assert r['opened']==[];assert r['multiplier']==1;assert pg.evaluate('state.balance')==before-r['bet'];assert pg.locator('#minesAction').is_disabled();assert all(pg.locator('.mines-tile').nth(i).get_attribute('aria-label').startswith('Closed tile') for i in range(25));pg.evaluate('document.getElementById("minesAction").click()');assert pg.evaluate('state.balance')==before-r['bet'];sync(pg)
 passed.append('Fixed board at START, exact mine count, debit once, cashout disabled before safe pick; no position hints')
 i=safe(pg);tile(pg,i);r=snap(pg);assert r['opened']==[i];assert r['multiplier']>1;assert pg.evaluate('state.balance')==before-r['bet'];assert pg.locator('#minesAction').is_enabled();pg.evaluate('(i)=>document.querySelectorAll(".mines-tile")[i].click()',i);assert snap(pg)['opened']==[i];sync(pg)
 pg.reload();ready(pg);pg.wait_for_function('VaultMines.inspect().ready');restored=snap(pg);assert restored==r;assert pg.evaluate('state.balance')==before-r['bet'];assert pg.locator('.mines-tile.safe').count()==1
 passed.append('Safe pick grows multiplier without extra debit; repeated pick ignored; F5 restores exact board/picks and stake')
 # A new browser recovers the live business checkpoint, rather than cancelling an interactive round.
 other_ctx=context();other=other_ctx.new_page();login(other);assert snap(other)==r;assert other.evaluate('state.balance')==pg.evaluate('state.balance');other_ctx.close()
 passed.append('Second browser resumes the same active round, seed, mine positions and picks')
 pg.locator('#minesAction').click();done=snap(pg);assert done['status']=='CASHED_OUT';assert pg.evaluate('state.balance')==round(before-r['bet']+done['payout'],6);pg.evaluate('VaultRoundService.settleWithPayout("mines",9999,"duplicate",{})');assert pg.evaluate('state.balance')==round(before-r['bet']+done['payout'],6);assert pg.locator('.mines-tile.mine').count()==4;assert pg.locator('.mines-tile:enabled').count()==0;sync(pg);played=cloud.stats[(A,'mines')]['rounds_played'];assert played==1
 pg.reload();ready(pg);sync(pg);assert snap(pg)['status']=='CASHED_OUT';assert cloud.stats[(A,'mines')]['rounds_played']==played;assert pg.evaluate('state.balance')==cloud.rows[A]['wallets']['balance']
 passed.append('Cashout pays exactly once; all cells revealed/locked; reload cannot repeat payout or stats')
 pg.locator('#minesAction').click();r=snap(pg);before_bust=pg.evaluate('state.balance');tile(pg,r['minePositions'][0]);assert snap(pg)['status']=='BUST';assert pg.evaluate('state.balance')==before_bust;assert pg.locator('#minesMessage').inner_text()=='MINE HIT · ROUND LOST';sync(pg);pg.reload();ready(pg);assert snap(pg)['status']=='BUST';assert pg.evaluate('state.balance')==before_bust
 passed.append('Mine hit ends round, pays zero, reveals mines, remains bust after reload without refund')
 # Offline checkpoint and settle persist locally and retry with the same UUID.
 pg.wait_for_function('VaultMines.inspect().ready');pg.locator('#minesAction').click();sync(pg);cloud.offline=True;tile(pg,safe(pg));r=snap(pg);pg.reload();ready(pg);pg.wait_for_function('VaultMines.inspect().ready');assert snap(pg)==r;assert pg.evaluate('VaultStorage.inspect().data.queue.length')>0
 pg.locator('#minesAction').click();done=snap(pg);balance=pg.evaluate('state.balance');cloud.offline=False;sync(pg);assert cloud.rows[A]['wallets']['balance']==balance;pg.reload();ready(pg);sync(pg);assert pg.evaluate('state.balance')==balance
 passed.append('Offline safe pick, reload and cashout replay once after reconnect')
 # A stale branch must yield to the acknowledged board, not merge different pick orders.
 pg.wait_for_function('VaultMines.inspect().ready');pg.locator('#minesAction').click();sync(pg);ctx.route('https://vault-test.supabase.co/rest/v1/rpc/save_mines_checkpoint',lambda r:r.abort('internetdisconnected'));i=safe(pg);tile(pg,i)
 fork_ctx=context();fork=fork_ctx.new_page();login(fork);r=snap(fork);j=next(j for j in range(25) if j not in r['minePositions'] and j!=i);tile(fork,j);sync(fork)
 ctx.unroute('https://vault-test.supabase.co/rest/v1/rpc/save_mines_checkpoint');pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().conflict&&!VaultStorage.inspect().data.queue.length',timeout=20000);assert snap(pg)['opened']==[j];assert snap(pg)['minePositions']==r['minePositions'];assert pg.evaluate('state.balance')==fork.evaluate('state.balance')
 tile(fork,safe(fork));fork.locator('#minesAction').click();sync(fork)
 # Stale local payout cannot award again after the other device settled.
 pg.locator('#minesAction').click();sync(pg);assert pg.evaluate('state.balance')==cloud.rows[A]['wallets']['balance'];assert snap(pg)['status']=='CASHED_OUT';fork_ctx.close()
 passed.append('Two-device conflicting picks restore remote prefix; competing cashout cannot pay twice')
 pg.wait_for_function('VaultMines.inspect().ready');pg.locator('#minesAction').click();sync(pg)
 reload_ctx=context();remote=reload_ctx.new_page();login(remote);tile(remote,safe(remote));remote.locator('#minesAction').click();sync(remote)
 pg.reload();ready(pg);assert snap(pg)['status']=='CASHED_OUT';assert pg.evaluate('state.balance')==cloud.rows[A]['wallets']['balance'];reload_ctx.close()
 passed.append('F5 adopts another-device settlement without requiring a stale click or manual refresh of cloud data')
 # Every mine count is generated exactly; responsive cells remain usable and no hidden game content leaks.
 pg.wait_for_function('VaultMines.inspect().ready');pg.evaluate('VaultMines.restorePreferences({mines:2,minesCount:24})');pg.locator('#minesAction').click();assert len(snap(pg)['minePositions'])==24;tile(pg,safe(pg));assert snap(pg)['status']=='CASHED_OUT';assert snap(pg)['multiplier']==24.25;sync(pg)
 passed.append('24 mines: the only safe core automatically cashes out at 24.25x')
 pg.evaluate('VaultMines.restorePreferences({mines:2,minesCount:3})');pg.locator('#minesAction').click();tile(pg,safe(pg));tile(pg,safe(pg));sync(pg)
 for width,height in [(1440,1000),(1024,768),(768,1024),(390,844),(320,720)]:
  pg.set_viewport_size({'width':width,'height':height});pg.wait_for_timeout(50);assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert pg.locator('.mines-tile').first.bounding_box()['width']>=44,width
  if width in [1440,390]:pg.screenshot(path=str(ROOT/'previews'/f'mines-{width}.png'),full_page=True)
 assert pg.evaluate('()=>{const ids=[...document.querySelectorAll("[id]")].map(n=>n.id);return new Set(ids).size===ids.length}')
 passed.append('Five responsive widths, touch targets >=44px, no horizontal overflow or duplicate IDs')
 pg.locator('#minesAction').click();sync(pg)
 pg.evaluate('openLobby()');pg.evaluate('openPokerGame()');assert pg.evaluate('state.balance')==cloud.rows[A]['wallets']['balance'];pg.evaluate('openLobby()');pg.evaluate('VaultAuth.signOut()');pg.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");pg.evaluate('VaultMines.open()');pg.wait_for_function('VaultMines.inspect().ready');assert snap(pg) is None
 passed.append('Shared wallet across games; account switching never exposes another user board')
 ctx.close();cloud.mines_schema_ready=False;guard=context();g=guard.new_page();g.goto('http://127.0.0.1:8777/');ready(g);g.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");g.evaluate('VaultMines.open()');g.wait_for_timeout(150);before=g.evaluate('state.balance');assert g.locator('#minesAction').is_disabled();g.evaluate('document.getElementById("minesAction").click()');assert g.evaluate('state.balance')==before;guard.close();cloud.mines_schema_ready=True
 passed.append('Missing migration disables only MINES; no unsupported debit or outbox event')
 browser.close()
# Expected network/conflict errors belong to deliberate offline/competing-device tests.
unexpected=[x for x in console if not any(s in x for s in ['VAULT sync failed','VAULT remote load failed','Failed to load resource','ERR_INTERNET_DISCONNECTED','VAULT mines schema unavailable','VAULT reconnect pending','VAULT account load failed'])]
assert not errors,errors
assert not unexpected,unexpected
report={'mode':'Chromium + actual SDK with HTTP fixture, not live Supabase','passed':passed,'pageErrors':errors,'unexpectedConsoleErrors':unexpected}
(ROOT/'reports/mines-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
