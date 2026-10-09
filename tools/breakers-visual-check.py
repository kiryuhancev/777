"""Presentation/fallback checks use isolated Auth/API fixtures, never the live wallet."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context(html=HTML,dpr=1):
  c=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=dpr)
  c.route('https://**',lambda r:r.abort());c.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));c.route('https://vault-test.supabase.co/**',cloud.route)
  c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=html));return c
 c=context(dpr=2);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");page.evaluate('openBirdGame();state.sound=false');page.evaluate('VB_ASSETS_READY')
 assert page.evaluate('birdCanvas.width')==1920 and page.evaluate('birdCanvas.height')==1080
 assert page.locator('#vbLogo').is_visible();assert 'VAULT BREAKERS' in page.title();assert page.locator('#openBirdGame').get_attribute('aria-label')=='Играть в VAULT BREAKERS'
 page.locator('#birdStartBtn').click();assert page.evaluate('birdState.bonuses.length')==0
 assert page.evaluate('birdState.pigs.every(p=>p.shape==="circle"&&p.invMass>0&&p.invInertia>0)')
 assert page.evaluate('''()=>{const p=birdState.pigs[0],original=p.angle;birdState.sentinelAngles.set(p.id,0);p.angle=2;updateSentinelRenderAngles(birdState.run,1/60);const limited=Math.abs(birdState.sentinelAngles.get(p.id))<=.10001;p.angle=original;return limited;}''')
 # Instrument drawImage to verify the approved player/guard textures are used.
 names=page.evaluate('''()=>{const calls=[],old=bctx.drawImage.bind(bctx);bctx.drawImage=(img,...args)=>{calls.push(Object.entries(VB_ASSETS).find(([,a])=>a.image===img)?.[0]);return old(img,...args)};drawBirdGame();for(const p of birdState.pigs)drawSentinel(bctx,p);bctx.drawImage=old;return calls;}''')
 assert 'player' in names and ('sentinelBasic' in names or 'sentinelScout' in names)
 page.evaluate('birdState.debug=true;drawBirdGame();birdState.debug=false')
 page.screenshot(path='/workspace/output/breakers-high-dpi.png',full_page=True)
 checks.append('Approved side-view player and front-facing Sentinel sprites render; Sentinel collider remains circular; DPR2 and debug work')
 page.evaluate('launchBird(true)');page.evaluate('()=>{for(let i=0;i<2400&&birdState.active;i++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT)}');page.evaluate('VaultSync.flush()');page.wait_for_function('VaultStorage.inspect().data.queue.length===0');c.close()
 # Actual asset decoding failure triggers geometric technology fallbacks.
 broken=re.sub(r'("src":\s*")data:image/webp;base64,[^"]+',lambda m:m[1]+'data:image/webp;base64,AAAA',HTML)
 c=context(broken);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));warnings=[];page.on('console',lambda m:warnings.append(m.text) if m.type=='warning' else None)
 page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");page.evaluate('openBirdGame();state.sound=false');page.evaluate('VB_ASSETS_READY')
 assert page.evaluate('Object.values(VB_ASSETS).every(a=>a.status==="failed")');assert warnings
 assert page.locator('#vbTitle').inner_text()=='VAULT BREAKERS';page.locator('#birdStartBtn').click();page.locator('#birdStartBtn').click()
 page.evaluate('()=>{for(let i=0;i<2400&&birdState.active;i++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT)}');assert page.evaluate('birdState.lastResult')
 page.evaluate('drawBirdGame()');page.screenshot(path='/workspace/output/breakers-fallback.png',full_page=True)
 checks.append('All eleven asset failures resolve without crash; geometric industrial fallback completes and settles a real round')
 assert not errors,errors
 report={'passed':checks,'pageErrors':errors,'assetFailureWarnings':len(warnings)};(ROOT/'reports/breakers-visual.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));browser.close()
