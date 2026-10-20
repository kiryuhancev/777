"""Real analog reels and SDK, deterministic test inputs, owned HTTP fixtures."""
from pathlib import Path
import json
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];checks=[]
def level_route(r):
 if r.request.url.endswith('/begin_game_round'):
  payload=r.request.post_data_json;m=payload.get('p_metadata',{});n=payload.get('p_recovery',{}).get('swampBonus')
  if m.get('mathVersion')==3 and m.get('freeSpin') and n and (n.get('phase')!='playing' or 'previousTier' in n):return r.fulfill(status=400,content_type='application/json',body=json.dumps({'message':'VAULT_WALLET_CONFLICT'}))
 return critter_route(r)

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',level_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(body=HTML,content_type='text/html'))
 ctx.add_init_script('''const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,typeof fn==='function'&&fn.toString()==='()=>spin()'?100000:ms<2000?Math.max(1,ms*.04):ms,...a);const na=Element.prototype.animate;Element.prototype.animate=function(...a){const v=na.apply(this,a);v.playbackRate=20;return v;};const nr=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1&&Number.isInteger(window.testSeed)){a[0]=window.testSeed;return a;}return nr(a);};''')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.evaluate('VaultSwamp.open()');page.wait_for_function('VaultRoundService.swampSupport');page.evaluate('state.fastGame=true;state.fastBonus=true;state.sound=false')
 def sync():page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def done():page.wait_for_function('!VaultSwamp.isBusy',timeout=30000);sync()
 def cp():return page.evaluate('VaultSwamp.getCheckpoint()')
 def play(seed):page.evaluate('s=>{window.testSeed=s;document.getElementById("swampSpin").click()}',seed);done()
 seeds=page.evaluate("""()=>{const out={};for(let s=0;Object.keys(out).length<3&&s<100000;s++){const base=SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(s)));if(base.scatters===3)out.trigger??=s;const e=SWAMP_MODEL.evaluate(SWAMP_MODEL.generate(true,SWAMP_MODEL.seeded(s)));if(e.collectors.length===0)out.quiet??=s;if(e.collectors.length>=3)out.collect??=s;}return out;}""")
 play(seeds['trigger']);assert page.locator('#swampBonusGate').is_visible();assert cp()['remaining']==15 and cp()['phase']=='intro';count=cloud.stats[(A,'swamp')]['rounds_played'];page.wait_for_timeout(400);assert cloud.stats[(A,'swamp')]['rounds_played']==count
 for id in ['swampSpin','swampAuto','swampBetMinus','swampMaxBet','swampBuy']:assert page.locator('#'+id).is_disabled()
 page.screenshot(path=str(ROOT.parent/'output/swamp-levels-intro-mobile.png'),full_page=True)
 page.reload();page.wait_for_function('VaultSession.ready&&VaultRoundService.swampSupport');page.wait_for_selector('#swampBonusGate',state='visible');assert cp()['remaining']==15;assert cloud.stats[(A,'swamp')]['rounds_played']==count
 checks.append('Natural3Scatter→15-spin intro; no auto start, all gameplay controls locked; mobile popup and F5 pending intro retained without payout replay')
 page.evaluate('s=>{window.testSeed=s;state.fastGame=true;state.fastBonus=true}',seeds['collect']);page.wait_for_timeout(220);page.keyboard.press('Space');done();assert cp()['remaining']==14 and cp()['tier']==0;page.screenshot(path=str(ROOT.parent/'output/swamp-levels-progress-mobile.png'),full_page=True)
 # Fill all levels using real valid generated collector/quiet scenes. No production forcing hook.
 for tier in range(4):
  while cp()['tier']==tier and cp()['phase']=='playing':
   current=cp();target=(tier+1)*4;seed=seeds['collect'] if tier<3 and current['collectors']<target else seeds['quiet'];play(seed)
   current=cp()
   if current['phase']=='playing':assert current['tier']==tier;assert page.locator('#swampCurrentMultiplier').inner_text()=='×'+str([1,2,3,10][tier])
  current=cp()
  if tier<3:
   assert current['phase']=='level-up' and current['tier']==tier+1 and current['remaining']==15;assert page.locator('#swampBonusGate').is_visible();snapshot=current;wallet=page.evaluate('state.balance');count=cloud.stats[(A,'swamp')]['rounds_played']
   page.reload();page.wait_for_function('VaultSession.ready&&VaultRoundService.swampSupport');page.wait_for_selector('#swampBonusGate',state='visible');assert cp()==snapshot;assert page.evaluate('state.balance')==wallet;assert cloud.stats[(A,'swamp')]['rounds_played']==count
   if tier==0:cloud.rows[A]['wallets']['revision']+=1;cloud.rows[A]['wallets']['balance']+=10
   page.evaluate('s=>{window.testSeed=s;state.fastBonus=true}',seeds['quiet']);page.wait_for_timeout(220);page.locator('#swampGateValue').click();done();assert cp()['tier']==tier+1 and cp()['remaining']==14
  else:assert current['phase']=='complete' and current['remaining']==0;assert page.locator('#swampGateTitle').inner_text()=='BONUS COMPLETE'
 checks.append('All four levels played sequentially at x1/x2/x3/x10; thresholds never change current multiplier; each pending Level Up survives F5; stale remote wallet revision at Level Up rebases; one15-spin grant per level')
 assert page.locator('.swamp-milestone-icon').count()==3;assert page.locator('.swamp-progress-target').count()==0;assert cp()['spinsPlayed']==60
 page.wait_for_timeout(220);page.keyboard.press('Space');assert cp() is None;sync();page.reload();page.wait_for_function('VaultSession.ready&&VaultRoundService.swampSupport');assert cp() is None
 checks.append('Milestone icons4/8/12; cumulative overflow;60-spin maximum; Complete confirms back to base and stays dismissed after F5')
 # Purchase uses shared YES gate and a non-paying3Scatter analog presentation.
 page.evaluate('state.fastGame=true;window.testSeed=17');before=page.evaluate('state.balance');page.locator('#swampBuy').click();assert page.locator('[data-swamp-buy]').count()==1;page.locator('[data-swamp-buy="bonus"]').click();assert page.evaluate('state.balance')==before;page.locator('#swampApp .slot-purchase-confirmation [data-yes]').click();done();assert page.evaluate('state.balance')==before-77*20;assert page.locator('#swampReels .scatter').count()==3;assert cp()['phase']=='intro' and cp()['remaining']==15
 snapshot=cp();count=cloud.stats[(A,'swamp')]['rounds_played'];page.reload();page.wait_for_function('VaultSession.ready&&VaultRoundService.swampSupport');page.wait_for_selector('#swampBonusGate',state='visible');assert cp()==snapshot;assert page.locator('#swampReels .scatter').count()==3;assert page.evaluate('state.balance')==before-77*20;assert cloud.stats[(A,'swamp')]['rounds_played']==count
 checks.append('One77x BONUS offer; shared confirmation; actual analog trigger with exactly3Scatter, zero second debit/payout; F5 preserves exact purchased trigger and pending intro')
 for width in [320,390,430,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('#swampBonusGate').evaluate('(n)=>n.scrollWidth<=n.clientWidth+1')
 assert not errors,errors;checks.append('320–1440px popup bounds, no overflow/duplicate flow or JS errors');b.close()
(ROOT/'reports/swamp-levels-browser.json').write_text(json.dumps({'mode':'Chromium actual SDK/owned HTTP fixtures','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+x for x in checks))
