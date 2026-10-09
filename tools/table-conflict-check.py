"""New-game outbox replay against changed cloud wallet; SDK fixture, not live Supabase."""
from pathlib import Path
import json
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
passed=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for remote,expected in [(100,140),(30,10)]:
  cloud=Cloud();ctx=browser.new_context();ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(content_type='application/javascript',body=SDK));ctx.route('https://vault-test.supabase.co/**',cloud.route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");page.evaluate("VaultTables.open('blackjack')");page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length')
  cloud.offline=True
  page.evaluate("()=>{document.getElementById('blackjack-deal').click();VaultTables.states.blackjack.deck=[10,7,6,10,5].map(rank=>({rank,label:String(rank),suit:'♠',color:'black'}));}")
  page.wait_for_function("VaultTables.states.blackjack.phase==='PLAYER_TURN'");page.locator('#blackjack-double').click();page.wait_for_function("VaultTables.states.blackjack.phase==='RESULT'")
  cloud.rows[A]['wallets']['balance']=remote;cloud.rows[A]['wallets']['revision']+=1;cloud.offline=False
  page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().conflict&&!VaultStorage.inspect().data.queue.length',timeout=20000)
  assert page.evaluate('state.balance')==expected,(remote,page.evaluate('state.balance'))
  assert cloud.rows[A]['wallets']['balance']==expected
  assert cloud.stats[(A,'blackjack')]['rounds_played']==1
  passed.append('Funded offline DOUBLE rebases exact total stake/return once' if remote==100 else 'Insufficient remote DOUBLE cancels without fabricated payout or stuck sync')
  page.reload();page.wait_for_function('VaultSession.ready');assert page.evaluate('state.balance')==expected
  ctx.close()
 browser.close()
assert not errors,errors
report={'mode':'Supabase SDK contract fixture','passed':passed,'pageErrors':errors}
(ROOT/'reports/table-conflicts.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
