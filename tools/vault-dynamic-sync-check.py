"""Automatic wallet reconciliation and rapid Poker rounds with real SDK/isolated API."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
report={'mode':'Real SDK/API fixture, not live Supabase','passed':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context()
 ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));ctx.route('https://vault-test.supabase.co/**',cloud.route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML))
 pg=ctx.new_page();pg.on('pageerror',lambda e:report['errors'].append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')")
 def fold():
  pg.evaluate('openPokerGame()');pg.locator('#pokerStartBtn').click();pg.locator('#choice0').click();pg.locator('#choice1').click();pg.locator('#pokerFoldBtn').click()
 def sync():
  pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().conflict&&VaultStorage.inspect().data.queue.length===0',timeout=25000)
 cloud.offline=True
 for _ in range(3):fold()
 queue=pg.evaluate('VaultStorage.inspect().data.queue');delta=sum((-e['payload']['p_bet'] if e['type']=='begin' else e['payload']['p_payout'] if e['type']=='settle' else 0) for e in queue)
 cloud.rows[A]['wallets']['balance']=900;cloud.rows[A]['wallets']['revision']=4;cloud.offline=False;sync()
 assert cloud.rows[A]['wallets']['balance']==900+delta;assert pg.evaluate('state.balance')==900+delta
 assert cloud.stats[(A,'poker')]['rounds_played']==3
 assert pg.locator('#vaultConflictButton').is_hidden()
 report['passed'].append('Offline rounds rebase automatically onto a changed remote revision, with exact debits/payouts and no manual button')
 for _ in range(10):fold()
 sync();assert cloud.stats[(A,'poker')]['rounds_played']==13;assert pg.evaluate('state.balance')==cloud.rows[A]['wallets']['balance']
 report['passed'].append('Ten rapid consecutive Poker rounds synchronize without persistent conflict or duplicate stats')
 old=pg.evaluate('state.balance');assert pg.evaluate("(async()=>{const old=state.balance,pending=VaultProfileService.load();VaultWalletService.setLocalBalance(old-1);await pending;return state.balance===old-1;})()")
 pg.evaluate('(balance)=>VaultWalletService.setLocalBalance(balance)',old)
 report['passed'].append('A delayed profile read cannot overwrite a newer local wallet mutation')
 orphan='dddddddd-dddd-4ddd-8ddd-dddddddddddd';cloud.rounds[orphan]={'user_id':A,'p_game_id':'poker','p_bet':20,'status':'started','payout':0};cloud.rows[A]['wallets']['balance']-=20;cloud.rows[A]['wallets']['revision']+=1
 before=cloud.rows[A]['wallets']['balance'];pg.reload();pg.wait_for_function('VaultSession.ready');sync()
 assert cloud.rounds[orphan]['status']=='cancelled';assert cloud.rows[A]['wallets']['balance']==before;assert pg.evaluate("VaultRoundService.canPlay('poker')")
 report['passed'].append('An abandoned remote round recovers automatically after F5 without refund or payout')
 # A stale begin can fail during the live hand; reconciliation must wait for its stable end.
 cloud.rows[A]['wallets']['revision']+=2
 pg.locator('#pokerStartBtn').click();rid=pg.evaluate("VaultRoundService.get('poker').roundId");pg.evaluate('VaultSync.flush()');pg.wait_for_function('VaultStorage.inspect().conflict')
 assert pg.evaluate("VaultRoundService.get('poker').roundId")==rid and pg.evaluate('pokerState.phase')=='draft'
 pg.locator('#choice0').click();pg.locator('#choice1').click();pg.locator('#pokerFoldBtn').click();sync();assert cloud.rounds[rid]['status']=='settled'
 report['passed'].append('Revision conflict during draft never resets the live hand; recovery waits for its settlement')
 cloud.offline=True;fold();cloud.rows[A]['wallets']['balance']=0;cloud.rows[A]['wallets']['revision']+=1;cloud.offline=False;sync();assert pg.evaluate('state.balance')==0
 report['passed'].append('Insufficient remote funds reject unaccepted events without fabricating credits or keeping a permanent conflict')
 assert not report['errors'],report['errors'];b.close()
(ROOT/'reports/vault-dynamic-sync.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
