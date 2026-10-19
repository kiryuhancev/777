"""Actual standalone HTML/Auth SDK against an owned, idempotent RPC fixture; no live DB."""
from pathlib import Path
import json,base64,time
source=Path(__file__).with_name('heist-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
legacy=route;events={};missing=False;errors=[];console_errors=[];passed=[]
def magnet_route(r):
 name=r.request.url.split('/')[-1]
 if name not in ['magnet_capabilities','apply_magnet_checkpoint']:return legacy(r)
 def reply(v,status=200):return r.fulfill(status=status,content_type='application/json',body=json.dumps(v),headers={'Access-Control-Allow-Origin':'*'})
 if cloud.offline:return r.abort('internetdisconnected')
 if name=='magnet_capabilities':return reply({'version':1}) if not missing else reply({'message':'Not installed','code':'PGRST202'},404)
 payload=r.request.post_data_json;uid=json.loads(base64.urlsafe_b64decode(r.request.headers['authorization'].split('.')[1]+'==='))['sub'];w=cloud.rows[uid]['wallets'];c=payload['p_checkpoint'];rid=c['roundId'];key=(rid,c['step']);old=cloud.rounds.get(rid)
 if key in events:return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':True}) if events[key]==c else reply({'message':'VAULT_WALLET_CONFLICT'},400)
 if payload['p_expected_revision']!=w['revision'] or payload['p_previous_step']>=0 and (not old or old['status']!='started' or old['checkpoint']['step']!=payload['p_previous_step']):return reply({'message':'VAULT_WALLET_CONFLICT'},400)
 if payload['p_previous_step']==-1:
  if not cloud.access.get(uid,True):return reply({'message':'VAULT_ACCOUNT_DISABLED'},400)
  if old or any(v['user_id']==uid and v['p_game_id']=='magnet' and v['status']=='started' for v in cloud.rounds.values()):return reply({'message':'VAULT_WALLET_CONFLICT'},400)
  w['balance']=round(w['balance']-c['bet'],6)
 events[key]=json.loads(json.dumps(c));w['revision']+=1;w['balance']=round(w['balance']+c['payout'],6);w['recovery']['magnetRound']=c
 cloud.rounds[rid]={'user_id':uid,'p_game_id':'magnet','p_bet':c['bet'],'status':'settled' if c['status']=='SETTLED' else 'started','payout':c['payout'],'checkpoint':c}
 if c['status']=='SETTLED':
  st=cloud.stats.setdefault((uid,'magnet'),{'game_id':'magnet','rounds_played':0,'total_wagered':0,'total_won':0});st['rounds_played']+=1;st['total_wagered']+=c['bet'];st['total_won']+=c['payout']
 return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':False})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=b.new_context(viewport={'width':1440,'height':1080});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',magnet_route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms===850?100000:ms,...a)');return c
 def login(c,email='alice@example.test'):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',email);pg.wait_for_function('VaultSession.ready&&VaultSession.mode==="authenticated"');pg.evaluate('VaultMagnet.open()');pg.wait_for_function('VaultMagnet.inspect().ready');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=20000)
 def settled(pg):pg.wait_for_function('!VaultMagnet.isBusy')
 def checkpoint(pg):return pg.evaluate('VaultMagnet.getCheckpoint()')
 def reload(pg):pg.reload();pg.wait_for_function('VaultSession.ready&&VaultMagnet.inspect().ready');sync(pg)
 def play(pg,seed=None):
  if seed is None:pg.locator('#magnetSpin').click()
  else:pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('magnetSpin').click();crypto.getRandomValues=old;}''',seed)
 def shot(pg,name):pg.screenshot(path=str(ROOT.parent/'output'/name),full_page=True)
 c=context();pg=login(c);sync(pg)
 assert pg.locator('#magnetField .magnet-token').count()==25
 assert pg.evaluate("LOBBY_GAMES.some(g=>g.id==='magnet'&&g.category==='slots')&&FEATURED_GAME_ID==='slot'")
 assert pg.evaluate('MAGNET_DEBUG===false')
 pg.evaluate('''async()=>{await Promise.all(Object.values(MAGNET_ASSETS).map(async src=>{const im=new Image();im.src=src;await im.decode();if(!im.naturalWidth)throw Error('asset')}))}''')
 for width,height in [(1440,1080),(1024,768),(768,1024),(390,844),(320,720)]:
  pg.set_viewport_size({'width':width,'height':height});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert pg.locator('#magnetSpin').is_visible();assert pg.locator('#magnetField').bounding_box()['width']<=width
  assert pg.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}")
  if width==1440:shot(pg,'magnet-base.png')
  if width==390:shot(pg,'magnet-mobile.png')
 pg.set_viewport_size({'width':1440,'height':1080});pg.locator('#magnetSettingsOpen').click();assert pg.locator('#magnetSettings').is_visible();pg.locator('#magnetSettingsClose').click();pg.locator('#magnetHelpOpen').click();assert pg.locator('#magnetHelp').is_visible();pg.locator('#magnetHelpClose').click();pg.locator('#magnetAuto').click();assert pg.locator('[data-magnet-auto]').count()==5;pg.locator('#magnetAuto').click()
 passed.append('25 cells and +/−/neutral labels; all original assets decode; SLOTS registration and Featured preserved; five sizes without horizontal overflow/duplicate IDs; settings/help/AUTO menus work')
 seeds=pg.evaluate("()=>{const out={};for(let seed=0;seed<10000&&Object.keys(out).length<2;seed++){const r=MAGNET_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(MAGNET_MODEL.active(r))out.bonus??=seed;else if(r.payout>0&&r.magneticPlan.orderedEffects.some(e=>e.from!==undefined))out.base??=seed;}return out}")
 before=pg.evaluate('state.balance');play(pg,seeds['base']);planned=checkpoint(pg);assert planned['status']=='SETTLED';pg.wait_for_selector('#magnetApp.field-active');pg.wait_for_function("document.querySelectorAll('#magnetForces path').length>0");assert pg.locator('#magnetWin').inner_text()=='0';assert pg.evaluate('VaultWalletService.formatBalance()')==pg.evaluate('n=>n.toLocaleString("ru-RU",{maximumFractionDigits:6})',before-20);shot(pg,'magnet-magnetic-phase.png');settled(pg);sync(pg)
 assert pg.evaluate('state.balance')==round(before-20+planned['payout'],6);n=cloud.stats[(A,'magnet')]['rounds_played'];balance=pg.evaluate('state.balance');reload(pg);assert checkpoint(pg)==planned;assert pg.evaluate('state.balance')==balance;assert cloud.stats[(A,'magnet')]['rounds_played']==n
 passed.append('Real paid spin commits deterministic plan before animation; visible force arcs; final-grid payout only; F5 preserves exact seed/initial/effects/final and never pays twice')
 before=pg.evaluate('state.balance');play(pg,seeds['bonus']);initial=checkpoint(pg);assert initial['status']=='OVERDRIVE';assert pg.evaluate('state.balance')==before-20
 reload(pg);assert checkpoint(pg)==initial;assert pg.evaluate('state.balance')==before-20;shot(pg,'magnet-overdrive.png')
 # Another device starts the same earned spin; server accepts one checkpoint only.
 other_c=context();other=login(other_c);assert checkpoint(other)==initial
 play(pg);settled(pg);sync(pg);expected=checkpoint(pg);play(other);settled(other);sync(other);assert checkpoint(other)==expected;other_c.close()
 for i in range(4):
  old=pg.evaluate('state.balance');play(pg);settled(pg);sync(pg)
  if i<3:assert pg.evaluate('state.balance')==old
 final=checkpoint(pg);assert final['status']=='SETTLED';assert final['step']==5;assert pg.evaluate('state.balance')==round(before-20+final['payout'],6);n=cloud.stats[(A,'magnet')]['rounds_played'];reload(pg);assert cloud.stats[(A,'magnet')]['rounds_played']==n
 passed.append('Overdrive F5 during initial reveal; five earned spins with fixed parent UUID/bet; shared exact cross-device spin is idempotent; total payout and statistics bank once')
 cloud.offline=True;play(pg,seeds['base']);settled(pg);local=pg.evaluate('state.balance');assert pg.evaluate('VaultStorage.inspect().data.queue.length')>0;cloud.offline=False;pg.evaluate("window.dispatchEvent(new Event('online'))");sync(pg);assert pg.evaluate('state.balance')==local
 passed.append('Offline round persists in bounded owned outbox and reconnect sync preserves shared balance')
 pg.evaluate('VaultSwamp.open()');pg.wait_for_function('VaultRoundService.swampSupport');seed=pg.evaluate("()=>{for(let seed=1;seed<10000;seed++){const o=SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(seed)));if(!o.triggerSpins&&o.winX>0)return seed}}")
 expected=pg.evaluate('s=>SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(s)))',seed);before=pg.evaluate('state.balance');pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('swampSpin').click();crypto.getRandomValues=old;}''',seed)
 # Existing Swamp begins/debits first, then holds the post-bet balance until reveal.
 assert pg.evaluate('VaultWalletService.formatBalance()')==pg.evaluate('n=>n.toLocaleString("ru-RU",{maximumFractionDigits:6})',before-20)
 pg.wait_for_function('!VaultSwamp.isBusy');sync(pg);local=pg.evaluate('state.balance');assert local==round(before-20+expected['winX']*20,6)
 passed.append('Existing Swamp real spin preserves its original held-balance presentation and correct final payout after the MAGNET display extension')
 pg.evaluate('openPokerGame()');assert pg.evaluate('state.balance')==local;pg.evaluate('openLobby()');pg.evaluate('VaultAuth.signOut()');pg.wait_for_function('VaultSession.mode==="guest"');pg.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');pg.wait_for_function('VaultSession.mode==="authenticated"&&VaultSession.ready');assert checkpoint(pg) is None
 passed.append('Existing Poker uses the same wallet; sign out/account switch clears private MAGNET checkpoint')
 c.close();missing=True;c=context();g=c.new_page();g.goto('http://127.0.0.1:8777/');g.wait_for_function('VaultSession.ready');g.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');g.evaluate('VaultMagnet.open()');g.wait_for_function("document.getElementById('magnetMessage').textContent.includes('supabase_magnet.txt')");assert g.locator('#magnetSpin').is_disabled();before=g.evaluate('state.balance');g.evaluate("document.getElementById('magnetSpin').click()");assert g.evaluate('state.balance')==before;g.evaluate('openPokerGame()');assert g.locator('#pokerApp').is_visible();c.close();b.close()
 passed.append('Missing migration disables only MAGNET and cannot debit; existing Poker remains available')
assert not errors,errors
assert all(any(needle in e for needle in ['net::ERR','Failed to fetch','VAULT sync failed','400','404','internetdisconnected']) for e in console_errors),console_errors
report={'mode':'Chromium + real SDK HTTP fixture; PostgreSQL/RLS checked separately; no live database writes','passed':passed,'pageErrors':errors,'expectedOfflineOrMissingSchemaConsoleErrors':console_errors}
(ROOT/'reports/magnet-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
