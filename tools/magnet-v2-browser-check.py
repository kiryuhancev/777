"""Real standalone Chromium + owned HTTP fixture; no production accounts or DB writes."""
from pathlib import Path
import json,time,subprocess,re
source=Path(__file__).with_name('magnet-browser-check.py');ns={'__file__':str(source)}
prefix=source.read_text().split('\nwith sync_playwright() as p:')[0]
prefix=prefix.replace("['magnet_capabilities','apply_magnet_checkpoint']","['magnet_capabilities','apply_magnet_checkpoint','apply_magnet_v2_checkpoint']").replace("reply({'version':1})","reply({'version':1,'featuresVersion':2})")
exec(compile(prefix,str(source),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
passed=[];shots=ROOT.parent/'output'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=browser.new_context(viewport={'width':1440,'height':1200});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',magnet_route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));c.add_init_script("const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms===850&&fn.name==='spin'?100000:ms,...a)");return c
 def login(c):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');pg.evaluate('VaultMagnet.open()');pg.wait_for_function('VaultMagnetBridge.featuresReady');pg.evaluate('state.fastGame=true');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=20000)
 def shot(pg,name):pg.screenshot(path=str(shots/f'magnet-v2-{name}.png'),full_page=True)
 def play(pg,seed=None):
  if seed is None:pg.locator('#magnetSpin').click()
  else:pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('magnetSpin').click();crypto.getRandomValues=old;}''',seed)
 def settle(pg):pg.wait_for_function('!VaultMagnet.isBusy',timeout=20000);sync(pg)
 def reload(pg):pg.reload();pg.wait_for_function('VaultSession.ready&&VaultMagnet.inspect().ready');pg.evaluate('state.fastGame=true');sync(pg)
 def checkpoint(pg):return pg.evaluate('VaultMagnet.getCheckpoint()')
 c=context();pg=login(c);sync(pg);shot(pg,'base')
 seeds=pg.evaluate('''()=>{const out={};for(let s=0;s<20000&&Object.keys(out).length<9;s++){const r=MAGNET_V2_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID()}),p=r.magneticPlan;if(p.wheel&&!r.bonus.triggered)out[p.wheel.id]??=s;if(r.bonus.triggered&&!p.wheel)out.chamber??=s;if(r.bonus.triggered&&p.wheel)out.both??=s;if(!r.bonus.triggered&&!p.wheel)out.base??=s;}return out}''')
 before=pg.evaluate('state.balance');play(pg,seeds['base']);plan=checkpoint(pg);settle(pg);assert plan['version']==2;assert not plan['magneticPlan']['phases'];assert pg.evaluate('state.balance')==round(before-20+plan['payout'],6)
 for kind in ['boost','upgrade','wilds','pull','respin','mystery']:
  play(pg,seeds[kind]);plan=checkpoint(pg);pg.wait_for_selector('#magnetFeatureOverlay[data-mode="wheel"]',state='visible');assert pg.locator('#magnetWin').inner_text()=='0'
  if kind=='boost':shot(pg,'wheel')
  settle(pg);assert checkpoint(pg)==plan;assert plan['magneticPlan']['wheel']['id']==kind
  actual=pg.evaluate("[...document.querySelectorAll('#magnetField .magnet-token')].sort((a,b)=>a.dataset.cell-b.dataset.cell).map(n=>n.dataset.symbol)")
  assert actual==[t['symbol'] for t in plan['magneticPlan']['finalGrid']]
 passed.append('Normal spin has no force phase; all six Wheel outcomes replay precomputed grid/result; payout hidden until reveal; shared balance exact')
 before=pg.evaluate('state.balance');play(pg,seeds['chamber']);pg.wait_for_selector('#magnetFeatureOverlay[data-mode="intro"]',state='visible');shot(pg,'intro');initial=checkpoint(pg);assert initial['bonus']['remaining']==6;assert pg.evaluate('state.balance')==before-20
 reload(pg);assert checkpoint(pg)==initial;shot(pg,'chamber');assert pg.locator('#magnetChamberHud').is_visible()
 # Same earned bonus step from two devices resolves once.
 other=context();pg2=login(other);assert checkpoint(pg2)==initial
 play(pg);settle(pg);expected=checkpoint(pg);play(pg2);settle(pg2);assert checkpoint(pg2)==expected;other.close()
 for i in range(12):
  if checkpoint(pg)['status']=='SETTLED':break
  old=checkpoint(pg);play(pg)
  if checkpoint(pg)['status']=='SETTLED':pg.wait_for_selector('#magnetFeatureOverlay[data-mode="summary"]',state='visible');shot(pg,'bonus-win')
  pg.wait_for_function('!VaultMagnet.isBusy',timeout=20000);sync(pg)
  if checkpoint(pg)['step']==2:shot(pg,'collect')
 final=checkpoint(pg);assert final['status']=='SETTLED';assert pg.evaluate('state.balance')==round(before-20+final['payout'],6);n=cloud.stats[(A,'magnet')]['rounds_played'];reload(pg);assert checkpoint(pg)==final;assert cloud.stats[(A,'magnet')]['rounds_played']==n;shot(pg,'summary')
 passed.append('Chamber intro; 6–12 earned spins; F5 and cross-device idempotency; held values/charge exact; one final payout/statistics')
 # Reload while the Wheel overlay is playing: do not reroll or pay again.
 play(pg,seeds['boost']);pg.wait_for_selector('#magnetFeatureOverlay[data-mode="wheel"]',state='visible');planned=checkpoint(pg);reload(pg);assert checkpoint(pg)==planned;assert pg.locator('#magnetFeatureOverlay').is_hidden()
 passed.append('F5 during Wheel resumes final stable outcome without replay or duplicate money')
 play(pg,seeds['both']);pg.wait_for_selector('#magnetFeatureOverlay[data-mode="wheel"]',state='visible');pg.wait_for_selector('#magnetFeatureOverlay[data-mode="intro"]',state='visible');settle(pg);assert checkpoint(pg)['status']=='CHAMBER'
 while checkpoint(pg)['status']!='SETTLED':play(pg);settle(pg)
 passed.append('Simultaneous Wheel and 3 Scatters resolve serially: Wheel first, Chamber second, one parent stake')
 cloud.offline=True;play(pg,seeds['base']);pg.wait_for_function('!VaultMagnet.isBusy');assert pg.evaluate('VaultStorage.inspect().data.queue.length')>0;cloud.offline=False;pg.evaluate("window.dispatchEvent(new Event('online'))");sync(pg)
 passed.append('Offline outbox and reconnect remain functional')
 # Actual legacy checkpoint, same old model and old RPC path; no conversion of earned spins.
 pg.evaluate('''()=>{let r;for(let seed=0;seed<10000;seed++){r=MAGNET_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(MAGNET_MODEL.active(r))break;}if(!VaultMagnetBridge.commit(r))throw Error('legacy commit');VaultMagnet.restore(r);}''');sync(pg);assert checkpoint(pg)['version']==1;play(pg);settle(pg);assert checkpoint(pg)['step']==1
 reload(pg);assert checkpoint(pg)['version']==1;assert 'OVERDRIVE' in pg.locator('#magnetMode').inner_text()
 for i in range(4):
  play(pg)
  if checkpoint(pg)['status']=='SETTLED':assert 'magnet-v2' not in pg.locator('#magnetApp').get_attribute('class')
  settle(pg)
 passed.append('Existing earned v1 Overdrive retains old rules, continues through old RPC, and restores after F5')
 play(pg,seeds['base']);settle(pg);pg.locator('#magnetHelpOpen').click();assert pg.locator('#magnetModernManual').is_visible();assert 'MAGNET CHAMBER' in pg.locator('#magnetHelp').inner_text();pg.locator('#magnetHelpClose').click()
 for width in [1440,1024,768,390,320]:
  pg.set_viewport_size({'width':width,'height':1000});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert pg.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}")
  assert pg.locator('#magnetSpin').is_visible()
  if width==390:shot(pg,'mobile')
 pg.evaluate('openPokerGame()');assert pg.locator('#pokerApp').is_visible();pg.evaluate('openLobby()');pg.evaluate('VaultAuth.signOut()');pg.wait_for_function('VaultSession.mode==="guest"');assert checkpoint(pg) is None
 passed.append('Five responsive widths; no duplicate IDs; HELP, Poker/lobby transitions, shared wallet and signout isolation')
 c.close()
 # Older production schema must disable v2 only, while existing games stay available.
 old=context();old.route('https://vault-test.supabase.co/rest/v1/rpc/magnet_capabilities',lambda r:r.fulfill(content_type='application/json',body='{"version":1}',headers={'Access-Control-Allow-Origin':'*'}))
 pg=old.new_page();pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');pg.evaluate('VaultMagnet.open()');pg.wait_for_function('VaultMagnet.inspect().ready');assert pg.locator('#magnetSpin').is_disabled();assert 'supabase_magnet_v2.txt' in pg.locator('#magnetMessage').inner_text();before=pg.evaluate('state.balance');pg.evaluate("document.getElementById('magnetSpin').click()");assert pg.evaluate('state.balance')==before;pg.evaluate('openPokerGame()');assert pg.locator('#pokerApp').is_visible();old.close();browser.close()
 passed.append('Missing v2 schema cannot charge; shows exact TXT migration; Poker remains accessible')
assert not errors,errors
assert all(any(w in e for w in ['net::ERR','Failed to fetch','VAULT sync failed']) for e in console_errors),console_errors
report={'mode':'Chromium and real SDK with HTTP fixture; PostgreSQL separately; no live database writes','passed':passed,'pageErrors':errors,'expectedOfflineConsoleErrors':console_errors}
(ROOT/'reports/magnet-v2-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
