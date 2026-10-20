"""Shared purchase gate and presentation-only balance, actual SDK owned fixtures."""
from pathlib import Path
import json
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];checks=[]
def shared_route(r):
 if r.request.url.split('/')[-1] in ['heist_capabilities','swamp_slot_capabilities']:return r.fulfill(content_type='application/json',body=json.dumps({'version':2,'purchaseVersion':1,'boostVersion':1,'siteAdminVersion':1,'bonusVersion':2}),headers={'Access-Control-Allow-Origin':'*'})
 return critter_route(r)

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1100});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',shared_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(body=HTML,content_type='text/html'));page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")')
 for game,op,buy,choice,boost in [('slot','openSlotGame()','#buyBtn','#buyNormalBonusBtn','#scatterBoostBtn'),('swamp','VaultSwamp.open()','#swampBuy','[data-swamp-buy="bonus"]','#swampScatterBoost'),('vault_heist','VaultHeist.open()','#heistBuy','[data-heist-buy="heist"]','#heistScatterBoost'),('critter','VaultCritter.open()','#critterBuy','#critterShopConfirm','#critterShopConfirm')]:
  page.evaluate(op);page.wait_for_timeout(300)
  if game=='critter':page.wait_for_function('VaultCritter.inspect().ready')
  before=page.evaluate('state.balance');page.locator(buy).click()
  if game=='critter':page.locator('[name="critter-feature"][value="bonus"]').check()
  page.locator(choice).click();confirmation=page.locator('.slot-purchase-confirmation[open]');assert confirmation.count()==1;assert confirmation.get_attribute('data-slot-skin')==game;assert page.evaluate('state.balance')==before;confirmation.locator('[data-no]').click();assert page.evaluate('state.balance')==before
  page.locator(buy).click();page.locator(choice).click();page.keyboard.press('Escape');assert not page.locator('.slot-purchase-confirmation[open]').count();assert page.evaluate('state.balance')==before
  page.locator(buy).click()
  if game=='critter':page.locator('[name="critter-feature"][value="boost"]').check()
  page.locator(boost).click();page.wait_for_timeout(50);assert page.locator('.slot-feature-toast:not([hidden])').count()>=1,(game,page.evaluate('state.scatterBoost'),page.locator(boost).get_attribute('disabled'),errors)
  assert not page.locator('dialog.slot-bonus-dialog[open],#bonusShopModal.show').count();assert page.evaluate('state.balance')==before
  checks.append(game+': shared themed confirmation, no charge before YES/NO/ESC, boost closes shop with toast')
 # All display examples, carry rounding and wallet precision remain isolated.
 results=page.evaluate('''()=>[5323202.373411,15230.287491,999.99999991,53232022.9384,1234567890123.123].map(n=>({n,s:formatBalanceForDisplay(n,{mobile:true})}))''')
 assert results[0]['s'].replace('\xa0',' ').endswith(',37');assert results[1]['s'].endswith(',2875');assert results[2]['s'].replace('\xa0',' ')=='1 000'
 for width in [320,390,430,1440]:
  page.set_viewport_size({'width':width,'height':1000});before=page.evaluate('state.balance');page.evaluate('''()=>{document.querySelectorAll('#critterApp .slot-balance strong').forEach(n=>BalanceDisplay.render(n,1234567890123.123))}''');assert page.evaluate('state.balance')==before
  assert page.evaluate("()=>{const n=document.querySelector('#critterApp .slot-balance strong');return n.scrollWidth<=n.clientWidth+1}")
  assert page.evaluate("()=>[...document.querySelectorAll('#critterGrid .critter-tile-art')].every(n=>{const r=n.getBoundingClientRect(),c=n.parentElement.getBoundingClientRect(),m=n.getScreenCTM();return r.width>=c.width-2&&r.height>=c.height-2&&Math.abs(m.a-m.d)<.001})")
  if width==390:page.screenshot(path=str(ROOT.parent/'output/critter-full-tiles-mobile.png'),full_page=True)
 checks.append('Pure 9-digit/mobile carry formatter, compact overflow, desktop; real balance unchanged; premium tiles full-cell and uniformly scaled320–1440')
 # All cancellation paths and fresh balance/price checks are presentation-safe.
 page.locator('#critterBuy').click();page.locator('[name="critter-feature"][value="super"]').check();page.locator('#critterShopConfirm').click();assert 'SUPER' in page.locator('#critterApp .slot-purchase-confirmation h2').inner_text();page.locator('#critterApp .slot-purchase-confirmation [data-dismiss]').click()
 page.locator('#critterBuy').click();page.locator('#critterShopConfirm').click();page.mouse.click(1,1);assert not page.locator('.slot-purchase-confirmation[open]').count()
 page.locator('#critterBuy').click();page.locator('#critterShopConfirm').click();saved=page.evaluate('state.balance');result=page.evaluate("()=>{VaultWalletService.setLocalBalance(0);document.querySelector('#critterApp .slot-purchase-confirmation [data-yes]').click();return {message:document.querySelector('#critterApp .slot-purchase-confirmation [data-message]').textContent,balance:state.balance};}");assert 'INSUFFICIENT' in result['message'],result;assert result['balance']==0;page.locator('#critterApp .slot-purchase-confirmation [data-no]').click();page.evaluate('n=>VaultWalletService.setLocalBalance(n)',saved)
 checks.append('SUPER uses same gate; X/backdrop cancel; balance rechecked after opening confirmation, insufficient funds never purchase')
 page.evaluate('state.fastGame=true');page.locator('#critterBuy').click();page.locator('[name="critter-feature"][value="bonus"]').check();page.locator('#critterShopConfirm').click();before=page.evaluate('state.balance');page.evaluate("()=>{const n=document.querySelector('#critterApp .slot-purchase-confirmation [data-yes]');n.click();n.click();}");page.wait_for_function('!VaultCritter.isBusy',timeout=120000);r=page.evaluate('VaultCritter.getCheckpoint()');assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6);assert r['purchaseType']=='bonus'
 # Final preview uses an actual paid seeded result with all premium symbol types.
 seed=page.evaluate("()=>{for(let s=0;s<10000;s++){const r=CRITTER_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID(),scatterBoost:VaultCritter.scatterBoost});if(!r.bonus&&['cat','pigeon','possum','bulldog','wild','scatter'].every(id=>r.base.finalGrid.some(t=>t.symbol===id)))return s}}")
 page.evaluate("s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('critterSpin').click();crypto.getRandomValues=old}",seed);page.wait_for_function('!VaultCritter.isBusy',timeout=120000);page.set_viewport_size({'width':390,'height':844});page.evaluate("VaultSlotHud.refresh();document.querySelectorAll('.slot-feature-toast').forEach(n=>n.hidden=true)");page.screenshot(path=str(ROOT.parent/'output/critter-full-tiles-mobile.png'),full_page=True)
 assert not errors,errors;checks.append('Double YES starts one real Critter bonus and debits once; no JS errors');b.close()
(ROOT/'reports/shared-bonus.json').write_text(json.dumps({'mode':'owned actual SDK fixtures','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+x for x in checks))
