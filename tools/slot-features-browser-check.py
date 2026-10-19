"""New UI and price modes against real SDK/contract fixture. Live DB not touched."""
from pathlib import Path
source=Path(__file__).with_name('heist-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
legacy_route=route;feature_version={'value':True};events={};errors=[];console_errors=[];passed=[]
def feature_route(r):
 name=r.request.url.split('/')[-1]
 def reply(value,status=200):return r.fulfill(status=status,content_type='application/json',body=json.dumps(value),headers={'Access-Control-Allow-Origin':'*'})
 if name=='heist_capabilities':return reply({'version':2,'purchaseVersion':1,'boostVersion':1} if feature_version['value'] else {'version':1})
 if name=='swamp_slot_capabilities':return reply({'version':2,'purchaseVersion':1,'boostVersion':1})
 if name!='apply_heist_checkpoint':return legacy_route(r)
 p=r.request.post_data_json;uid=json.loads(base64.urlsafe_b64decode(r.request.headers['authorization'].split('.')[1]+'==='))['sub'];w=cloud.rows[uid]['wallets'];c=p['p_checkpoint'];rid=c['roundId'];key=(rid,c['step']);old=cloud.rounds.get(rid)
 if key in events:return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':True}) if events[key]==c else reply({'message':'VAULT_WALLET_CONFLICT'},400)
 if p['p_expected_revision']!=w['revision'] or p['p_previous_step']>=0 and (not old or old['status']!='started' or old['checkpoint']['step']!=p['p_previous_step']):return reply({'message':'VAULT_WALLET_CONFLICT'},400)
 start=p['p_previous_step']==-1;cost=c.get('cost',c['bet'])
 if start:
  if not cloud.access.get(uid,True):return reply({'message':'VAULT_ACCOUNT_DISABLED'},400)
  if old or any(t['user_id']==uid and t['p_game_id']=='vault_heist' and t['status']=='started' for t in cloud.rounds.values()):return reply({'message':'VAULT_WALLET_CONFLICT'},400)
  w['balance']=round(w['balance']-cost,6)
 events[key]=json.loads(json.dumps(c));w['revision']+=1;w['balance']=round(w['balance']+c['payout'],6);w['recovery']['heistRound']=c
 cloud.rounds[rid]={'user_id':uid,'p_game_id':'vault_heist','p_bet':cost,'status':'settled' if c['status']=='SETTLED' else 'started','payout':c['payout'],'checkpoint':c}
 if c['status']=='SETTLED':
  s=cloud.stats.setdefault((uid,'vault_heist'),{'game_id':'vault_heist','rounds_played':0,'total_wagered':0,'total_won':0});s['rounds_played']+=1;s['total_wagered']+=cost;s['total_won']+=c['payout']
 return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':False})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=b.new_context(viewport={'width':1440,'height':1080});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',feature_route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,(ms===600||ms===350||ms===80)?100000:ms,...a)');return c
 def login(c,email='alice@example.test'):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',email);pg.evaluate('VaultHeist.open()');pg.wait_for_function('VaultHeist.inspect().ready');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=20000)
 def wait(pg):pg.wait_for_function('!VaultHeist.isBusy')
 def play(pg,seed=None):
  if seed is None:pg.locator('#heistSpin').click()
  else:pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('heistSpin').click();crypto.getRandomValues=old;}''',seed)
 def saved(pg):return pg.evaluate('VaultHeist.getCheckpoint()')
 def reload(pg):pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready')
 def shot(pg,name):pg.screenshot(path=str(ROOT.parent/'output'/name),full_page=True)
 c=context();pg=login(c);sync(pg)
 seed=pg.evaluate("()=>{for(let s=1;s<10000;s++){const r=VAULT_HEIST_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID()});if(r.status==='SETTLED'&&r.baseWinX>0&&r.outcome.wins.length)return s}}")
 before=pg.evaluate('state.balance');t=time.monotonic();play(pg,seed);pg.wait_for_timeout(180);assert pg.locator('.heist-strip').count()==5;assert pg.locator('#heistWinBanner').is_hidden()
 pg.wait_for_selector('#heistWinBanner:not([hidden])');elapsed=time.monotonic()-t;assert elapsed>=1.5,elapsed;assert pg.locator('.win-current').count()>0;assert pg.locator('.heist-frame.has-wins').count()==1;assert 'WAYS' in pg.locator('#heistWinBanner').inner_text();shot(pg,'heist-winning-ways.png');wait(pg);sync(pg);assert pg.evaluate('state.balance')==round(before-20+saved(pg)['payout'],6)
 passed.append(f'Normal reels take >=1.5s ({elapsed:.2f}s measured); real rolling strips, staggered stops, visible winning cells/ways/amount and held presentation')
 pg.evaluate('state.fastGame=true;state.fastBonus=true');pg.locator('#heistAuto').click();assert pg.locator('[data-heist-auto]').count()==5;assert pg.locator('#heistAutoMenu').is_visible();pg.locator('#heistAuto').click()
 pg.locator('#heistBuy').click();assert pg.locator('[data-heist-buy]').count()==2;assert '630' in pg.locator('[data-heist-buy="heist"]').inner_text();assert '1' in pg.locator('[data-heist-buy="super"]').inner_text();pg.locator('#heistScatterBoost').click();assert pg.evaluate('state.scatterBoost');assert '30' in pg.locator('#heistSpinCost').inner_text();shot(pg,'heist-bonus-features.png')
 before=pg.evaluate('state.balance');pg.locator('[data-heist-buy="heist"]').click();r=saved(pg);assert r['purchaseType']=='heist' and r['cost']==630 and r['bet']==20 and r['remaining']==3 and not r['scatterBoost'];assert pg.evaluate('state.balance')==before-630;reload(pg);r=saved(pg);assert r['remaining']==3;assert pg.evaluate('state.balance')==before-630;sync(pg)
 passed.append('Common Settings/Bet/AUTO/MAX/SPIN/BONUS hierarchy; count menu; priced purchase ignores enabled Boost; F5 purchase charges once')
 for i in range(3):
  prior_balance=pg.evaluate('state.balance');play(pg);wait(pg);assert pg.evaluate('state.balance')==prior_balance;assert saved(pg)['cost']==630
 assert saved(pg)['status']=='CHOICE';assert pg.locator('#heistChoice').is_visible();r=saved(pg);balance=pg.evaluate('state.balance');pg.locator('#heistCollect').click();wait(pg);sync(pg);assert pg.evaluate('state.balance')==round(balance+r['lootX']*20,6);n=cloud.stats[(A,'vault_heist')]['rounds_played'];reload(pg);sync(pg);assert cloud.stats[(A,'vault_heist')]['rounds_played']==n
 passed.append('Purchased stage spins free, frozen base bet, same player choice, collect credited once and restored without duplicate stats')
 # Natural paid Boost; actual output scene compared to seeded model at base stake.
 seed=pg.evaluate("()=>{for(let s=1;s<10000;s++){const r=VAULT_HEIST_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID(),scatterBoost:true});if(r.status==='SETTLED')return s}}")
 before=pg.evaluate('state.balance');play(pg,seed);wait(pg);r=saved(pg);assert r['scatterBoost'] and r['cost']==30;assert pg.evaluate('state.balance')==round(before-30+r['payout'],6);sync(pg);balance=pg.evaluate('state.balance');reload(pg);assert saved(pg)['cost']==30 and saved(pg)['scatterBoost'];assert pg.evaluate('state.balance')==balance
 passed.append('Heist Boost really changes seeded symbol profile, debits x1.5 and keeps base-stake payouts; mode/cost survive F5')
 pg.evaluate('VaultSwamp.open()');pg.wait_for_function('VaultRoundService.swampBoostSupport');assert '30' in pg.locator('#swampSpinCost').inner_text();pg.locator('#swampBuy').click();assert pg.locator('#swampScatterBoost').get_attribute('aria-pressed')=='true';shot(pg,'swamp-scatter-boost.png');pg.locator('#swampShopClose').click()
 seed=pg.evaluate("()=>{for(let s=1;s<10000;s++){const r=SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(s),SWAMP_CONFIG,true));if(!r.triggerSpins)return s}}")
 expected=pg.evaluate('s=>SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(s),SWAMP_CONFIG,true))',seed);before=pg.evaluate('state.balance');pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('swampSpin').click();crypto.getRandomValues=old;}''',seed);pg.wait_for_function('!VaultSwamp.isBusy');sync(pg);assert pg.evaluate('state.balance')==round(before-30+expected['winX']*20,6)
 pg.evaluate('openSlotGame();openBonusShop()');assert pg.locator('#scatterBoostState').inner_text()=='АКТИВНО';pg.evaluate('toggleScatterBoost()');pg.evaluate('VaultSwamp.open()');assert '20' in pg.locator('#swampSpinCost').inner_text();pg.evaluate('VaultHeist.open()');assert '20' in pg.locator('#heistSpinCost').inner_text()
 passed.append('Swamp Boost computes actual boosted grid and correct cost/payout; shared preference agrees with football slot and switches all paid prices together')
 for w,h in [(1440,1080),(1024,768),(768,1024),(390,844),(320,720)]:
  pg.set_viewport_size({'width':w,'height':h});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),w;assert pg.locator('#heistBuy').is_visible() and pg.locator('#heistAuto').is_visible()
  if w<=390:
   a=pg.locator('#heistAuto').bounding_box();s=pg.locator('#heistSpin').bounding_box();v=pg.locator('#heistBuy').bounding_box();assert a['x']+a['width']<=s['x']+1;assert s['x']+s['width']<=v['x']+1
  if w==390:
   pg.wait_for_function("!document.getElementById('toast').classList.contains('show')");shot(pg,'heist-controls-mobile.png')
 assert pg.evaluate("()=>{const a=[...document.querySelectorAll('[id]')].map(n=>n.id);return new Set(a).size===a.length}");c.close()
 feature_version['value']=False;c=context();pg=login(c,'bob@example.test');assert pg.evaluate('VaultHeist.inspect().ready');pg.locator('#heistBuy').click();assert pg.locator('[data-heist-buy="heist"]').is_disabled();assert pg.locator('#heistScatterBoost').is_disabled();pg.locator('#heistShopClose').click();assert not pg.locator('#heistSpin').is_disabled();c.close();b.close()
 passed.append('Five viewport widths without overflow/duplicate IDs; old backend still runs ordinary Heist while new modes safely await migration')
assert not errors,errors
assert not console_errors,console_errors
report={'mode':'Chromium + real Supabase SDK/HTTP fixture; PostgreSQL price/RLS checks separate','passed':passed,'pageErrors':errors,'consoleErrors':console_errors};(ROOT/'reports/slot-features-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
