"""Actual browser lifecycle/persistence with the real SDK and isolated API fixture."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py')
ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},has_touch=True);errors=[]
 ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));ctx.route('https://vault-test.supabase.co/**',cloud.route)
 ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready')
 page.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");page.evaluate('openBirdGame();state.sound=false');page.wait_for_timeout(150)
 ids=page.evaluate("[...document.querySelectorAll('[id]')].map(e=>e.id)");assert len(ids)==len(set(ids))
 before=page.evaluate('state.balance');page.locator('#birdStartBtn').click()
 assert page.evaluate('birdState.phase')=='SLINGSHOT';assert page.evaluate('state.balance')==before-20
 rid=page.evaluate('birdState.roundId');assert rid and len(rid)==36
 assert page.evaluate('birdState.run.plan.flightPlan.bonusSpawns.length')>=6
 page.screenshot(path='/workspace/output/bird-v2-sling-desktop.png',full_page=True)
 positions=page.evaluate('birdState.bonuses.map(b=>[b.x,b.y])');page.locator('#birdStartBtn').click()
 assert page.evaluate('birdState.run.birds.length')==1;assert page.evaluate('state.balance')==before-20
 page.wait_for_function('birdState.camera.x>100');assert page.evaluate('birdState.phase')=='FLIGHT'
 page.screenshot(path='/workspace/output/bird-v2-flight-desktop.png',full_page=True)
 assert positions==page.evaluate('birdState.bonuses.map(b=>[b.x,b.y])')
 # Accelerate the exact same physics path while browser camera continues normally.
 page.evaluate('()=>{for(let i=0;i<2400&&birdState.active;i++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT)}')
 result=page.evaluate('birdState.lastResult');assert result['roundId']==rid
 after=page.evaluate('state.balance');assert abs(after-(before-20+result['payout']))<1e-5
 page.evaluate('settleBirdRound();settleBirdRound()');assert page.evaluate('state.balance')==after
 page.evaluate('VaultSync.flush()');page.wait_for_function('VaultStorage.inspect().data.queue.length===0')
 assert cloud.stats[(A,'bird')]['rounds_played']==1
 page.screenshot(path='/workspace/output/bird-v2-result-desktop.png',full_page=True)
 page.wait_for_function("birdState.phase==='IDLE'");assert page.evaluate('birdState.run') is None
 checks.append('One paid launch, fixed bonuses, moving camera, one settlement/stat entry, bounded cleanup')
 # A new plan and actual touch/pen/mouse-compatible drag path.
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/workspace/output/bird-v2-sling-mobile.png',full_page=True)
 rectangle=page.locator('#birdCanvas').bounding_box();sx=rectangle['x']+280/960*rectangle['width'];sy=rectangle['y']+390/540*rectangle['height']
 touch=ctx.new_cdp_session(page)
 touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
 for i in range(1,9):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx-100/960*rectangle['width']*i/8,'y':sy+44/540*rectangle['height']*i/8}]})
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert page.evaluate('birdState.phase')=='FLIGHT';assert page.evaluate('birdState.roundId')!=rid
 interrupted=page.evaluate('state.balance');page.reload();page.wait_for_function('VaultSession.ready')
 assert page.evaluate("VaultSession.mode==='authenticated'");assert page.evaluate('birdState.phase')=='IDLE'
 assert abs(page.evaluate('state.balance')-interrupted)<1e-5
 page.evaluate('VaultSync.flush()');page.wait_for_function('VaultStorage.inspect().data.queue.length===0')
 assert len(cloud.rounds)==2;assert [r['status'] for r in cloud.rounds.values()].count('cancelled')==1
 page.reload();page.wait_for_function('VaultSession.ready');assert len(cloud.rounds)==2
 checks.append('Mobile drag and no overflow; F5 retains debit/session and cancels flight without duplicate payout')
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':900});page.evaluate('openBirdGame()');page.wait_for_timeout(80)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert page.locator('.lobby-top').is_visible();assert page.locator('#birdStartBtn').is_visible()
 for game in ['openSlotGame()','openPokerGame()','openLobby()','openBirdGame()']:page.evaluate(game)
 assert not errors,errors
 checks.append('Five viewport widths, shared VAULT header, all navigation, no duplicate IDs or page errors')
 # Play a large scene in real time, rather than only fast-forwarding the model.
 page.set_viewport_size({'width':1440,'height':1000});page.evaluate('openBirdGame()')
 seed=page.evaluate("()=>{for(let n=0;n<1000;n++)if(BIRD_MODEL.plan(n,20).buildingPlan.size==='FORTRESS')return n}")
 page.evaluate('seed=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=seed;return a};startBirdRound();crypto.getRandomValues=original;launchBird(true)}',seed)
 page.wait_for_function('birdState.run?.targetAdded',timeout=10000)
 frames=page.evaluate('''()=>new Promise(resolve=>{const frames=[],end=performance.now()+800;let last=performance.now();function sample(t){frames.push(t-last);last=t;if(t<end)requestAnimationFrame(sample);else resolve(frames.slice(1));}requestAnimationFrame(sample);})''')
 framing=page.evaluate('''()=>{const b=birdState.run.plan.buildingPlan.bounds,c=birdState.camera;return {left:(b.left-c.x)*c.zoom,right:(b.right-c.x)*c.zoom,top:540-540*c.zoom+b.top*c.zoom}}''')
 assert framing['left']>=0 and framing['right']<=960 and framing['top']>=0,framing
 page.screenshot(path='/workspace/output/bird-v2-target-desktop.png',full_page=True)
 page.wait_for_function("birdState.phase==='RESULT'||birdState.phase==='IDLE'",timeout=15000)
 page.evaluate('VaultSync.flush()');page.wait_for_function('VaultStorage.inspect().data.queue.length===0')
 checks.append('Large physical scene played in real time; full target framing and bounded settlement')
 assert not errors,errors
 report_fps={'frames':len(frames),'meanMs':sum(frames)/len(frames),'p95Ms':sorted(frames)[int(len(frames)*.95)]}
 report={'passed':checks,'consoleErrors':errors,'result':result,'largeSceneFrameTiming':report_fps,'mode':'Actual browser/SDK, API fixture; no live Supabase claim'}
 (ROOT/'reports/bird-v2-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));b.close()
