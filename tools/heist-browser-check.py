"""Actual pinned Supabase SDK + HTTP contract fixture; real model results, production RNG untouched."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];expected_errors=[];passed=[];events={};missing=False;drop=False
original=cloud.route
def route(r):
 global drop
 name=r.request.url.split('/')[-1]
 if name not in ['heist_capabilities','apply_heist_checkpoint']:return original(r)
 payload=r.request.post_data_json or {};uid=json.loads(base64.urlsafe_b64decode(r.request.headers['authorization'].split('.')[1]+'==='))['sub'];w=cloud.rows[uid]['wallets']
 def reply(v,status=200):r.fulfill(status=status,content_type='application/json',body=json.dumps(v),headers={'Access-Control-Allow-Origin':'*'})
 if name=='heist_capabilities':return reply({'version':1}) if not missing else reply({'message':'Function not found','code':'PGRST202'},404)
 if cloud.offline:return r.abort('internetdisconnected')
 c=payload['p_checkpoint'];rid=c['roundId'];key=(rid,c['step']);old=cloud.rounds.get(rid)
 if key in events:return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':True}) if events[key]==c else reply({'message':'VAULT_WALLET_CONFLICT'},400)
 if payload['p_expected_revision']!=w['revision'] or payload['p_previous_step']>=0 and (not old or old['status']!='started' or old['checkpoint']['step']!=payload['p_previous_step']):return reply({'message':'VAULT_WALLET_CONFLICT'},400)
 start=payload['p_previous_step']==-1
 if start:
  if not cloud.access.get(uid,True):return reply({'message':'VAULT_ACCOUNT_DISABLED'},400)
  if old or any(t['user_id']==uid and t['p_game_id']=='vault_heist' and t['status']=='started' for t in cloud.rounds.values()):return reply({'message':'VAULT_WALLET_CONFLICT'},400)
  w['balance']=round(w['balance']-c['bet'],6)
 events[key]=json.loads(json.dumps(c));w['revision']+=1;w['balance']=round(w['balance']+c['payout'],6);w['recovery']['heistRound']=c
 cloud.rounds[rid]={'user_id':uid,'p_game_id':'vault_heist','p_bet':c['bet'],'status':'settled' if c['status']=='SETTLED' else 'started','payout':c['payout'],'checkpoint':c}
 if c['status']=='SETTLED':
  s=cloud.stats.setdefault((uid,'vault_heist'),{'game_id':'vault_heist','rounds_played':0,'total_wagered':0,'total_won':0});s['rounds_played']+=1;s['total_wagered']+=c['bet'];s['total_won']+=c['payout']
 if drop:drop=False;return r.abort('failed')
 return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':False})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=b.new_context(viewport={'width':1440,'height':1080});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms===500?100000:ms,...a)');return c
 def login(c,email='alice@example.test'):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:expected_errors.append(m.text) if m.type=='error' else None);pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',email);pg.evaluate('VaultHeist.open()');pg.wait_for_function('VaultHeist.inspect().ready');pg.evaluate('state.fastGame=true');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=20000)
 def checkpoint(pg):return pg.evaluate('VaultHeist.getCheckpoint()')
 def play(pg,s=None):
  if s is None:pg.locator('#heistSpin').click()
  else:pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('heistSpin').click();crypto.getRandomValues=old;}''',s)
 def wait(pg):pg.wait_for_function('!VaultHeist.isBusy')
 def screen(pg,name):pg.wait_for_timeout(300);pg.wait_for_function("()=>[...document.querySelectorAll('#heistApp img')].every(n=>n.complete&&n.naturalWidth)");pg.screenshot(path=str(ROOT.parent/'output'/name),full_page=True)
 c=context();pg=login(c);sync(pg);assert pg.locator('#openHeistGame').count()==1;assert pg.locator('.heist-cell').count()==20;assert not pg.locator('.app').first.is_visible();assert not pg.locator('#heistChoice').is_visible();screen(pg,'heist-base.png')
 seeds=pg.evaluate("()=>{const out={};for(let s=1;Object.keys(out).length<3&&s<100000;s++){let r=VAULT_HEIST_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID()});if(!VAULT_HEIST_MODEL.active(r)){out.base??=s;continue;}while(r.status==='STAGE')r=VAULT_HEIST_MODEL.advance(r,'spin');const d=VAULT_HEIST_MODEL.advance(r,'deeper');if(d.result==='alarm')out.alarm??=s;else out.safe??=s;}return out}")
 before=pg.evaluate('state.balance');play(pg,seeds['base']);pg.evaluate("document.getElementById('heistSpin').click()");wait(pg);sync(pg);assert checkpoint(pg)['status']=='SETTLED';assert cloud.stats[(A,'vault_heist')]['rounds_played']==1
 balance=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready');assert pg.evaluate('state.balance')==balance;assert checkpoint(pg)['status']=='SETTLED';assert cloud.stats[(A,'vault_heist')]['rounds_played']==1
 play(pg,seeds['base']);pg.evaluate('openLobby()');saved=checkpoint(pg);pg.evaluate('VaultHeist.open()');assert checkpoint(pg)==saved;assert pg.locator('.heist-reel.rolling').count()==0;sync(pg)
 passed.append('Auth/lobby registration, 5x4 assets decode, base debit and settlement once, F5 exact wallet; leaving mid-animation restores safe scene')
 before=pg.evaluate('state.balance');play(pg,seeds['safe']);assert checkpoint(pg)['status']=='STAGE';paid=pg.evaluate('state.balance');assert paid==before-20;pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready');assert pg.evaluate('state.balance')==paid;assert checkpoint(pg)['remaining']==3;sync(pg);screen(pg,'heist-stage.png')
 for i in range(3):play(pg);wait(pg)
 assert checkpoint(pg)['status']=='CHOICE';assert pg.locator('#heistChoice').is_visible();assert pg.evaluate('state.balance')==paid;screen(pg,'heist-choice.png');saved=checkpoint(pg);pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready');assert checkpoint(pg)==saved;assert pg.locator('#heistChoice').is_visible();sync(pg)
 for w,h in [(1024,768),(768,1024),(390,844),(320,720)]:
  pg.set_viewport_size({'width':w,'height':h});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),w;assert pg.locator('#heistCollect').is_visible();assert pg.locator('#heistDeeper').is_visible()
  if w==390:screen(pg,'heist-choice-mobile.png')
 passed.append('Trigger wager locked; free stage spins do not debit; F5 mid-animation and on decision; five viewports, accessible choice')
 # Same remote choice on another browser; one branch settles, the stale collect must never pay twice.
 c2=context();other=login(c2);assert checkpoint(other)==saved
 pg.locator('#heistCollect').click();wait(pg);sync(pg);banked=pg.evaluate('state.balance');assert banked==round(paid+(saved['baseWinX']+saved['lootX'])*saved['bet'],6);n=cloud.stats[(A,'vault_heist')]['rounds_played']
 other.locator('#heistDeeper').click();wait(other);sync(other);assert other.evaluate('state.balance')==banked;assert cloud.stats[(A,'vault_heist')]['rounds_played']==n;c2.close()
 passed.append('Cross-device restore and competing Collect: stale branch reconciles without duplicate payout or statistics')
 pg.set_viewport_size({'width':1440,'height':1080});play(pg,seeds['alarm']);wait(pg)
 for i in range(3):play(pg);wait(pg)
 choice=checkpoint(pg);pg.locator('#heistDeeper').click();done=checkpoint(pg);assert done['result']=='alarm';balance=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready');assert checkpoint(pg)==done;assert pg.evaluate('state.balance')==balance;assert done['payout']==round(choice['baseWinX']*20,6);sync(pg)
 passed.append('Alarm committed before animation; reload cannot retry; only base win survives failure')
 # Lost terminal acknowledgement: the server has paid, but local outbox must retry the same checkpoint.
 play(pg,seeds['safe']);wait(pg)
 for i in range(3):play(pg);wait(pg)
 sync(pg);drop=True;pg.locator('#heistCollect').click();pg.evaluate('VaultSync.flush()');saved_balance=pg.evaluate('state.balance');n=cloud.stats[(A,'vault_heist')]['rounds_played'];pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready');sync(pg);assert pg.evaluate('state.balance')==saved_balance;assert cloud.stats[(A,'vault_heist')]['rounds_played']==n
 passed.append('Lost committed payout reply followed by F5 retries idempotently without duplicate wallet/statistics')
 cloud.offline=True;play(pg,seeds['base']);wait(pg);offline_balance=pg.evaluate('state.balance');assert pg.evaluate('VaultStorage.inspect().data.queue.length')>0
 cloud.offline=False;pg.evaluate("window.dispatchEvent(new Event('online'))");sync(pg);assert pg.evaluate('state.balance')==offline_balance
 passed.append('Offline action saved locally; reconnect sends bounded queue and preserves shared wallet')

 # Successful Deeper is deterministic and resumes at next stable stage.
 play(pg,seeds['safe']);wait(pg)
 for i in range(3):play(pg);wait(pg)
 pg.locator('#heistDeeper').click();assert checkpoint(pg)['stage']==1;pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultHeist.inspect().ready');assert checkpoint(pg)['stage']==1;assert checkpoint(pg)['remaining']==3;sync(pg)
 pg.evaluate('openLobby()');remain=checkpoint(pg)['remaining'];pg.wait_for_timeout(700);assert checkpoint(pg)['remaining']==remain;pg.evaluate('VaultSwamp.open()');assert pg.evaluate('state.balance')==cloud.rows[A]['wallets']['balance'];pg.evaluate('openLobby()');pg.evaluate('VaultAuth.signOut()');pg.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");assert checkpoint(pg) is None
 passed.append('Safe Deeper/F5, navigation pauses continuation; shared balance and account isolation')
 assert pg.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return new Set(ids).size===ids.length}")
 c.close();missing=True;guard=context();g=guard.new_page();g.goto('http://127.0.0.1:8777/');g.wait_for_function('VaultSession.ready');g.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");g.evaluate('VaultHeist.open()');g.wait_for_function("document.getElementById('heistMessage').textContent.includes('supabase_heist.txt')");assert g.locator('#heistSpin').is_disabled();balance=g.evaluate('state.balance');g.evaluate("document.getElementById('heistSpin').click()");assert g.evaluate('state.balance')==balance;guard.close();passed.append('Missing migration disables only new slot, with no debit or poisoned outbox');b.close()
assert not errors,errors
# Expected console network errors correspond only to the deliberately stale cross-device revision.
assert all('VAULT_WALLET_CONFLICT' in e or '400' in e or 'VAULT sync failed' in e or 'net::ERR' in e or 'Failed to fetch' in e or 'internetdisconnected' in e for e in expected_errors),expected_errors
report={'mode':'Actual Chromium + Supabase SDK HTTP fixture; RLS separately tested in PostgreSQL','passed':passed,'pageErrors':errors,'expectedConflictConsoleErrors':expected_errors};(ROOT/'reports/heist-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
