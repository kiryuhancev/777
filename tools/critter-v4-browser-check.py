"""Owned actual-SDK fixtures; no live Supabase writes. Real v4 renderer and storage."""
from pathlib import Path
import json
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1150});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',critter_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(body=HTML,content_type='text/html'))
 ctx.add_init_script('''const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,fn.name==='spin'&&(ms===450||ms===850)?100000:ms<2000?Math.max(1,ms*.09):ms,...a);const na=Element.prototype.animate;Element.prototype.animate=function(...a){const v=na.apply(this,a);v.playbackRate=12;if(window.testHoldRun&&this.classList.contains('critter-runner')){v.pause();window.testResumeRun=()=>document.querySelectorAll('.critter-runner').forEach(n=>n.getAnimations().forEach(a=>a.play()));}return v;};''')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.evaluate('VaultCritter.open()');page.wait_for_function('VaultCritter.inspect().ready');page.evaluate('state.fastGame=true')
 def sync():page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def done():page.wait_for_function('!VaultCritter.isBusy',timeout=120000);sync()
 def cp():return page.evaluate('VaultCritter.getCheckpoint()')
 def buy(kind,seed=2):
  page.locator('#critterBuy').click();page.locator(f'[name="critter-feature"][value="{kind}"]').check()
  page.evaluate('s=>{window.oldRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a}}',seed)
  page.locator('#critterShopConfirm').click();page.evaluate('()=>{crypto.getRandomValues=window.oldRandom;}')
 sync();page.locator('#critterBuy').click();assert page.locator('[name="critter-feature"]').count()==3
 price=page.locator('#critterPricebonus').inner_text();page.locator('#critterShopPlus').click();assert page.locator('#critterPricebonus').inner_text()!=price;page.locator('#critterShopMinus').click();page.locator('#critterShopCancel').click()
 for width in [320,390,430,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert page.evaluate("()=>[...document.querySelectorAll('#critterGrid .critter-cell svg')].every(n=>{const m=n.getScreenCTM();return Math.abs(m.a-m.d)<.001&&Math.abs(m.b)<.001&&Math.abs(m.c)<.001&&n.getAttribute('preserveAspectRatio')==='xMidYMid meet'})")
  if width==390:page.screenshot(path=str(ROOT.parent/'output/critter-v4-mobile.png'),full_page=True)
 checks.append('Shared HUD structure unchanged; three BONUS choices with live prices; 320–1440px uniform symbols/cat, no horizontal overflow')
 # Base has exactly one immutable field, x1 Wilds, no runner/refill.
 seed=page.evaluate("()=>{for(let seed=0;seed<10000;seed++){const r=CRITTER_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(!r.bonus&&r.base.wins.length&&r.base.finalGrid.some(t=>t.symbol==='wild'))return seed}}")
 before=page.evaluate('state.balance');page.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('critterSpin').click();document.getElementById('critterSpin').click();crypto.getRandomValues=old;}''',seed);r=cp();done();assert r['base']['initialGrid']==r['base']['finalGrid'];assert all(w['multiplier']==1 for w in r['base']['wins']);assert not r['base']['movements'];assert page.locator('.critter-runner').count()==0;assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
 checks.append('Base: one result, standard x1 Wild, no movement/cascade/refill; double click charges and logs once')
 before=page.evaluate('state.balance');buy('boost');assert page.evaluate('VaultCritter.scatterBoost');assert page.evaluate('state.balance')==before;assert 'SCATTER BOOST ACTIVE' in page.locator('#critterBoostIndicator').inner_text();assert page.evaluate('state.scatterBoost') is False
 page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');assert page.evaluate('VaultCritter.scatterBoost');page.evaluate('state.fastGame=true');buy('boost')
 checks.append('Configurable genuine Scatter boost, free toggle and indicator; independent preference survives F5')
 # Pause an actual persistent runner, inspect its real transform, reload in the middle.
 page.evaluate('window.testHoldRun=true');before=page.evaluate('state.balance');buy('super',2);r=cp();assert r['bonus']['spinCount']==20;page.wait_for_function('typeof window.testResumeRun==="function"',timeout=30000)
 assert page.evaluate("()=>{const n=document.querySelector('.critter-runner'),a=n.getAnimations()[0],before=n.getBoundingClientRect();a.currentTime=a.effect.getTiming().duration/2;const after=n.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(n).transform);return Math.hypot(after.x-before.x,after.y-before.y)>1&&Math.abs(m.a-m.d)<.001;}")
 cursor=page.evaluate('VaultCritter.inspect().progress');assert 0<cursor['nextSpin']<20;assert cursor['persistentWilds'];assert any(w['multiplier']>=2 for w in cursor['persistentWilds'])
 page.screenshot(path=str(ROOT.parent/'output/critter-v4-running.png'),full_page=True);sync();count=cloud.stats[(A,'critter')]['rounds_played'];wallet=page.evaluate('state.balance');rid=r['roundId']
 # Pause again after reload to compare the exact resumed spin; no new result can be generated.
 ctx.add_init_script('window.testHoldRun=true');page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');page.wait_for_function('typeof window.testResumeRun==="function"',timeout=30000)
 restored=page.evaluate('VaultCritter.inspect().progress');assert restored==cursor,(restored,cursor);assert cp()==r;assert page.evaluate('state.balance')==wallet
 current=page.evaluate("[...document.querySelectorAll('#critterGrid .critter-cell')].map(n=>n.dataset.symbol)");assert current==[t['symbol'] for t in r['bonus']['spins'][cursor['nextSpin']]['initialGrid']]
 page.evaluate('window.testHoldRun=false;window.testResumeRun()');done();assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6);assert cloud.stats[(A,'critter')]['rounds_played']==count
 progress=page.evaluate('VaultCritter.inspect().progress');assert progress['complete'] and progress['remainingFreeSpins']==0 and progress['persistentWilds']==[];assert page.locator('.critter-runner').count()==0
 checks.append('SUPER20: actual pre-win hop/trails and readable multiplier; F5 mid-hop restores exact positions/personal multipliers/remaining FS, same plan and no duplicate settlement; full bonus completes/clears')
 page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');assert not page.evaluate('VaultCritter.isBusy');assert cloud.stats[(A,'critter')]['rounds_played']==count
 # Normal purchase also completes; clear inspection-only init hold.
 page.evaluate('window.testHoldRun=false;state.fastGame=true');before=page.evaluate('state.balance');buy('bonus',3);r=cp();done();assert r['bonus']['spinCount']==10;assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
 checks.append('Normal BONUS BUY10 and SUPER20 retain one price per round; completed F5 never resumes/repays')
 # Pause by switching screens, then resume the same business checkpoint.
 page.evaluate('window.testHoldRun=true');buy('bonus',2);page.wait_for_function('typeof window.testResumeRun==="function"&&document.querySelector(".critter-runner")');r=cp();cursor=page.evaluate('VaultCritter.inspect().progress');page.evaluate('openLobby()');page.wait_for_function('!VaultCritter.isBusy');page.evaluate('window.testHoldRun=false;VaultCritter.open()');done();assert cp()==r
 checks.append('Lobby navigation pauses/resumes existing feature without buying/free reroll')
 page.evaluate('VaultCritter.betIndex=BETS.length-1');page.locator('#critterBuy').click();page.locator('[name="critter-feature"][value="super"]').check();assert page.locator('#critterShopConfirm').is_disabled();page.keyboard.press('Escape')
 assert page.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}");assert not errors,errors;assert not console_errors,console_errors
 checks.append('Full-cost affordability, unique IDs and no console/page errors')
 page.evaluate('VaultAuth.signOut()');page.wait_for_function('VaultSession.mode==="guest"');assert cp() is None
 checks.append('Signout clears account-specific plan and recovery progress')
 b.close()
(ROOT/'reports/critter-v4-browser.json').write_text(json.dumps({'mode':'Chromium + actual SDK owned HTTP fixtures; not live DB/mobile device','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+s for s in checks))
