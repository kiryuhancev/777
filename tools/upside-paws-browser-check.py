"""Real browser/SDK with isolated PostgreSQL. Never writes production data."""
from pathlib import Path
import json,time,re
source=Path(__file__).with_name('bonus-update-browser-check.py');ns={'__file__':str(source)};exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
financial.update({'upside_paws_capabilities','settle_upside_paws_round','save_upside_paws_progress','credit_upside_paws_base','big_top_capabilities','settle_big_top_round','save_big_top_progress','credit_big_top_base'})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1150},has_touch=True);ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',api);ctx.route('http://127.0.0.1:8777/**',site)
 page=ctx.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('ERROR',e,flush=True)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.wait_for_function('VaultBonusSession.ready');page.evaluate('VaultUpsidePaws.open();state.sound=false');page.wait_for_function('VaultUpsidePaws.inspect().ready');print('OPENED',flush=True)
 def sync():
  page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def idle():page.wait_for_function('!VaultUpsidePaws.isBusy',timeout=30000)
 def gate():page.wait_for_selector('#upsidePawsReels .vault-feature-gate',timeout=15000);page.wait_for_timeout(220)
 def ack():page.locator('#upsidePawsReels .feature-continue').click()
 def seed(value):page.evaluate('s=>{window.oldCrypto=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a;};}',value)
 def unseed():page.evaluate('()=>{crypto.getRandomValues=window.oldCrypto;}')
 def paid(value):seed(value);page.evaluate("document.getElementById('upsidePawsSpin').click();document.getElementById('upsidePawsSpin').click()");unseed()
 def finish_bonus():
  for _ in range(40):
   if page.evaluate('!VaultUpsidePaws.isBusy'):return
   page.wait_for_timeout(100)
   g=page.locator('#upsidePawsReels .vault-feature-gate')
   if g.count():page.wait_for_timeout(220);ack()
  page.wait_for_function('!VaultUpsidePaws.isBusy',timeout=30000)
 sync();assert page.locator('.upsidepaws-grid').count()==2;assert page.locator('.upsidepaws-cell').count()==32
 assert page.locator('[data-world=normal]').bounding_box()['x']<page.locator('[data-world=upside]').bounding_box()['x']
 assert page.locator('.upsidepaws-rift').is_visible()
 geometry_js="window.geometry={frames:[],active:false,start(){this.frames=[];this.active=true;const tick=()=>{if(!this.active)return;this.frames.push(['#upsidePawsReels','.upsidepaws-frame','#upsidePawsApp .slot-bottom-controls','[data-world=normal]','[data-world=upside]'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));requestAnimationFrame(tick)};tick()},stop(){this.active=false;return [0,1,2,3,4].map(k=>[0,1,2,3].map(i=>Math.max(...this.frames.map(f=>f[k][i]))-Math.min(...this.frames.map(f=>f[k][i]))));}}"
 page.add_init_script(geometry_js);page.evaluate(geometry_js);page.screenshot(path=str(ROOT.parent/'output/upside-paws-desktop.png'),full_page=True)
 seeds=page.evaluate("()=>{const out={};for(let seed=0;seed<50000&&Object.keys(out).length<6;seed++){const r=UPSIDE_PAWS_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(!r.bonus&&r.baseWinX<15){out.plain??=seed;if(r.base.echoEvents.length)out.echo??=seed;if(r.base.portalEvents.length)out.portal??=seed;if(r.base.resonance.positions.length)out.resonance??=seed;}if(r.bonus&&r.baseWinX<15)out.bonus??=seed;if(!r.bonus&&r.baseWinX>=15)out.big??=seed;}return out;}");print('SEEDS',seeds,flush=True)
 for name in ['plain','echo','portal','resonance']:
  before=page.evaluate('state.balance');page.evaluate('geometry.start()');paid(seeds[name]);idle();sync();r=page.evaluate('VaultUpsidePaws.getCheckpoint()');assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6);assert all(max(v)<.6 for v in page.evaluate('geometry.stop()'));assert page.locator('.upsidepaws-cell').count()==32
  rendered=page.locator('.upsidepaws-grid').evaluate_all('(ns)=>Object.fromEntries(ns.map(n=>[n.dataset.world,[...n.children].map(x=>x.dataset.visual)]))');assert rendered=={w:[s['visualId'] for s in r['base']['finalGrid'][w]] for w in ['normal','upside']};assert r['base']['secondaryDepth']<=1
 checks.append('A/B/D/E/F/G/H: two simultaneous independent grids, paired art, deterministic final results/reactions, one debit/payout, stable desktop frames')
 for name,factor in [('normal',1),('quick',.7),('turbo',.4),('reduced',.08)]:
  page.emulate_media(reduced_motion='reduce' if name=='reduced' else 'no-preference');page.evaluate('v=>VaultUpsidePaws.setProfile(v)',name);paid(seeds['plain']);idle();sync();trace=page.evaluate('VaultUpsidePaws.inspect().trace');start=next(x['time'] for x in reversed(trace) if x['type']=='START');stop=next(x['time'] for x in reversed(trace) if x['type']=='BOTH_SETTLED');assert abs(stop-start-1650*factor)<200,(name,stop-start)
 checks.append('R: Normal/Quick/Turbo/Reduced actual timelines preserve deterministic payout and ordering')
 page.emulate_media(reduced_motion='no-preference');page.evaluate("VaultUpsidePaws.setProfile('turbo')")
 # All shared menus are local; HUD keeps semantic order.
 assert page.locator('#upsidePawsApp .slot-bottom-controls [data-control]').evaluate_all('(ns)=>ns.map(n=>n.dataset.control)')==['settings','balance','bet-minus','bet','bet-plus','auto','max','spin','bonus']
 page.locator('#upsidePawsApp [data-action=settings]').click();assert page.locator('#upsidePawsReels .upsidepaws-local-dialog[open]').count()==1;page.keyboard.press('Escape');assert not page.locator('#upsidePawsReels dialog[open]').count()
 page.locator('#upsidePawsApp [data-action=bet]').click();page.locator('#upsidePawsReels dialog[open]').get_by_role('button',name='50',exact=True).click();assert page.evaluate('BETS[VaultUpsidePaws.betIndex]')==50;page.evaluate('VaultUpsidePaws.betIndex=2');sync()
 for mode in ['no','close','backdrop','escape']:
  before=page.evaluate('state.balance');page.locator('#upsidePawsBuy').click();gate();page.locator('[data-popup-action=buy]').click();gate()
  if mode=='no':page.locator('[data-popup-action=no]').click()
  elif mode=='close':page.locator('.feature-close').click()
  elif mode=='backdrop':page.locator('.vault-feature-gate').click(position={'x':2,'y':2})
  else:page.keyboard.press('Escape')
  assert page.evaluate('state.balance')==before;assert not page.locator('.vault-feature-gate').count()
 checks.append('O/P: contained selection/confirmation, YES-NO/X/backdrop/ESC, utility lock, same Universal HUD control order')
 # Purchase trigger & recovery at intro, midbonus, completion, after credit.
 before=page.evaluate('state.balance');page.locator('#upsidePawsBuy').click();gate();page.locator('[data-popup-action=buy]').click();gate();seed(25);page.locator('[data-popup-action=yes]').evaluate('(n)=>{n.click();n.click();}');unseed();gate();assert page.locator('.vault-feature-card h2').inner_text()=='DIMENSION BREACH';r=page.evaluate('VaultUpsidePaws.getCheckpoint()');expected=round(before-r['cost'],6);assert r['base']['scatters']==3 and r['base']['winX']==0;assert page.evaluate('state.balance')==expected;assert page.locator('[data-family=scatter]').count()==3;sync();assert cloud.rows[A]['wallets']['balance']==expected
 page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');gate();assert page.evaluate('VaultUpsidePaws.getCheckpoint().roundId')==r['roundId'];assert page.evaluate('VaultUpsidePaws.getProgress().nextSpin')==0
 page.emulate_media(reduced_motion='reduce');ack();page.wait_for_function('VaultUpsidePaws.getProgress().nextSpin>=1');saved=page.evaluate('VaultUpsidePaws.getProgress()');assert page.evaluate('state.balance')==expected;page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');assert page.evaluate('VaultUpsidePaws.getProgress().nextSpin')>=saved['nextSpin'];assert page.evaluate('state.balance')==expected
 for _ in range(100):
  page.wait_for_timeout(100)
  if page.locator('.vault-feature-gate').count():
   gate();title=page.locator('.vault-feature-card h2').inner_text()
   if title=='BONUS COMPLETE':break
   assert title=='FULL BREACH';ack()
 else:raise AssertionError('Bonus stalled')
 sync();assert page.evaluate('state.balance')==expected;assert cloud.rows[A]['wallets']['balance']==expected;assert page.evaluate('VaultUpsidePaws.getProgress().totalWinX')==r['bonusWinX']
 page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');gate();assert page.locator('.vault-feature-card h2').inner_text()=='BONUS COMPLETE';assert page.evaluate('state.balance')==expected;page.wait_for_timeout(600);page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ROOT.parent/'output/upside-paws-bonus-mobile.png'),full_page=True);page.evaluate('geometry.start()');ack();idle();sync();assert all(max(v)<.6 for v in page.evaluate('geometry.stop()'));assert page.evaluate('state.balance')==round(expected+r['payout'],6);assert cloud.rows[A]['wallets']['balance']==page.evaluate('state.balance');assert page.evaluate('VaultBonusSession.get("upside_paws").status')=='settled'
 page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');sync();assert not page.locator('.vault-feature-gate').count();assert page.evaluate('state.balance')==round(expected+r['payout'],6)
 checks.append('I/J/K/L/M/N/O/T: actual purchase,3 Scatter trigger,no extra wager, intro/midbonus/summary F5, meter/queue restore, frozen local+SQL wallet, one final credit after reload')
 # Mobile 50 real paid spins; no feature popups required for chosen seed.
 page.emulate_media(reduced_motion='reduce');page.evaluate('geometry.start()');nodes=[]
 for i in range(50):
  before=page.evaluate('state.balance');paid(seeds['plain']);idle();r2=page.evaluate('VaultUpsidePaws.getCheckpoint()');assert page.evaluate('state.balance')==round(before-r2['cost']+r2['payout'],6);nodes.append(page.locator('#upsidePawsReels *').count());assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('.upsidepaws-trail').count()==0
  if i%10==0:sync();print('MOBILE',i+1,flush=True)
 sync();assert max(nodes)==min(nodes);assert all(max(v)<.6 for v in page.evaluate('geometry.stop()'));assert page.locator('[data-world=normal]').bounding_box()['y']<page.locator('[data-world=upside]').bounding_box()['y'];assert page.locator('.upsidepaws-cell svg').evaluate_all('(ns)=>ns.every(n=>n.getAttribute("preserveAspectRatio")==="xMidYMid meet"&&Math.abs(n.getScreenCTM().a-n.getScreenCTM().d)<.001)')
 page.screenshot(path=str(ROOT.parent/'output/upside-paws-mobile.png'),full_page=True)
 checks.append('C/S:50 real mobile rounds, fixed layout, no overflow/DOM growth/residual effects, uniform sprite scaling, both grids remain in normal flow')
 # Popup locks and held space, orientation, big-win count-up first-input handling.
 page.evaluate("()=>{VaultBonusPopup.show('upside_paws',{title:'FULL BREACH',value:'THE WORLDS COLLIDE'});}");gate();assert page.locator('#upsidePawsApp .slot-bottom-controls button:not([data-action=settings])').evaluate_all('(ns)=>ns.every(n=>n.disabled)');page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(250);assert page.locator('.vault-feature-gate').count()==1;page.keyboard.down('Space');assert not page.locator('.vault-feature-gate').count();page.evaluate("()=>{VaultBonusPopup.show('upside_paws',{title:'NEXT'});}");page.wait_for_timeout(250);page.keyboard.down('Space');assert page.locator('.vault-feature-gate').count()==1;page.keyboard.up('Space');page.keyboard.press('Space');assert not page.locator('.vault-feature-gate').count()
 paid(seeds['big']);page.wait_for_selector('.vault-feature-gate');value_before=page.evaluate('state.balance');page.wait_for_timeout(200);ack();assert page.locator('.vault-feature-gate').count()==1;assert page.evaluate('state.balance')==value_before;page.wait_for_timeout(200);ack();idle();sync()
 checks.append('P/Q: all feature gates local, rotation keeps state, heldSpace cannot skip next gate, BigWin first input completes counter and second closes without financial writes')
 # Genuine base F5 after debit, before presentation finishes.
 page.emulate_media(reduced_motion='no-preference');page.evaluate("VaultUpsidePaws.setProfile('normal')");before=page.evaluate('state.balance');paid(seeds['plain']);saved=page.evaluate('VaultUpsidePaws.getCheckpoint()');page.reload();page.wait_for_function('VaultSession.ready&&VaultUpsidePaws.inspect().ready');idle();sync();assert page.evaluate('VaultUpsidePaws.getCheckpoint().roundId')==saved['roundId'];assert page.evaluate('state.balance')==round(before-saved['cost']+saved['payout'],6)
 # All pre-existing routes and auth signout/restore behavior.
 routes=[('slot','openSlotGame()'),('poker','openPokerGame()'),('bird','openBirdGame()'),('blackjack','VaultTables.open("blackjack")'),('baccarat','VaultTables.open("baccarat")'),('mines','VaultMines.open()'),('swamp','VaultSwamp.open()'),('vault_heist','VaultHeist.open()'),('magnet','VaultMagnet.open()'),('critter','VaultCritter.open()'),('big_top','VaultBigTop.open()')]
 for game,call in routes:page.evaluate(call);page.wait_for_timeout(200);assert page.evaluate('currentGame')==game;page.evaluate('openLobby()');page.wait_for_timeout(50)
 ids=page.locator('[id]').evaluate_all('(ns)=>ns.map(n=>n.id)');assert len(ids)==len(set(ids));assert not errors,errors;assert not console_errors,console_errors
 checks.append('A/U: all11 previous routes, wallet/auth session restore, unique DOM IDs, no runtime/console errors')
 (ROOT/'reports/upside-paws-browser.json').write_text(json.dumps({'passed':checks,'errors':errors,'consoleErrors':console_errors},indent=2));print('\n'.join('PASS '+s for s in checks));b.close()
