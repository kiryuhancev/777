"""Actual SDK + current UI, owned HTTP fixture; never live Supabase."""
from pathlib import Path
import json
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1150});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',critter_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(body=HTML,content_type='text/html'))
 # Hold a genuine bonus jump only for inspection, then resume the same promise.
 ctx.add_init_script('''const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>{if(window.testHoldRun&&[190,350].includes(ms)&&document.getElementById('critterMode')?.textContent.includes('BONUS SPIN')&&document.querySelector('.critter-runner')){window.testResumeRun=()=>nt(fn,0,...a);return nt(()=>{},100000);}return nt(fn,fn.name==='spin'&&(ms===450||ms===850)?100000:ms<2000?Math.max(1,ms*.06):ms,...a);};const na=Element.prototype.animate;Element.prototype.animate=function(...a){const v=na.apply(this,a);v.playbackRate=16;if(window.testHoldRun&&this.classList.contains('critter-runner')&&document.getElementById('critterMode')?.textContent.includes('BONUS SPIN')){v.pause();window.testResumeRun=()=>document.querySelectorAll('.critter-runner').forEach(n=>n.getAnimations().forEach(a=>a.play()));}return v;}''')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.evaluate('VaultCritter.open()');page.wait_for_function('VaultCritter.inspect().ready');page.evaluate('state.fastGame=true')
 def sync():page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def done():page.wait_for_function('!VaultCritter.isBusy',timeout=120000);sync()
 def cp():return page.evaluate('VaultCritter.getCheckpoint()')
 def buy(kind,seed=2):
  page.locator('#critterBuy').click();page.locator(f'[name="critter-feature"][value="{kind}"]').check()
  page.evaluate('s=>{window.oldRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a}}',seed)
  page.locator('#critterShopConfirm').click();page.evaluate('()=>{crypto.getRandomValues=window.oldRandom;}')
 sync();page.locator('#critterBuy').click();assert page.locator('#critterBonusShop').is_visible();assert page.locator('[name="critter-feature"]').count()==3
 prices=page.locator('#critterPricebonus').inner_text();page.locator('#critterShopPlus').click();assert page.locator('#critterPricebonus').inner_text()!=prices;page.locator('#critterShopMinus').click();page.locator('#critterShopCancel').click()
 checks.append('BONUS in shared HUD; three choices; Cancel; current bet and prices update immediately')
 for width in [320,390,430,768,1440]:
  page.set_viewport_size({'width':width,'height':1150});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert page.evaluate("()=>[...document.querySelectorAll('#critterGrid .critter-cell svg')].every(n=>{const m=n.getScreenCTM();return Math.abs(m.a-m.d)<.001&&Math.abs(m.b)<.001&&Math.abs(m.c)<.001&&n.getAttribute('preserveAspectRatio')==='xMidYMid meet'})")
  page.locator('#critterBuy').click();assert page.locator('#critterShopConfirm').is_visible();assert page.evaluate('document.getElementById("critterBonusShop").scrollWidth<=document.getElementById("critterBonusShop").clientWidth+1')
  if width==390:page.screenshot(path=str(ROOT.parent/'output/critter-v3-mobile-shop.png'),full_page=True)
  page.locator('#critterShopCancel').click()
 checks.append('320–1440px: original uniform SVG transform, cat proportions, no page/dialog overflow')
 # Enabling boost is free; the complete multiplier is debited once for the next paid spin.
 before=page.evaluate('state.balance');buy('boost');assert page.evaluate('VaultCritter.scatterBoost');assert page.evaluate('state.scatterBoost') is False;assert page.locator('#critterBoostIndicator').is_visible();assert page.evaluate('state.balance')==before
 page.evaluate('''()=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=1;return a};document.getElementById('critterSpin').click();document.getElementById('critterSpin').click();crypto.getRandomValues=old;}''');r=cp();assert r['scatterBoost'] and r['cost']>r['bet'];done();assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
 page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');assert page.evaluate('VaultCritter.scatterBoost');page.evaluate('state.fastGame=true');buy('boost');assert not page.evaluate('VaultCritter.scatterBoost')
 checks.append('Real boost flag frozen in checkpoint; free toggle, one correct boosted debit; isolated game preference survives F5 without changing other slots')
 # Normal purchase: inspect a real animated Running Wild and then full completion.
 page.evaluate('window.testHoldRun=true');before=page.evaluate('state.balance');buy('bonus');r=cp();assert r['purchaseType']=='bonus' and not r['scatterBoost'];assert not r['base']['steps'];page.wait_for_function('typeof window.testResumeRun==="function"',timeout=30000)
 assert page.locator('.critter-runner img').count()>=1;assert page.locator('.critter-runner .critter-wild-multiplier').first.inner_text().startswith('x');assert page.evaluate("()=>{const n=document.querySelector('.critter-runner'),a=n.getAnimations()[0],before=n.getBoundingClientRect();a.currentTime=a.effect.getTiming().duration/2;const after=n.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(n).transform);return Math.hypot(after.x-before.x,after.y-before.y)>1&&Math.abs(m.a-m.d)<.001;}");page.screenshot(path=str(ROOT.parent/'output/critter-v3-bonus-running.png'),full_page=True)
 page.evaluate('window.testHoldRun=false;window.testResumeRun()');done();assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
 expected=r['bonus']['spins'][-1]['finalGrid'];assert page.evaluate("[...document.querySelectorAll('#critterGrid .critter-cell')].map(n=>({uid:+n.dataset.uid,symbol:n.dataset.symbol,multiplier:n.dataset.symbol==='wild'?+n.querySelector('.critter-wild-multiplier').textContent.slice(1):null}))")==[{'uid':t['uid'],'symbol':t['symbol'],'multiplier':t.get('multiplier')} for t in expected]
 checks.append('Purchased normal bonus: real Wild jump with multiplier badge, exact final field/payout, one debit, no residual runner')
 # SUPER has20 spins and fixed cost; F5 never purchases/replays it twice.
 before=page.evaluate('state.balance');buy('super',63);r=cp();assert r['bonus']['spinCount']==20 and r['cost']>r['bet'];done();assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6);checks.append('SUPER completes all20 spins without hang and pays exact model result');
 before=page.evaluate('state.balance');buy('super',64);r=cp();sync();count=cloud.stats[(A,'critter')]['rounds_played'];page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');sync();assert cp()==r;assert not page.evaluate('VaultCritter.isBusy');assert cloud.stats[(A,'critter')]['rounds_played']==count;assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
 checks.append('SUPER20 spins; F5 restores stable terminal result, no duplicated purchase/payout/statistics')
 # Insufficient funds is determined by total price, never by base bet alone.
 page.evaluate('VaultCritter.betIndex=BETS.length-1');page.locator('#critterBuy').click();page.locator('[name="critter-feature"][value="super"]').check();assert page.locator('#critterShopConfirm').is_disabled();page.keyboard.press('Escape')
 assert page.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}");assert not errors,errors;assert not console_errors,console_errors
 checks.append('Total-cost affordability; no duplicate IDs, console/page errors')
 b.close()
(ROOT/'reports/critter-v3-browser.json').write_text(json.dumps({'mode':'owned actual SDK fixtures','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+s for s in checks))
