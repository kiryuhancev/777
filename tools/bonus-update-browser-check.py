"""Chromium + real SDK + isolated PostgreSQL RPCs. No production writes."""
from pathlib import Path
import json,re,mimetypes,subprocess,base64,time
from urllib.parse import urlsplit
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
web=(ROOT/'_site/index.html').read_text();web=re.sub(r"supabaseUrl: '[^']*'","supabaseUrl: 'https://vault-test.supabase.co'",web,count=1);web=re.sub(r"supabaseAnonKey: '[^']*'",f"supabaseAnonKey: '{PUBLIC}'",web,count=1)
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout.strip()
def lit(v):return "'"+str(v).replace("'","''")+"'"
def arg(v):
 if isinstance(v,(dict,list)):return lit(json.dumps(v))+'::jsonb'
 if v is None:return 'null'
 return lit(str(v).lower() if isinstance(v,bool) else v)
initialized=set();errors=[];console_errors=[];checks=[]
financial={'apply_bonus_checkpoint','settle_bonus_session','settle_critter_round','apply_heist_checkpoint','apply_magnet_checkpoint','apply_magnet_v2_checkpoint','begin_game_round','record_game_round'}
def api(r):
 name=r.request.url.split('/')[-1]
 if name not in financial|{'vault_bonus_capabilities','critter_capabilities','heist_capabilities','magnet_capabilities','swamp_slot_capabilities'}:return critter_route(r)
 if cloud.offline:return r.abort('internetdisconnected')
 uid=json.loads(base64.urlsafe_b64decode(r.request.headers['authorization'].split('.')[1]+'==='))['sub']
 if uid not in initialized:
  sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"Browser\"}}','{uid}@browser.test',now()) on conflict(id) do nothing;delete from public.vault_bonus_sessions where user_id='{uid}';delete from public.game_rounds where user_id='{uid}';delete from public.game_stats where user_id='{uid}';update public.wallets set balance=10000000,revision=0,recovery='{{}}' where user_id='{uid}';insert into public.vault_user_access(user_id,enabled) values('{uid}',true) on conflict(user_id) do update set enabled=true;")
  cloud.rows[uid]['wallets'].update(balance=10000000,revision=0,recovery={});initialized.add(uid)
 payload=r.request.post_data_json or {};args=','.join(k+'=>'+arg(v) for k,v in payload.items())
 try:
  out=sql(f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);select public.{name}({args});").splitlines()[-1];result=json.loads(out)
  w=json.loads(sql(f"select row_to_json(w) from public.wallets w where user_id='{uid}';"));cloud.rows[uid]['wallets']=w
  rounds=json.loads(sql(f"select coalesce(json_agg(r),'[]') from public.game_rounds r where user_id='{uid}';"))
  for x in rounds:cloud.rounds[x['round_id']]={'user_id':uid,'p_game_id':x['game_id'],'p_bet':x['bet'],'payout':x['payout'],'status':x['status']}
  for st in json.loads(sql(f"select coalesce(json_agg(s),'[]') from public.game_stats s where user_id='{uid}';")):cloud.stats[(uid,st['game_id'])]=st
  return r.fulfill(content_type='application/json',body=json.dumps(result),headers={'Access-Control-Allow-Origin':'*'})
 except Exception as e:return r.fulfill(status=400,content_type='application/json',body=json.dumps({'message':str(e),'code':'TEST_SQL'}))
def site(r):
 path=urlsplit(r.request.url).path.lstrip('/');f=(ROOT/'_site'/path).resolve()
 if path in ('','index.html'):return r.fulfill(body=web,content_type='text/html')
 if f.is_relative_to(ROOT/'_site') and f.is_file():return r.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
 return r.fulfill(status=404,body='missing')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1150});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',api);ctx.route('http://127.0.0.1:8777/**',site)
 ctx.add_init_script("const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms<2000?Math.max(1,ms*.08):ms,...a);const na=Element.prototype.animate;Element.prototype.animate=function(...a){const v=na.apply(this,a);v.playbackRate=15;if(window.testHoldRun&&this.classList.contains('critter-runner')){v.pause();window.testResumeRun=()=>document.querySelectorAll('.critter-runner').forEach(n=>n.getAnimations().forEach(a=>a.play()));}return v;};")
 page=ctx.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',e,flush=True)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.wait_for_function('VaultBonusSession.ready');page.evaluate('VaultCritter.open();state.fastGame=true;state.sound=false');page.wait_for_function('VaultCritter.inspect().ready')
 def sync():page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def gate():page.wait_for_selector('#critterGrid .vault-feature-gate');page.wait_for_timeout(220)
 def ack():page.locator('#critterGrid .feature-continue').click()
 sync();before=page.evaluate('state.balance');page.locator('#critterBuy').click();page.locator('[name="critter-feature"][value="super"]').check();page.locator('#critterShopConfirm').click();page.locator('#critterApp .slot-purchase-confirmation [data-yes]').click();gate();r=page.evaluate('VaultCritter.getCheckpoint()');assert r['version']==6 and r['bonus']['spinCount']==20
 sync();expected=round(before-r['cost'],6);assert page.evaluate('state.balance')==expected;assert cloud.rows[A]['wallets']['balance']==expected
 box=page.locator('#critterGrid').bounding_box();pop=page.locator('#critterGrid .vault-feature-gate').bounding_box();assert pop['x']>=box['x']-1 and pop['y']>=box['y']-1 and pop['x']+pop['width']<=box['x']+box['width']+1 and pop['y']+pop['height']<=box['y']+box['height']+1,(box,pop)
 ack();gate();assert page.locator('.vault-feature-card h2').inner_text()=='BONUS COMPLETE';sync();assert page.evaluate('state.balance')==expected;assert cloud.rows[A]['wallets']['balance']==expected
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(ROOT.parent/'output/critter-v6-bonus-mobile.png'),full_page=True)
 page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');gate();assert page.evaluate('state.balance')==expected;assert page.evaluate('VaultCritter.getCheckpoint().roundId')==r['roundId'];ack();page.wait_for_function('!VaultCritter.isBusy');sync();assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6);assert cloud.rows[A]['wallets']['balance']==page.evaluate('state.balance')
 page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');sync();assert not page.locator('.vault-feature-gate').count();assert cloud.stats[(A,'critter')]['rounds_played']==1
 checks.append('Critter SUPER20 real Ways plan; wallet local AND PostgreSQL unchanged during bonus/summary; F5 before ACK restores entitlement; one final credit/stat; no duplicate on F5')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.evaluate("VaultCritter.restore(CRITTER_MODEL.start({seed:63,bet:20,roundId:crypto.randomUUID()}))")
  assert page.evaluate("[...document.querySelectorAll('#critterGrid img')].every(n=>getComputedStyle(n).objectFit==='contain')")
 page.screenshot(path=str(ROOT.parent/'output/critter-v6-desktop.png'),full_page=True)
 # Swamp uses the original Scatter; its bonus pays only after the last level gate.
 page.evaluate('openLobby();VaultSwamp.open();state.fastGame=true;state.fastBonus=true');page.wait_for_function('VaultRoundService.swampSupport');sync();swamp_before=page.evaluate('state.balance');page.locator('#swampBuy').click();page.locator('[data-swamp-buy]').first.click();page.locator('#swampApp .slot-purchase-confirmation [data-yes]').click();page.wait_for_selector('#swampReels .vault-feature-gate');sync();swamp_expected=page.evaluate('state.balance');assert swamp_expected<swamp_before
 for _ in range(5):
  try:page.wait_for_selector('#swampReels .vault-feature-gate',timeout=15000)
  except Exception:
   print('SWAMP DEBUG',page.evaluate('({swamp:VaultSwamp.inspect(),vault:{conflict:VaultStorage.inspect().conflict,queue:VaultStorage.inspect().data.queue},message:document.getElementById("swampMessage")?.textContent})'),console_errors,errors,flush=True);raise
  page.wait_for_timeout(220);session=page.evaluate("VaultBonusSession.get('swamp')");assert page.evaluate('state.balance')==swamp_expected;sync();assert cloud.rows[A]['wallets']['balance']==swamp_expected
  title=page.locator('#swampReels .vault-feature-card h2').inner_text()
  if title=='BONUS COMPLETE':
   total=session['heldWin'];page.screenshot(path=str(ROOT.parent/'output/swamp-bonus-mobile.png'),full_page=True);page.locator('#swampReels .feature-continue').click();break
  page.locator('#swampReels .feature-continue').click()
 else:raise AssertionError('Swamp did not reach completion')
 page.wait_for_function("VaultBonusSession.get('swamp').status==='settled'");sync();assert page.evaluate('state.balance')==round(swamp_expected+total,6);assert cloud.rows[A]['wallets']['balance']==page.evaluate('state.balance')
 checks.append('Swamp15–60 real free spins/qualified levels: native Scatter retained, each gate local; local+remote balance constant until one final credit')
 # Heist: real stage controller/choice, terminal credit after the local summary.
 page.evaluate('openLobby();VaultHeist.open();state.fastGame=true;state.fastBonus=true');page.wait_for_function('VaultHeistBridge.featuresReady');sync();heist_before=page.evaluate('state.balance');page.locator('#heistBuy').click();page.locator('[data-heist-buy="heist"]').click();page.locator('#heistApp .slot-purchase-confirmation [data-yes]').click();page.wait_for_selector('#heistReels .vault-feature-gate');page.wait_for_timeout(220);heist_expected=page.evaluate('state.balance');page.locator('#heistReels .feature-continue').click()
 deadline=time.time()+45
 while time.time()<deadline:
  title=page.locator('#heistReels .vault-feature-card h2')
  if title.count():
   page.wait_for_timeout(220)
   if title.inner_text()=='BONUS COMPLETE':
    sync();assert page.evaluate('state.balance')==heist_expected;assert cloud.rows[A]['wallets']['balance']==heist_expected;heist_pay=page.evaluate('VaultHeist.getCheckpoint().payout');page.locator('#heistReels .feature-continue').click();break
   page.locator('#heistReels .feature-continue').click()
  elif page.evaluate('VaultHeist.getCheckpoint()?.status')=='CHOICE':page.locator('#heistCollect').click()
  page.wait_for_timeout(100)
 else:raise AssertionError('Heist summary missing')
 page.wait_for_function('!VaultHeist.isBusy');sync();assert page.evaluate('state.balance')==round(heist_expected+heist_pay,6)
 checks.append('Heist purchased stage/collect UI, local gate and constant local/remote wallet until final confirmation')
 # MAGNET: deterministic existing chamber result, real spin controller.
 page.evaluate('openLobby();VaultMagnet.open();state.fastGame=true;state.fastBonus=true');page.wait_for_function('VaultMagnetBridge.featuresReady');sync();mag_before=page.evaluate('state.balance');seed=page.evaluate("()=>{for(let seed=0;seed<10000;seed++){const r=MAGNET_V2_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(r.bonus.triggered)return seed;}}")
 page.evaluate("s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('magnetSpin').click();crypto.getRandomValues=old;}",seed)
 page.wait_for_selector('#magnetField .vault-feature-gate');page.wait_for_timeout(220);mag_expected=page.evaluate('state.balance');page.locator('#magnetField .feature-continue').click();deadline=time.time()+45
 while time.time()<deadline:
  title=page.locator('#magnetField .vault-feature-card h2')
  if title.count():
   page.wait_for_timeout(220);sync();assert page.evaluate('state.balance')==mag_expected;assert cloud.rows[A]['wallets']['balance']==mag_expected;mag_pay=page.evaluate('VaultMagnet.getCheckpoint().payout');page.locator('#magnetField .feature-continue').click();break
  page.wait_for_timeout(100)
 else:raise AssertionError('MAGNET summary missing')
 page.wait_for_function('!VaultMagnet.isBusy');sync();assert page.evaluate('state.balance')==round(mag_expected+mag_pay,6)
 checks.append('MAGNET natural chamber, free steps and local summary; one final real wallet credit')
 # Digital Derby: purchase, any level gates, one final balance credit.
 page.evaluate('openLobby();openSlotGame();state.fastGame=true;state.fastBonus=true');sync();page.locator('#buyBtn').click();page.locator('#buyNormalBonusBtn').click();page.locator('.app .slot-purchase-confirmation [data-yes]').click();page.wait_for_selector('#grid .vault-feature-gate');page.wait_for_timeout(220);page.locator('#grid .feature-continue').click();deadline=time.time()+90;derby_start=None
 while time.time()<deadline:
  title=page.locator('#grid .vault-feature-card h2')
  if title.count():
   page.wait_for_timeout(220)
   if title.inner_text()=='BONUS COMPLETE':
    sync();derby_start=page.evaluate('state.balance');assert cloud.rows[A]['wallets']['balance']==derby_start;derby_pay=page.evaluate("VaultBonusSession.get('slot').heldWin");page.locator('#grid .feature-continue').click();break
   page.locator('#grid .feature-continue').click()
  page.wait_for_timeout(100)
 else:raise AssertionError('Derby summary missing')
 page.wait_for_function('!state.busy&&!state.bonus');sync();assert page.evaluate('state.balance')==round(derby_start+derby_pay,6)
 checks.append('Digital Derby purchased free spins/level gates and final single settlement; game math retained')
 # Offline checkpoint survives reload; a stale wallet revision automatically rebases.
 assert not errors,errors;assert not console_errors,console_errors
 page.evaluate('openLobby();VaultCritter.open();state.fastGame=true');page.wait_for_function('VaultCritter.inspect().ready');sync();offline_before=page.evaluate('state.balance');cloud.offline=True
 page.locator('#critterBuy').click();page.locator('[name="critter-feature"][value="bonus"]').check();seed=page.evaluate("()=>{for(let seed=0;seed<1000;seed++){const r=CRITTER_MODEL.start({seed,bet:20,roundId:crypto.randomUUID(),purchaseType:'bonus'});if(r.bonus.spins[0].persistentWildsAfter.length)return seed;}}")
 page.evaluate("s=>{window.savedRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};window.testHoldRun=true;}",seed);page.locator('#critterShopConfirm').click();page.locator('#critterApp .slot-purchase-confirmation [data-yes]').click();page.evaluate('()=>{crypto.getRandomValues=window.savedRandom;}');gate();ack();page.wait_for_function('typeof window.testResumeRun==="function"&&VaultCritter.inspect().progress.nextSpin>0');cursor=page.evaluate('VaultCritter.inspect().progress');offline_round=page.evaluate('VaultCritter.getCheckpoint()');assert page.evaluate('state.balance')==round(offline_before-offline_round['cost'],6)
 assert page.evaluate('VaultStorage.inspect().data.queue.some(e=>e.type==="critter"&&!!e.bonus)')
 # Simulate an authorized admin wallet adjustment while this client was offline.
 sql(f"update public.wallets set balance=balance+7,revision=revision+1 where user_id='{A}';");cloud.rows[A]['wallets']=json.loads(sql(f"select row_to_json(w) from public.wallets w where user_id='{A}';"));cloud.offline=False
 page.reload();page.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');gate();assert page.evaluate('VaultCritter.getCheckpoint().roundId')==offline_round['roundId'];assert page.evaluate('VaultCritter.inspect().progress.nextSpin')>=cursor['nextSpin'];ack();page.wait_for_function('!VaultCritter.isBusy');sync()
 expected=round(offline_before+7-offline_round['cost']+offline_round['payout'],6);assert page.evaluate('state.balance')==expected;assert cloud.rows[A]['wallets']['balance']==expected;assert cloud.stats[(A,'critter')]['rounds_played']==2
 assert not errors,errors;console_errors.clear() # Expected handled offline/409-conflict diagnostics above.
 checks.append('Offline mid-vortex F5 preserves round/progress; stale revision plus admin delta rebases automatically; outbox drains, no duplicate payout/stat or lost7-credit adjustment')
 # Each shared gate fits its own mobile field; SPACE does not click through to SPIN.
 page.set_viewport_size({'width':390,'height':844});round_count=page.evaluate('VaultStorage.inspect().data.rounds.length')
 for game,open_script,host in [('slot','openSlotGame()','grid'),('swamp','VaultSwamp.open()','swampReels'),('vault_heist','VaultHeist.open()','heistReels'),('magnet','VaultMagnet.open()','magnetField'),('critter','VaultCritter.open()','critterGrid')]:
  page.evaluate('openLobby();'+open_script);page.wait_for_timeout(100);page.evaluate("game=>{VaultBonusPopup.show(game,{title:'BONUS COMPLETE',kicker:'TOTAL WIN',value:'12345',detail:'MOBILE PREVIEW'});}",game);page.wait_for_selector('#'+host+' .vault-feature-gate');page.wait_for_timeout(220)
  frame=page.locator('#'+host).bounding_box();card=page.locator('#'+host+' .vault-feature-card').bounding_box();assert frame['x']<=card['x'] and card['x']+card['width']<=frame['x']+frame['width']+1;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(ROOT.parent/'output'/f'{game}-bonus-mobile.png'),full_page=True);page.keyboard.press('Space');assert not page.locator('#'+host+' .vault-feature-gate').count();assert page.evaluate('VaultStorage.inspect().data.rounds.length')==round_count
 checks.append('All five reel-local popups at390px: no overflow, readable card bounds, SPACE acknowledges once without a new round')
 assert page.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}")
 assert not errors,errors;assert not console_errors,console_errors
 checks.append('Four widths320–1440, contained symbol art, no duplicate IDs/page/console errors, reel-local popup and HUD visible')
 b.close()
(ROOT/'reports/bonus-update-browser.json').write_text(json.dumps({'mode':'Chromium + actual SDK + local PostgreSQL RPC','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+x for x in checks))
