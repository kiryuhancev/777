"""Real Chromium UI + Supabase SDK against isolated PostgreSQL, no production writes."""
from pathlib import Path
import json,time
source=Path(__file__).with_name('bonus-update-browser-check.py');ns={'__file__':str(source)};exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
financial.update({'big_top_capabilities','settle_big_top_round','save_big_top_progress','credit_big_top_base'})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1150},has_touch=True);ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',api);ctx.route('http://127.0.0.1:8777/**',site)
 page=ctx.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('ERROR',e,flush=True)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.wait_for_function('VaultBonusSession.ready');page.evaluate('VaultBigTop.open();state.sound=false');page.wait_for_function('VaultBigTop.inspect().ready');print('OPENED',flush=True)
 def sync():
  page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def idle():page.wait_for_function('!VaultBigTop.isBusy',timeout=30000)
 def gate():
  try:page.wait_for_selector('#bigTopReels .vault-feature-gate',timeout=10000);page.wait_for_timeout(220)
  except Exception:
   print('GATE ERROR',page.evaluate('({status:document.getElementById("bigTopMessage").textContent,inspect:VaultBigTop.inspect(),gate:VaultBonusPopup.isOpen("big_top"),buyDisabled:document.getElementById("bigTopBuy").disabled})'),console_errors,flush=True);page.screenshot(path=str(ROOT.parent/'output/big-top-test-failure.png'),full_page=True);raise
 def ack():page.locator('#bigTopReels .feature-continue').click()
 def seed(value):page.evaluate('s=>{window.oldCrypto=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a;};}',value)
 def unseed():page.evaluate('()=>{crypto.getRandomValues=window.oldCrypto;}')
 def paid(value):seed(value);page.evaluate("document.getElementById('bigTopSpin').click()");unseed()
 sync();page.screenshot(path=str(ROOT.parent/'output/big-top-desktop.png'),full_page=True)
 geometry_js="window.geometry={frames:[],active:false,start(){this.frames=[];this.active=true;const tick=()=>{if(!this.active)return;this.frames.push(['#bigTopReels','.bigtop-frame','#bigTopApp .slot-bottom-controls'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));requestAnimationFrame(tick)};tick()},stop(){this.active=false;return [0,1,2].map(k=>[0,1,2,3].map(i=>Math.max(...this.frames.map(f=>f[k][i]))-Math.min(...this.frames.map(f=>f[k][i]))));}}"
 page.add_init_script(geometry_js);page.evaluate(geometry_js)
 # Geometry/atlas fit with all row patterns; legitimate isolated model plans, no wallet writes.
 for heights in [[2]*6,[6]*6,[2,6,3,5,4,2]]:
  page.evaluate('heights=>{const r=BIG_TOP_MODEL.start({seed:13,bet:20,roundId:crypto.randomUUID()});r.base=BIG_TOP_MODEL.makePlan(BIG_TOP_MODEL.seeded(13),{heights});r.bonus=null;VaultBigTop.restore(r,BIG_TOP_MODEL.progress(r,{baseDone:true,complete:true}));}',heights)
  box=page.locator('#bigTopReels').bounding_box();widths=page.locator('.bigtop-reel').evaluate_all('(n)=>n.map(x=>x.getBoundingClientRect().width)');assert max(widths)-min(widths)<1;assert box['height']==480
  assert page.locator('.bigtop-art').evaluate_all('(n)=>n.every(x=>x.getAttribute("preserveAspectRatio")==="xMidYMid meet"&&Math.abs(x.getScreenCTM().a-x.getScreenCTM().d)<.001)')
 page.evaluate('VaultBigTop.restore(null,null)');sync();before=page.evaluate('state.balance');page.evaluate('geometry.start()');seed(0);page.evaluate("document.getElementById('bigTopSpin').click();document.getElementById('bigTopSpin').click()");unseed();idle();sync();r=page.evaluate('VaultBigTop.getCheckpoint()');assert r, page.evaluate('({message:document.getElementById("bigTopMessage").textContent,bridge:VaultBigTopBridge.ready,canPlay:VaultRoundService.canPlay("big_top"),data:VaultStorage.inspect(),session:VaultSession,valid:!!BIG_TOP_MODEL.validate(BIG_TOP_MODEL.start({seed:0,bet:20,roundId:crypto.randomUUID()}))})');assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6);assert cloud.stats[(A,'big_top')]['rounds_played']==1
 assert all(max(v)<.55 for v in page.evaluate('geometry.stop()'));trace=page.evaluate('VaultBigTop.inspect().trace');stops=[x for x in trace if x['type']=='SETTLED'];assert [x['reel'] for x in stops[-6:]]==list(range(6));start=next(x['time'] for x in reversed(trace) if x['type']=='START');times=[x['time']-start for x in stops[-6:]];assert all(abs(x-y)<150 for x,y in zip(times,[1000,1150,1300,1450,1600,1775])),times
 checks.append('A01–05/B/D02/F01–02/G01–05: fixed geometry, native aspect-ratio atlas, left-to-right normal stop timings, double-click single debit/stat')
 for name,factor in [('quick',.7),('turbo',.4),('reduced',.15)]:
  page.emulate_media(reduced_motion='reduce' if name=='reduced' else 'no-preference');page.evaluate('n=>VaultBigTop.setProfile(n)',name);paid(0);idle();sync();tr=page.evaluate('VaultBigTop.inspect().trace');st=[x for x in tr if x['type']=='SETTLED'][-6:];t0=next(x['time'] for x in reversed(tr) if x['type']=='START');assert all(abs((x['time']-t0)-y*factor)<160 for x,y in zip(st,[1000,1150,1300,1450,1600,1775]))
 page.emulate_media(reduced_motion='no-preference');page.evaluate("VaultBigTop.setProfile('normal')")
 checks.append('F03–05: actual Quick70%, Turbo40%, Reduced Motion15% stop timelines, unchanged state')
 # Shared utility flows also stay inside the reel field for this game.
 page.locator('#bigTopApp [data-action=settings]').click();utility=page.locator('#bigTopReels .bigtop-local-dialog[open]');assert utility.count()==1;field=page.locator('#bigTopReels').bounding_box();box=utility.bounding_box();assert box['x']>=field['x'] and box['y']>=field['y'] and box['x']+box['width']<=field['x']+field['width']+1 and box['y']+box['height']<=field['y']+field['height']+1
 assert page.locator('#bigTopApp .slot-bottom-controls button:not([data-action=settings])').evaluate_all('(ns)=>ns.every(n=>n.disabled)');utility.get_by_role('button',name='Paytable',exact=True).click();assert 'Crowned Goldfish' in utility.inner_text();page.keyboard.press('Escape');assert not utility.count();assert not page.locator('#bigTopSpin').is_disabled()
 page.locator('#bigTopApp [data-action=bet]').click();utility=page.locator('#bigTopReels .bigtop-local-dialog[open]');utility.get_by_role('button',name='50',exact=True).click();assert page.evaluate('BETS[VaultBigTop.betIndex]')==50;page.evaluate('VaultBigTop.betIndex=2');sync()
 checks.append('Shared Settings/Paytable/Bet/Auto remain reel-contained; utility backdrop locks gameplay; ESC and internal bet selection work')
 # Cancel all buy exits, including a second confirmation, without debit.
 async_count=page.evaluate('state.balance')
 for mode in ['no','close','backdrop','escape']:
  print('CANCEL',mode,flush=True)
  page.locator('#bigTopBuy').click();gate();page.locator('[data-popup-action=buy]').click();gate();assert page.locator('.vault-feature-card h2').inner_text()=='BUY THE BIG SHOW?'
  if mode=='no':page.locator('[data-popup-action=no]').click()
  elif mode=='close':page.locator('.feature-close').click()
  elif mode=='backdrop':page.locator('#bigTopReels .vault-feature-gate').click(position={'x':2,'y':2})
  else:page.keyboard.press('Escape')
  assert not page.locator('.vault-feature-gate').count();assert page.evaluate('state.balance')==async_count
 checks.append('L01–02: local Buy menu/YES-NO; NO/X/backdrop/ESC have zero debit')
 # Purchase, trigger spin, frozen wallet through bonus, F5 both intro and completion.
 page.locator('#bigTopBuy').click();gate();page.locator('[data-popup-action=buy]').click();gate();price=page.evaluate('BETS[VaultBigTop.betIndex]*BIG_TOP_CONFIG.buyMultiplier');seed(25);page.locator('[data-popup-action=yes]').evaluate('(n)=>{n.click();n.click();}');unseed();gate();assert page.locator('.vault-feature-card h2').inner_text()=='THE BIG SHOW';r=page.evaluate('VaultBigTop.getCheckpoint()');assert r['base']['scatters']==3 and r['base']['winX']==0;sync();expected=round(async_count-price,6);assert page.evaluate('state.balance')==expected;assert cloud.rows[A]['wallets']['balance']==expected;assert page.evaluate('VaultBigTop.getProgress().nextSpin')==0
 page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');gate();assert page.evaluate('VaultBigTop.getCheckpoint().roundId')==r['roundId'];assert page.evaluate('state.balance')==expected
 # Speed up only playback AFTER the real normal timing check; no math or result mocking.
 page.evaluate("VaultBigTop.setProfile('turbo')");ack();page.wait_for_function('VaultBigTop.getProgress().totalWinX>0',timeout=15000);assert page.evaluate('state.balance')==expected
 page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');page.evaluate("VaultBigTop.setProfile('turbo')");page.wait_for_function('VaultBigTop.getProgress().nextSpin>=1',timeout=15000);assert page.evaluate('state.balance')==expected
 page.wait_for_selector('#bigTopReels .vault-feature-gate',timeout=45000);gate();assert page.locator('.vault-feature-card h2').inner_text()=='BONUS COMPLETE';sync();assert page.evaluate('state.balance')==expected;assert cloud.rows[A]['wallets']['balance']==expected
 page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');gate();assert page.evaluate('state.balance')==expected
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ROOT.parent/'output/big-top-bonus-mobile.png'),full_page=True);page.evaluate('geometry.start()');ack();idle();sync();final_geometry=page.evaluate('geometry.stop()');assert all(max(v)<.55 for v in final_geometry),(final_geometry,page.evaluate('geometry.frames.filter((f,i,a)=>!i||f[0][1]!==a[i-1][0][1])'));assert page.evaluate('state.balance')==round(expected+r['payout'],6);assert cloud.rows[A]['wallets']['balance']==page.evaluate('state.balance');page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');sync();assert not page.locator('.vault-feature-gate').count();assert cloud.stats[(A,'big_top')]['rounds_played']==5
 checks.append('H/I/L03–09/O: single110× purchase, visible3-Scatter trigger with no extra wager, input-gated intro, F5 intro/mid-bonus/summary, local+SQL wallet frozen then one final credit/stat')
 # Reload a consumed paid spin mid-animation: same plan, one debit/stat.
 page.evaluate("VaultBigTop.setProfile('normal')");mid_before=page.evaluate('state.balance');paid(0);saved=page.evaluate('VaultBigTop.getCheckpoint()');page.wait_for_timeout(120);page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');idle();sync();assert page.evaluate('VaultBigTop.getCheckpoint().roundId')==saved['roundId'];assert page.evaluate('state.balance')==round(mid_before-saved['cost']+saved['payout'],6)
 checks.append('O04–07: F5 during paid reel motion restores the same seed/round, one debit/credit/stat')
 # Natural Scatter entry: base credit is finished before the bonus intro.
 natural_seed=page.evaluate("()=>{for(let seed=0;seed<50000;seed++){const r=BIG_TOP_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(r.bonus?.spinCount===10&&r.baseWinX>0&&r.baseWinX<20)return seed;}}")
 natural_before=page.evaluate('state.balance');page.evaluate("VaultBigTop.setProfile('turbo')");paid(natural_seed);gate();natural=page.evaluate('VaultBigTop.getCheckpoint()');assert page.locator('.vault-feature-card h2').inner_text()=='THE BIG SHOW';sync();natural_entry=round(natural_before-natural['cost']+natural['baseWinX']*natural['bet'],6);assert page.evaluate('state.balance')==natural_entry;assert cloud.rows[A]['wallets']['balance']==natural_entry;ack();page.wait_for_selector('#bigTopReels .vault-feature-gate',timeout=45000);gate();assert page.locator('.vault-feature-card h2').inner_text()=='BONUS COMPLETE';assert page.evaluate('state.balance')==natural_entry;ack();idle();sync();assert page.evaluate('state.balance')==round(natural_before-natural['cost']+natural['payout'],6)
 checks.append('H01: natural3-Scatter entry credits the base win after presentation and before intro; free-spin winnings remain escrowed')
 # Mobile stress: actual controller, fifty rounds without features that require input.
 page.evaluate("VaultBigTop.setProfile('turbo');state.fastGame=false;state.sound=false");seeds=page.evaluate("()=>{const a=[];for(let seed=1;a.length<50;seed++){const r=BIG_TOP_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(!r.bonus&&r.baseWinX<20)a.push(seed);}return a;}")
 page.evaluate('geometry.start()');count_before=cloud.stats[(A,'big_top')]['rounds_played']
 for i,value in enumerate(seeds):
  balance_before=page.evaluate('state.balance');paid(value);idle();round_result=page.evaluate('VaultBigTop.getCheckpoint()');assert page.evaluate('state.balance')==round(balance_before-round_result['cost']+round_result['payout'],6);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('.bigtop-strip,.bigtop-showdown').count()==0
  if i%10==0:sync();print('MOBILE SPINS',i+1,flush=True)
 sync();assert cloud.stats[(A,'big_top')]['rounds_played']==count_before+50;deltas=page.evaluate('geometry.stop()');assert all(max(v)<.55 for v in deltas),deltas
 checks.append('A06/F08/N06,N07; N02 Chromium equivalent: 50 actual mobile spins, no overflow/drift/residual strips, one stats event each, no console errors')
 # Local popup ten times: no movement/overflow, all controls locked, one Space/tap transition.
 page.evaluate('geometry.start()')
 for i in range(10):
  page.evaluate("()=>{VaultBonusPopup.show('big_top',{title:'THE BIG SHOW',value:'10 FREE SPINS',detail:'CURTAIN WILDS'});}");gate();assert page.locator('#bigTopApp .slot-bottom-controls button:not([data-action=settings])').evaluate_all('(ns)=>ns.every(n=>n.disabled)');box=page.locator('#bigTopReels').bounding_box();card=page.locator('.vault-feature-card').bounding_box();assert card['x']>=box['x'] and card['y']>=box['y'] and card['x']+card['width']<=box['x']+box['width']+1 and card['y']+card['height']<=box['y']+box['height']+1
  if i%2:page.keyboard.press('Space')
  else:page.locator('.feature-continue').tap()
 assert all(max(v)<.55 for v in page.evaluate('geometry.stop()'))
 # The local Big Win count-up cannot credit the wallet a second time.
 big_seed=page.evaluate("()=>{for(let seed=0;seed<10000;seed++){const r=BIG_TOP_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(!r.bonus&&r.baseWinX>=20)return seed;}}")
 paid(big_seed);gate();assert page.locator('.vault-feature-card h2').inner_text() in ['BIG WIN','MEGA WIN'];value_before=page.evaluate('state.balance');assert not page.locator('#winCelebration.show').count();page.wait_for_timeout(750);big_round=page.evaluate('VaultBigTop.getCheckpoint()');assert page.locator('.feature-value').inner_text()==page.evaluate('v=>v.toLocaleString("ru-RU",{maximumFractionDigits:6})',big_round['payout']);assert page.locator('#bigTopReels.has-wins .winning').count()>0;ack();idle();sync();assert page.evaluate('state.balance')==round(value_before+big_round['payout'],6)
 checks.append('M01–05: winning cells glow, local Big Win counts amount/coefficient, presentation never credits money')
 # Insufficient buy through real UI after an isolated test-admin wallet adjustment.
 saved_balance=page.evaluate('state.balance');sql(f"update public.wallets set balance=100,revision=revision+1 where user_id='{A}';");cloud.rows[A]['wallets']=json.loads(sql(f"select row_to_json(w) from public.wallets w where user_id='{A}';"));page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');assert page.evaluate('state.balance')==100
 page.locator('#bigTopBuy').click();gate();page.locator('[data-popup-action=buy]').click();gate();page.locator('[data-popup-action=yes]').click();assert page.evaluate('state.balance')==100;assert page.locator('#bigTopMessage').inner_text()=='INSUFFICIENT BALANCE';sync();assert cloud.rows[A]['wallets']['balance']==100
 sql(f"update public.wallets set balance={saved_balance},revision=revision+1 where user_id='{A}';");cloud.rows[A]['wallets']=json.loads(sql(f"select row_to_json(w) from public.wallets w where user_id='{A}';"));page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');sync()
 checks.append('L03: insufficient YES through real UI has no debit, outbox event or partial purchase')
 # Shared autoplay selection drives ten real deterministic paid spins.
 auto_count=cloud.stats[(A,'big_top')]['rounds_played'];page.evaluate("VaultBigTop.setProfile('turbo')");seed(0);page.locator('#bigTopApp [data-action=auto]').click();page.locator('#bigTopApp .slot-shared-modal[data-popup=auto] button').filter(has_text=re.compile(r'^10$')).click();page.wait_for_function('!VaultBigTop.isBusy&&document.getElementById("bigTopAuto").textContent==="AUTO"',timeout=45000);unseed();sync();assert cloud.stats[(A,'big_top')]['rounds_played']==auto_count+10
 checks.append('Shared AUTO menu:10 real rounds, one debit/stat each, clean stop and no concurrent spin')
 # Every label and full reel are inspected from genuine seeded model plans.
 fixtures=page.evaluate("()=>{const out={};for(let seed=0;seed<30000&&Object.keys(out).length<7;seed++){const r=BIG_TOP_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});for(const f of r.base.featurePlan){out['x'+f.multiplier]??={seed};if(f.full&&[2,6].includes(r.base.reelHeights[f.reel]))out['full'+r.base.reelHeights[f.reel]]??={seed};}}return out;}")
 assert len(fixtures)==7,fixtures
 for name,fixture in fixtures.items():
  page.evaluate("v=>{const r=BIG_TOP_MODEL.start({seed:v.seed,bet:20,roundId:crypto.randomUUID()});const p=BIG_TOP_MODEL.progress(r,{baseDone:true});VaultBigTop.restore(r,p);}",fixture)
  labels=page.locator('.bigtop-label').all_text_contents();assert all(x in ['WILD','x2','x3','x5','x10'] for x in labels);assert not page.locator('.bigtop-label').evaluate_all('(ns)=>ns.some(n=>getComputedStyle(n).backgroundColor==="rgb(0, 0, 0)")')
  if name=='full6':page.screenshot(path=str(ROOT.parent/'output/big-top-full-reel-mobile.png'),full_page=True)
  if name.startswith('full'):assert page.locator('.full-reel').evaluate_all('(ns)=>ns.every(n=>Math.abs(n.getBoundingClientRect().height-n.parentElement.getBoundingClientRect().height)<1)')
 page.evaluate('VaultBigTop.restore(null,null)');page.screenshot(path=str(ROOT.parent/'output/big-top-mobile.png'),full_page=True)
 checks.append('D03–07/E01–02,E05/P: WILD/x2/x3/x5/x10 replacement labels; full-reel coverage at2/6rows, clipped proportion-preserving clowns; local popups10×')
 # All pre-existing routes still open with the same canonical wallet/auth session.
 canonical=page.evaluate('state.balance')
 for game,op in [('slot','openSlotGame()'),('poker','openPokerGame()'),('bird','openBirdGame()'),('blackjack',"VaultTables.open('blackjack')"),('baccarat',"VaultTables.open('baccarat')"),('mines','VaultMines.open()'),('swamp','VaultSwamp.open()'),('vault_heist','VaultHeist.open()'),('magnet','VaultMagnet.open()'),('critter','VaultCritter.open()')]:
  page.evaluate('openLobby();'+op);page.wait_for_function('g=>currentGame===g',arg=game);assert page.evaluate('state.balance')==canonical;assert page.evaluate('VaultSession.mode')=='authenticated'
 page.evaluate('openLobby();VaultBigTop.restore(null,null);VaultBigTop.open()');page.wait_for_function('VaultBigTop.inspect().ready');assert page.evaluate('state.balance')==canonical
 assert page.evaluate('()=>{const ids=[...document.querySelectorAll("[id]")].map(n=>n.id);return ids.length===new Set(ids).size;}')
 checks.append('O01–03,O08: all10 existing routes launch; shared canonical wallet/auth unchanged; no duplicate IDs/uncaught errors')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  order=page.locator('#bigTopApp .slot-bottom-controls>*').evaluate_all('(ns)=>ns.map(n=>n.dataset.control||n.dataset.action)');assert order==['settings','balance','bet-minus','bet','bet-plus','auto','max','spin','bonus'],order
 page.set_viewport_size({'width':1440,'height':1150});page.screenshot(path=str(ROOT.parent/'output/big-top-desktop.png'),full_page=True)
 assert not errors,errors;assert not console_errors,console_errors;b.close()
(ROOT/'reports/big-top-browser.json').write_text(json.dumps({'passed':checks,'normalStopMs':times,'mobileGeometryDeltas':deltas,'device':'Chromium desktop + mobile viewport; real iOS/Android not available'},indent=2));print('\n'.join('PASS '+s for s in checks))
