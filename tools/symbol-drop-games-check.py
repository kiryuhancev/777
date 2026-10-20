"""Every slot plays the exact seeded model result through the shared animation engine."""
from pathlib import Path
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
cloud=Cloud();errors=[];passed=[]
for value in list(globals().values()):
 if callable(value) and hasattr(value,'__globals__') and 'cloud' in value.__globals__:
  value.__globals__['cloud']=cloud
  if hasattr(value.__globals__.get('original'),'__self__'):value.__globals__['original']=cloud.route
games={'slot':('openSlotGame()','spinBtn','state.busy'),'swamp':('VaultSwamp.open()','swampSpin','VaultSwamp.isBusy'),'vault_heist':('VaultHeist.open()','heistSpin','VaultHeist.isBusy'),'magnet':('VaultMagnet.open()','magnetSpin','VaultMagnet.isBusy'),'critter':('VaultCritter.open()','critterSpin','VaultCritter.isBusy')}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1100});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',critter_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")')
 for game,(openfn,button,busy) in games.items():
  pg.evaluate(openfn);pg.wait_for_timeout(250)
  seed=pg.evaluate('''game=>{
   const bet=20,id='11111111-1111-4111-8111-111111111111';
   for(let seed=0;seed<10000;seed++){
    if(game==='slot'){const m=SLOT_MATH.newBoard(),rng=SLOT_MATH.seededRandom(seed);SLOT_MATH.generate(m,rng);const r=SLOT_MATH.settle(m,rng);if(r.totalX>0&&[...m.grid].filter(t=>t===SLOT_MATH.names.indexOf('scatter')).length<3)return {seed,payout:r.totalX*bet};}
    if(game==='swamp'){const r=SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(seed),SWAMP_CONFIG,false),null);if(!r.triggerSpins&&r.winX>0)return {seed,payout:r.winX*bet};}
    if(game==='vault_heist'){const r=VAULT_HEIST_MODEL.start({seed,bet,roundId:id});if(r.status==='SETTLED'&&r.payout>0)return {seed,payout:r.payout};}
    if(game==='magnet'){const r=MAGNET_V2_MODEL.start({seed,bet,roundId:id});if(r.status==='SETTLED'&&!r.magneticPlan.wheel&&r.payout>0)return {seed,payout:r.payout};}
    if(game==='critter'){const r=CRITTER_MODEL.start({seed,bet,roundId:id});if(!r.bonus&&r.base.steps.some(s=>s.gravityGrid))return {seed,payout:r.payout};}
   }throw Error('No fixture seed');
  }''',game)
  before=pg.evaluate('state.balance');prior=len(cloud.rounds)
  pg.evaluate('''x=>{window.dropStart=performance.now();window.originalRandom=SLOT_MATH.liveRandom;if(x.game==='slot')SLOT_MATH.liveRandom=SLOT_MATH.seededRandom(x.seed);const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a.length===1){a[0]=x.seed;return a;}return old(a);};document.getElementById(x.button).click();document.getElementById(x.button).click();crypto.getRandomValues=old;}''',{'game':game,'button':button,'seed':seed['seed']})
  assert pg.evaluate(busy),game
  assert pg.locator('#'+button).is_disabled(),game
  pg.wait_for_function('!('+busy+')',timeout=60000)
  pg.evaluate('SLOT_MATH.liveRandom=originalRandom;VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
  actual=pg.evaluate('state.balance');assert abs(actual-(before-20+seed['payout']))<.00001,(game,before,actual,seed)
  assert len(cloud.rounds)==prior+1,(game,cloud.rounds)
  events=pg.evaluate('VaultSymbolDrop.inspect().events.filter(e=>e.time>=dropStart)');assert any(e['hook']=='onGridSettled' and e['game']==game for e in events),game
  if game=='critter':assert any(e['phase']=='cascade' for e in events)
  assert not pg.evaluate('VaultSymbolDrop.isBusy('+json.dumps(game)+')'),game
  assert pg.locator('[data-slot-landing]').count()==0
  if game=='critter':assert pg.evaluate("[...document.querySelectorAll('#critterGrid .critter-cell')].map(n=>({uid:+n.dataset.uid,symbol:n.dataset.symbol}))")==pg.evaluate('VaultCritter.getCheckpoint().base.finalGrid')
  pg.screenshot(path=str(ROOT.parent/'output'/f'symbol-drop-{game}-settled.png'),full_page=True)
  passed.append(game+': seeded payout and shared wallet exact, double spin blocked, real grid-settled hooks, clean completion before next action')
 # A Wheel respin and an earned Dumpster Dash retain the precomputed complete payout.
 for game,kind in [('magnet','respin'),('critter','bonus')]:
  pg.evaluate(games[game][0]);pg.wait_for_timeout(200);pg.evaluate('state.fastGame=true;state.fastBonus=true')
  planned=pg.evaluate('''game=>{const id='11111111-1111-4111-8111-111111111111';for(let seed=0;seed<20000;seed++){const r=game==='magnet'?MAGNET_V2_MODEL.start({seed,bet:20,roundId:id}):CRITTER_MODEL.start({seed,bet:20,roundId:id});if(game==='magnet'?r.status==='SETTLED'&&r.magneticPlan.wheel?.id==='respin':!!r.bonus)return {seed,payout:r.payout};}throw Error('Seed not found')}''',game)
  before=pg.evaluate('state.balance');prior=len(cloud.rounds)
  pg.evaluate('''x=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=x.seed;return a};document.getElementById(x.button).click();crypto.getRandomValues=old}''',{'seed':planned['seed'],'button':games[game][1]})
  pg.wait_for_function('!('+games[game][2]+')',timeout=60000);pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length')
  assert abs(pg.evaluate('state.balance')-(before-20+planned['payout']))<.00001 and len(cloud.rounds)==prior+1
  passed.append(game+' '+kind+': complete feature animations finish before unlock, exact precomputed payout once')
 # F5 discards only visual progress, retaining the terminal deterministic checkpoint.
 pg.evaluate('VaultCritter.open()');pg.wait_for_timeout(200);prior=len(cloud.rounds)
 pg.locator('#critterSpin').click();pg.wait_for_function('VaultSymbolDrop.isBusy("critter")');checkpoint=pg.evaluate('VaultCritter.getCheckpoint()')
 pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length');pg.reload();pg.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready')
 assert pg.evaluate('VaultCritter.getCheckpoint()')==checkpoint
 assert len(cloud.rounds)==prior+1 and not pg.evaluate('VaultSymbolDrop.isBusy("critter")')
 pg.reload();pg.wait_for_function('VaultSession.ready');assert len(cloud.rounds)==prior+1
 # STOP cancels future parents while the in-flight promise completes normally.
 pg.wait_for_function('VaultCritter.inspect().ready');prior=len(cloud.rounds);pg.evaluate('VaultSlotHud.instances.find(n=>n.id==="critter").actions.startAutoplay(10)');pg.wait_for_function('VaultSymbolDrop.isBusy("critter")');pg.evaluate('VaultSlotHud.instances.find(n=>n.id==="critter").actions.stopAutoplay()');pg.wait_for_function('!VaultCritter.isBusy',timeout=60000);pg.wait_for_timeout(1200);pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length')
 assert len(cloud.rounds)==prior+1 and pg.evaluate('VaultCritter.inspect().auto')==0
 passed.append('F5 during drop restores exact stable result without replay/duplicate payout; STOP during animation completes only the current round')
 assert not errors,errors;ctx.close();b.close()
print('\n'.join('PASS '+s for s in passed))
(ROOT/'reports/symbol-drop-games.json').write_text(json.dumps({'mode':'real SDK + HTTP fixtures, not live backend','passed':passed,'pageErrors':errors},indent=2)+'\n')
