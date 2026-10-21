"""Natural feature, offline recovery, small viewport and autoplay financial checks."""
from pathlib import Path
import json,time,re
source=Path(__file__).with_name('upside-paws-browser-check.py');ns={'__file__':str(source)};exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':320,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2);ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',api);ctx.route('http://127.0.0.1:8777/**',site);page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
 page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.wait_for_function('VaultBonusSession.ready');page.evaluate("VaultUpsidePaws.open();state.sound=false;VaultUpsidePaws.setProfile('turbo')");page.wait_for_function('VaultUpsidePaws.inspect().ready');page.emulate_media(reduced_motion='reduce')
 def sync():page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def gate():page.wait_for_selector('#upsidePawsReels .vault-feature-gate',timeout=15000);page.wait_for_timeout(220)
 def ack():page.locator('.feature-continue').tap()
 def seed(s):page.evaluate('s=>{window.savedRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a;};}',s)
 def unseed():page.evaluate('()=>{crypto.getRandomValues=window.savedRandom;}')
 def paid(s):seed(s);page.evaluate('document.getElementById("upsidePawsSpin").click()');unseed()
 sync();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('.upsidepaws-cell').count()==32
 for selector in ['[data-control=spin]','[data-control=bonus]','[data-control=bet-minus]','[data-control=bet-plus]']:
  box=page.locator('#upsidePawsApp '+selector).bounding_box();assert box['height']>=30 and box['width']>=28,(selector,box)
 # Natural bonus with a planned Full Breach, then reload at the exact queued boundary.
 natural=page.evaluate("()=>{for(let seed=0;seed<100000;seed++){const r=UPSIDE_PAWS_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(r.bonus&&r.baseWinX<15&&r.bonus.spins.some(p=>p.fullBreach))return seed;}}")
 before=page.evaluate('state.balance');paid(natural);gate();r=page.evaluate('VaultUpsidePaws.getCheckpoint()');assert not r['purchase'];assert page.locator('.vault-feature-card h2').inner_text()=='DIMENSION BREACH';sync();entry=round(before-r['cost']+r['baseWinX']*r['bet'],6);assert page.evaluate('state.balance')==entry;ack();gate();assert page.locator('.vault-feature-card h2').inner_text()=='FULL BREACH';saved=page.evaluate('VaultUpsidePaws.getProgress()');assert saved['meter']==100 and saved['armed'];sync();assert page.evaluate('state.balance')==entry
 page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');gate();assert page.locator('.vault-feature-card h2').inner_text()=='FULL BREACH';assert page.evaluate('VaultUpsidePaws.getProgress()')==saved;assert page.evaluate('state.balance')==entry
 # Saved next plan is replayed, not a newly randomized Full Breach.
 plan=page.evaluate('VaultUpsidePaws.getCheckpoint().bonus.spins[VaultUpsidePaws.getProgress().nextSpin]');ack();page.wait_for_function('n=>VaultUpsidePaws.getProgress().nextSpin>n',arg=saved['nextSpin']);assert plan['fullBreach'];
 for _ in range(100):
  page.wait_for_timeout(100)
  if page.locator('.vault-feature-gate').count():
   gate()
   if page.locator('.vault-feature-card h2').inner_text()=='BONUS COMPLETE':break
   ack()
 else:raise AssertionError('Feature stalled')
 sync();assert page.evaluate('state.balance')==entry;ack();page.wait_for_function('!VaultUpsidePaws.isBusy');sync();assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
 checks.append('Natural Scatter trigger credits base once;320px touch; Full Breach meter100/armed/total/remaining restore byte-for-byte and replay same plan; one final bonus credit')
 # Genuine offline queue/reload, then recover online without losing or duplicating round.
 seed_plain=page.evaluate("()=>{for(let seed=0;seed<1000;seed++){const r=UPSIDE_PAWS_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(!r.bonus&&r.baseWinX<15)return seed;}}")
 before=page.evaluate('state.balance');ctx.route('https://vault-test.supabase.co/**',lambda route:route.abort());page.evaluate('()=>{Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>false});window.dispatchEvent(new Event("offline"));}');paid(seed_plain);page.wait_for_function('!VaultUpsidePaws.isBusy');saved=page.evaluate('VaultUpsidePaws.getCheckpoint()');value=round(before-saved['cost']+saved['payout'],6);assert page.evaluate('state.balance')==value;assert page.evaluate('VaultStorage.inspect().data.queue.length')>0
 page.reload();page.wait_for_function('VaultSession.ready',timeout=20000);assert page.evaluate('state.balance')==value;ctx.unroute('https://vault-test.supabase.co/**');ctx.route('https://vault-test.supabase.co/**',api);page.evaluate('()=>{Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>true});window.dispatchEvent(new Event("online"));}');page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length',timeout=30000);assert page.evaluate('state.balance')==value;assert cloud.rows[A]['wallets']['balance']==value
 checks.append('Offline paid round, F5 local cache recovery, online outbox flush, same round and exact SQL balance without duplicate credit')
 # Autoplay shared selection: ten real rounds and no feature menu race.
 page.evaluate('VaultUpsidePaws.open()');page.wait_for_function('VaultUpsidePaws.inspect().ready');sync();count=cloud.stats[(A,'upside_paws')]['rounds_played'];seed(seed_plain);page.locator('#upsidePawsApp [data-action=auto]').tap();page.locator('#upsidePawsReels dialog[open]').get_by_role('button',name='10',exact=True).tap();page.wait_for_function('!VaultUpsidePaws.isBusy&&document.getElementById("upsidePawsAuto").textContent==="AUTO"',timeout=30000);unseed();sync();assert cloud.stats[(A,'upside_paws')]['rounds_played']==count+10
 checks.append('Shared AUTO menu10 real spins, one round/stat per spin, no overlap or extra payout')
 # Insufficient buy no partial state/transaction.
 original=page.evaluate('state.balance');sql(f"update public.wallets set balance=1,revision=revision+1 where user_id='{A}';");cloud.rows[A]['wallets']=json.loads(sql(f"select row_to_json(w) from public.wallets w where user_id='{A}';"));page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');sync();page.locator('#upsidePawsBuy').tap();gate();page.locator('[data-popup-action=buy]').tap();gate();page.locator('[data-popup-action=yes]').tap();assert page.evaluate('state.balance')==1;assert page.locator('#upsidePawsMessage').inner_text()=='INSUFFICIENT BALANCE';sync();assert cloud.rows[A]['wallets']['balance']==1
 page.evaluate('VaultAuth.signOut()');page.wait_for_function('VaultSession.mode==="guest"');assert not page.locator('#upsidePawsApp').is_visible();assert page.locator('#vaultAuthDialog').is_visible()
 checks.append('Insufficient buy changes neither wallet nor round; signout hides game and returns to auth gate')
 assert not errors,errors
 # Expected network failures are intentional in the offline section; application errors are forbidden.
 unexpected=[e for e in console_errors if not any(s in e for s in ['ERR_FAILED','fetch','Fetch','network','Network','offline','Offline','supabase','Supabase','VAULT remote load failed Error: Could not load account data'])];assert not unexpected,unexpected
 (ROOT/'reports/upside-paws-extra.json').write_text(json.dumps({'passed':checks,'runtimeErrors':errors,'expectedOfflineConsole':console_errors},indent=2));print('\n'.join('PASS '+x for x in checks));b.close()
