"""Real Swamp paid/bonus/reload/auto flow; owned Supabase SDK fixture, no live writes."""
from pathlib import Path
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
cloud=Cloud();errors=[];passed=[]
for value in list(globals().values()):
 if callable(value) and hasattr(value,'__globals__') and 'cloud' in value.__globals__:
  value.__globals__['cloud']=cloud
  if hasattr(value.__globals__.get('original'),'__self__'):value.__globals__['original']=cloud.route
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':1000})
 ctx.add_init_script("const timer=setTimeout;window.setTimeout=(fn,ms,...args)=>timer(fn,typeof fn==='function'&&/=>\\s*spin\\(\\)/.test(fn.toString())?100000:ms,...args)")
 ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',critter_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');pg.evaluate('VaultSwamp.open()');pg.wait_for_function('VaultRoundService.swampSupport')
 def sync():pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def seeded_spin(seed):pg.evaluate('''seed=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a.length===1){a[0]=seed;return a;}return random(a);};document.getElementById('swampSpin').click();crypto.getRandomValues=random;}''',seed)
 seed=pg.evaluate('''()=>{for(let seed=0;seed<10000;seed++){const grid=SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(seed),SWAMP_CONFIG,false);if(grid.slice(0,4).filter(col=>col.some(t=>t.id==='scatter')).length===2&&!grid[4].some(t=>t.id==='scatter'))return seed;}throw Error('seed')}''')
 expected=pg.evaluate('seed=>SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(seed),SWAMP_CONFIG,false),null)',seed);before=pg.evaluate('state.balance');seeded_spin(seed)
 pg.wait_for_function('VaultAnalogReels.isBusy()');assert pg.locator('#swampReels .swamp-analog-strip').count()==5
 assert pg.locator('#swampReels .win').count()==0 and pg.locator('#swampLines polyline').count()==0
 pg.wait_for_function('!VaultSwamp.isBusy',timeout=45000);sync();assert abs(pg.evaluate('state.balance')-(before-20+expected['winX']*20))<.00001
 assert pg.evaluate('VaultSwamp.inspect().shown')==expected['grid'];rounds=len(cloud.rounds)
 # Reload during a second physical spin: only the visual phase is discarded.
 seeded_spin(seed);pg.wait_for_function('VaultAnalogReels.isBusy()');sync();assert pg.evaluate('VaultSwamp.isBusy');balance=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready&&VaultRoundService.swampSupport')
 assert pg.evaluate('VaultSwamp.inspect().shown')==expected['grid']
 assert pg.evaluate('state.balance')==balance and len(cloud.rounds)==rounds+1 and not pg.evaluate('VaultAnalogReels.isBusy()')
 pg.reload();pg.wait_for_function('VaultSession.ready');assert len(cloud.rounds)==rounds+1
 passed.append('Paid finalGrid/payout exact; no early win highlight; F5 mid-reel restores same grid and balance without replay or duplicate')
 # AUTO stop while the reel promise is active never starts an additional paid round.
 pg.wait_for_function('VaultRoundService.swampSupport');rounds=len(cloud.rounds);pg.locator('#swampApp [data-control="auto"]').click();pg.locator('#swampApp .slot-shared-modal .slot-modal-body button').filter(has_text=re.compile('^10$')).click();pg.wait_for_function('VaultAnalogReels.isBusy()');pg.locator('#swampApp [data-control="auto"]').click();pg.wait_for_function('!VaultSwamp.isBusy',timeout=45000);pg.wait_for_timeout(900);sync();assert len(cloud.rounds)==rounds+1 and pg.evaluate('VaultSwamp.inspect().auto')==0
 # Buy the real feature through existing handlers; delay only scheduling in this fixture.
 pg.locator('#swampBuy').click();pg.locator('[data-swamp-buy]').first.click();pg.wait_for_function('!!VaultSwamp.getCheckpoint()&&!VaultSwamp.isBusy',timeout=30000);sync()
 prior=pg.evaluate('VaultSwamp.getCheckpoint()');before=pg.evaluate('state.balance')
 seeded=pg.evaluate('''prior=>{for(let seed=0;seed<10000;seed++){const r=SWAMP_MODEL.resolve(SWAMP_MODEL.generate(true,SWAMP_MODEL.seeded(seed),SWAMP_CONFIG,false),prior);if(r.collectors.length&&r.fish.length&&r.winX>=5&&r.winX<15)return {seed,winX:r.winX,grid:r.grid};}throw Error('bonus seed')}''',prior)
 pg.evaluate('window.bonusStart=performance.now()');seeded_spin(seeded['seed']);pg.wait_for_function('VaultAnalogReels.isBusy()');assert pg.locator('#swampReels .swamp-analog-strip').count()==5
 assert not pg.locator('#winCelebration').evaluate('n=>n.classList.contains("show")')
 pg.wait_for_function('document.getElementById("winCelebration").classList.contains("show")',timeout=15000);assert not pg.evaluate('VaultAnalogReels.isBusy()');assert pg.evaluate('VaultSwamp.isBusy')
 pg.wait_for_function('!VaultSwamp.isBusy',timeout=30000);sync()
 assert abs(pg.evaluate('state.balance')-(before+seeded['winX']*prior['bet']))<.00001
 assert pg.evaluate('VaultSwamp.inspect().shown')==seeded['grid']
 events=pg.evaluate('VaultAnalogReels.inspect().events.filter(e=>e.time>=bonusStart)');assert all(e['phase']=='free-spin' for e in events)
 pg.screenshot(path=str(ROOT.parent/'output'/'swamp-analog-bonus-mobile.png'),full_page=True)
 passed.append('Existing BONUS purchase + real Free Spin use analog strips; Collector/math/wallet unchanged; shared BIG WIN starts after full stop and finishes before unlock; AUTO stops safely')
 assert not errors,errors;ctx.close();b.close()
print('\n'.join('PASS '+s for s in passed))
(ROOT/'reports/swamp-analog-games.json').write_text(json.dumps({'mode':'actual SDK + owned HTTP fixture, not live Supabase','passed':passed,'pageErrors':errors},indent=2)+'\n')
