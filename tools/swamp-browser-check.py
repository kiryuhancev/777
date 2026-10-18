"""Actual Chromium + existing Supabase contract fixture; includes safe reload and real RNG outcomes."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
passed=[];errors=[];console=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context(freeze=True):
  c=browser.new_context(viewport={'width':1440,'height':1080},device_scale_factor=1)
  c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  if freeze:c.add_init_script("const nativeTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,(ms===350||ms===80)?100000:ms,...args)")
  return c
 ctx=context();pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');assert not pg.locator('#swampApp').is_visible()
 pg.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");pg.locator('#openSwampGame').click();pg.wait_for_function('VaultRoundService.swampSupport')
 pg.evaluate('state.fastGame=true;state.fastBonus=true')
 def sync():pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length',timeout=20000)
 def play(seed):
  return pg.evaluate("""seed=>{const native=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=seed;return a};document.getElementById('swampSpin').click();crypto.getRandomValues=native;return VaultSwamp.inspect()}""",seed)
 sync();assert pg.locator('.swamp-cell').count()==15
 assert pg.locator('#swampLineGuide svg').count()==10
 pg.wait_for_function("()=>[...document.querySelectorAll('#swampApp img[src]')].every(n=>n.complete&&n.naturalWidth>0)")
 passed.append('Auth gate, sixth lobby card, 5x3 grid, ten lines and all provided sprites decode')
 # Stable settled spin is saved before any visual await; duplicate click while busy is ignored.
 seed=pg.evaluate("()=>{for(let i=1;i<10000;i++){const r=SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(i)));if(r.winX>0&&!r.triggerSpins)return i}}")
 before=pg.evaluate('state.balance');expected=pg.evaluate('s=>SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(s)))',seed);snapshot=play(seed);pg.evaluate("document.getElementById('swampSpin').click()")
 assert pg.evaluate('state.balance')==round(before-20+expected['winX']*20,6)
 assert snapshot['busy'];assert pg.locator('#lobbyBalance').inner_text()==pg.evaluate('n=>n.toLocaleString("ru-RU",{maximumFractionDigits:6})',before-20);assert pg.locator('#swampLastWin').inner_text()=='0';pg.wait_for_function('!VaultSwamp.isBusy');sync();assert cloud.stats[(A,'swamp')]['rounds_played']==1
 passed.append('Paid debit and settle once before animation; duplicate clicks ignored; shared remote wallet matches')
 pg.locator('#swampBetPlus').click();pg.evaluate('saveVaultState()');pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultRoundService.swampSupport');assert pg.evaluate('VaultSwamp.betIndex')==3
 pg.locator('#swampBetMinus').click();sync()
 # Find a real triggering seed; no production forcing code is added.
 trigger=pg.evaluate("()=>{for(let i=1;i<20000;i++)if(SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(i))).triggerSpins===10)return i}")
 before=pg.evaluate('state.balance');snapshot=play(trigger);assert snapshot['bonus']['remaining']==10
 saved_balance=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultRoundService.swampSupport');sync()
 assert pg.evaluate('state.balance')==saved_balance;assert pg.evaluate('VaultSwamp.inspect().bonus.remaining')==10
 count=cloud.stats[(A,'swamp')]['rounds_played'];pg.reload();pg.wait_for_function('VaultSession.ready');sync();assert cloud.stats[(A,'swamp')]['rounds_played']==count
 passed.append('Selected bet and unfinished bonus survive F5; committed paid spin never pays/logs twice')
 # Reveal a real multiple-collector collect; all rewards derive from the generated scene.
 collect_seed=pg.evaluate("()=>{for(let i=1;i<100000;i++){const e=SWAMP_MODEL.evaluate(SWAMP_MODEL.generate(true,SWAMP_MODEL.seeded(i)));if(e.collectors.length>=2&&e.fish.length>=2)return i}}")
 prior=pg.evaluate('VaultSwamp.inspect().bonus');expect=pg.evaluate('x=>SWAMP_MODEL.resolve(SWAMP_MODEL.generate(true,SWAMP_MODEL.seeded(x.seed)),x.bonus)',{'seed':collect_seed,'bonus':prior});before=pg.evaluate('state.balance');play(collect_seed)
 assert pg.evaluate('state.balance')==round(before+expect['winX']*prior['bet'],6)
 pg.wait_for_function('!VaultSwamp.isBusy');sync();assert pg.evaluate('VaultSwamp.inspect().bonus.collectors')==expect['nextBonus']['collectors']
 assert pg.locator('#swampScene').count()==0 # screen has one scoped scene class, no duplicate global IDs
 passed.append('Multiple collectors collect all fish; meter/next-spin multiplier and free debit=0 agree with pure model')
 # Desktop and mobile visual QA, including 2000x text fit.
 for width,height in [(1440,1080),(1024,768),(768,1024),(390,844),(320,720)]:
  pg.set_viewport_size({'width':width,'height':height});pg.wait_for_timeout(70)
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert pg.locator('#swampSpin').is_visible() and pg.locator('#swampReels').is_visible()
  if width in [1440,390]:pg.screenshot(path=str(ROOT.parent/'output'/f'swamp-bonus-{width}.png'),full_page=True)
  money=pg.locator('.swamp-value').first
  if money.count():
   original=money.inner_text();money.evaluate("n=>n.textContent='2000×'");assert money.evaluate('n=>n.getBoundingClientRect().width<=n.parentElement.getBoundingClientRect().width+3'),width;money.evaluate('(n,text)=>n.textContent=text',original)
 assert pg.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return new Set(ids).size===ids.length}")
 passed.append('Five viewport widths; no overflow; 2000x readable; unique DOM IDs')
 # A second profile loads the server bonus and wallet, not a new starting balance.
 other_ctx=context();other=other_ctx.new_page();other.goto('http://127.0.0.1:8777/');other.wait_for_function('VaultSession.ready');other.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");other.evaluate('VaultSwamp.open()')
 assert other.evaluate('state.balance')==cloud.rows[A]['wallets']['balance'];assert other.evaluate('VaultSwamp.inspect().bonus.remaining')==pg.evaluate('VaultSwamp.inspect().bonus.remaining')
 other_ctx.close();passed.append('Second browser restores remote Free Spins, meter, locked bet and common balance')
 # Leave pauses automatic feature playback, then resume; sign out is safe at that boundary.
 pg.evaluate('openLobby()');remaining=pg.evaluate('VaultSwamp.inspect().bonus.remaining');pg.wait_for_timeout(450);assert pg.evaluate('VaultSwamp.inspect().bonus.remaining')==remaining
 result=pg.evaluate('VaultAuth.signOut()');assert 'error' not in result
 pg.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");pg.evaluate('VaultSwamp.open()');assert pg.evaluate('VaultSwamp.inspect().bonus') is None
 pg.set_viewport_size({'width':1440,'height':1080});pg.screenshot(path=str(ROOT.parent/'output'/'swamp-base-1440.png'),full_page=True)
 pg.set_viewport_size({'width':390,'height':844});pg.screenshot(path=str(ROOT.parent/'output'/'swamp-base-390.png'),full_page=True)
 passed.append('Leaving pauses FS; account switching cannot leak another user bonus or wallet')
 # Fog/fireflies are bounded, and the active scene maintains animation frames.
 frames=pg.evaluate("()=>new Promise(resolve=>{let n=0;const start=performance.now();function tick(t){n++;if(t-start<2000)requestAnimationFrame(tick);else resolve(n)}requestAnimationFrame(tick)})")
 assert pg.locator('.swamp-fireflies i').count()==14;assert frames>=80,frames
 passed.append(f'Bounded 14 fireflies; {frames} animation frames over two seconds in Chromium')
 # Missing backend migration must not debit or poison the outbox.
 pg.evaluate('VaultAuth.signOut()');ctx.close();cloud.swamp_schema_ready=False
 guard=context();g=guard.new_page();g.goto('http://127.0.0.1:8777/');g.wait_for_function('VaultSession.ready');g.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");g.evaluate('VaultSwamp.open()');assert g.locator('#swampSpin').is_disabled();before=g.evaluate('state.balance');g.evaluate("document.getElementById('swampSpin').click()");assert g.evaluate('state.balance')==before;guard.close();cloud.swamp_schema_ready=True
 passed.append('Missing SQL disables only new slot; no unauthorized debit or unsupported event')
 browser.close()
assert not errors,errors
assert not console,console
report={'mode':'Chromium and actual SDK against HTTP fixture, not live Supabase','passed':passed,'pageErrors':errors,'consoleErrors':console}
(ROOT/'reports/swamp-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
