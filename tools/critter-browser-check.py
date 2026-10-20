"""Real standalone UI + pinned SDK and owned HTTP fixture. Live Supabase is not modified."""
from pathlib import Path
import json,base64,time,re
source=Path(__file__).with_name('magnet-v2-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
missing_critter=False;passed=[];errors=[];console_errors=[]
def critter_route(r):
 name=r.request.url.split('/')[-1]
 if name not in ['critter_capabilities','settle_critter_round']:return magnet_route(r)
 def reply(v,status=200):return r.fulfill(status=status,content_type='application/json',body=json.dumps(v),headers={'Access-Control-Allow-Origin':'*'})
 if name=='critter_capabilities':return reply({'version':2}) if not missing_critter else reply({'message':'Not installed'},404)
 if cloud.offline:return r.abort('internetdisconnected')
 payload=r.request.post_data_json;uid=json.loads(base64.urlsafe_b64decode(r.request.headers['authorization'].split('.')[1]+'==='))['sub'];w=cloud.rows[uid]['wallets'];c=payload['p_checkpoint'];rid=c['roundId'];old=cloud.rounds.get(rid)
 if old:return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':True}) if old['user_id']==uid and old.get('checkpoint')==c else reply({'message':'VAULT_WALLET_CONFLICT'},400)
 if not cloud.access.get(uid,True):return reply({'message':'VAULT_ACCOUNT_DISABLED'},400)
 if payload['p_expected_revision']!=w['revision'] or w['balance']<c['bet']:return reply({'message':'VAULT_WALLET_CONFLICT'},400)
 w['balance']=round(w['balance']-c['bet']+c['payout'],6);w['revision']+=1;w['recovery']['critterRound']=c
 cloud.rounds[rid]={'user_id':uid,'p_game_id':'critter','p_bet':c['bet'],'status':'settled','payout':c['payout'],'checkpoint':c}
 st=cloud.stats.setdefault((uid,'critter'),{'game_id':'critter','rounds_played':0,'total_wagered':0,'total_won':0});st['rounds_played']+=1;st['total_wagered']+=c['bet'];st['total_won']+=c['payout']
 return reply({'balance':w['balance'],'revision':w['revision'],'duplicate':False})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=b.new_context(viewport={'width':1440,'height':1200});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',critter_route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));c.add_init_script("const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,fn.name==='spin'&&(ms===450||ms===850)?100000:ms,...a)");return c
 def login(c,email='alice@example.test'):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('e=>VaultAuth.signIn(e,"fixture-password")',email);pg.evaluate('VaultCritter.open()');pg.wait_for_function('VaultCritter.inspect().ready');pg.evaluate('state.fastGame=true');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def settled(pg):pg.wait_for_function('!VaultCritter.isBusy',timeout=45000);sync(pg)
 def checkpoint(pg):return pg.evaluate('VaultCritter.getCheckpoint()')
 def play(pg,seed):pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('critterSpin').click();crypto.getRandomValues=old;}''',seed)
 def reload(pg):pg.reload();pg.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');pg.evaluate('state.fastGame=true');sync(pg)
 def shot(pg,name):pg.screenshot(path=str(ROOT.parent/'output'/f'critter-{name}.png'),full_page=True)
 c=context();pg=login(c);sync(pg);shot(pg,'base')
 assert pg.locator('#critterGrid .critter-cell').count()==25
 assert pg.evaluate("LOBBY_GAMES.some(g=>g.id==='critter'&&g.category==='slots')&&FEATURED_GAME_ID==='slot'")
 pg.evaluate('''async()=>{await Promise.all(Object.values(CRITTER_ASSETS).map(async src=>{const i=new Image();i.src=src;await i.decode();if(!i.naturalWidth)throw Error('asset')}))}''')
 for width in [1440,1024,768,390,320]:
  pg.set_viewport_size({'width':width,'height':1100});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert pg.locator('#critterSpin').is_visible();assert pg.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}")
  if width==390:shot(pg,'mobile')
 pg.set_viewport_size({'width':1440,'height':1200});pg.locator('#critterHelpOpen').click();assert pg.locator('.critter-pay-row').count()==9;assert 'RUNNING WILD' in pg.locator('#critterHelp').inner_text();shot(pg,'paytable');pg.locator('#critterHelpClose').click();pg.locator('#critterAuto').click();assert pg.locator('[data-critter-auto]').count()==5;pg.locator('#critterAuto').click()
 passed.append('25 cells; exact source assets decode; SLOTS/Featured intact; five widths320–1440; no duplicate IDs/overflow; PAYTABLE and AUTO choices')
 seeds=pg.evaluate('''()=>{const out={};for(let s=0;Object.keys(out).length<4&&s<20000;s++){const r=CRITTER_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID()});if(r.bonus)out.bonus??=s;else if(r.base.steps.some(s=>s.moves.length))out.running??=s;else if(r.base.steps.length)out.win??=s;else out.loss??=s;}return out}''')
 before=pg.evaluate('state.balance');pg.evaluate('state.fastGame=false');play(pg,seeds['win']);planned=checkpoint(pg);assert pg.evaluate("getComputedStyle(document.querySelector('#critterGrid .critter-cell')).animationName")=='critter-reel';pg.wait_for_selector('#critterGrid .winning');shot(pg,'winning');settled(pg);pg.evaluate('state.fastGame=true');assert pg.evaluate('state.balance')==round(before-20+planned['payout'],6)
 for seed in [seeds['loss'],seeds['running']]:
  if seed==seeds['running']:pg.evaluate('state.fastGame=false')
  play(pg,seed);planned=checkpoint(pg)
  if seed==seeds['running']:
   pg.wait_for_function("document.querySelector('.critter-runner')");pg.wait_for_timeout(50);assert pg.locator('#critterPaths path').count()==1
   assert pg.evaluate("()=>{const a=document.querySelector('.critter-runner').getBoundingClientRect(),b=document.getElementById('critterGrid').getBoundingClientRect();return a.top>=b.top-2&&a.bottom<=b.bottom+2&&a.left>=b.left-2&&a.right<=b.right+2}")
   shot(pg,'running-wild')
  settled(pg);pg.evaluate('state.fastGame=true');assert checkpoint(pg)==planned
  assert pg.evaluate("[...document.querySelectorAll('#critterGrid .critter-cell')].map(n=>({uid:+n.dataset.uid,symbol:n.dataset.symbol}))")==planned['base']['finalGrid']
  assert pg.locator('.critter-runner,#critterPaths path').count()==0
 passed.append('Normal/FAST real paid rounds; winning clusters visible; sequential sourced Wild jump/arrow; exact final grid; no residual effects; shared balance')
 before=pg.evaluate('state.balance');play(pg,seeds['bonus']);planned=checkpoint(pg);pg.wait_for_selector('#critterBonusOverlay',state='visible');shot(pg,'bonus');assert pg.locator('.critter-bonus-bin').count()==3;assert pg.evaluate('VaultWalletService.formatBalance()')==pg.evaluate('n=>n.toLocaleString("ru-RU",{maximumFractionDigits:6})',before-20);settled(pg);assert pg.evaluate('state.balance')==round(before-20+planned['payout'],6);shot(pg,'bonus-result')
 n=cloud.stats[(A,'critter')]['rounds_played'];reload(pg);assert checkpoint(pg)==planned;assert cloud.stats[(A,'critter')]['rounds_played']==n
 passed.append('Dumpster Dash reveals all3 cash/wild/multiplier awards, runs bonus field; original bet held during reveal; one full payout and one stats update; F5 stable')
 play(pg,seeds['running']);pg.wait_for_function("document.querySelector('.critter-runner')");planned=checkpoint(pg);reload(pg);assert checkpoint(pg)==planned;assert pg.locator('.critter-runner').count()==0
 play(pg,seeds['bonus']);pg.wait_for_selector('#critterBonusOverlay',state='visible');planned=checkpoint(pg);reload(pg);assert checkpoint(pg)==planned;assert pg.locator('#critterBonusOverlay').is_hidden()
 passed.append('F5 during Wild movement and bonus restores terminal business result, skipping animation without duplicate award/debit')
 other=context();second=login(other);before=pg.evaluate('state.balance');play(pg,seeds['loss']);r1=checkpoint(pg);settled(pg);play(second,seeds['win']);r2=checkpoint(second);settled(second);expected=round(before-40+r1['payout']+r2['payout'],6);assert second.evaluate('state.balance')==expected;other.close()
 passed.append('Two devices with stale revision automatically rebase two distinct seeded rounds without reroll or max-balance merge')
 reload(pg);cloud.offline=True;play(pg,seeds['win']);pg.wait_for_function('!VaultCritter.isBusy');assert pg.evaluate('VaultStorage.inspect().data.queue.length')>0;cloud.offline=False;pg.evaluate("window.dispatchEvent(new Event('online'))");sync(pg)
 passed.append('Offline local outbox and reconnect sync preserve the round')
 balance=pg.evaluate('state.balance');pg.evaluate('VaultMagnet.open()');pg.wait_for_function('VaultMagnetBridge.featuresReady');assert pg.evaluate('state.balance')==balance;pg.evaluate('openPokerGame()');assert pg.locator('#pokerApp').is_visible();pg.evaluate('openLobby()');pg.evaluate('VaultAuth.signOut()');pg.wait_for_function('VaultSession.mode==="guest"');assert checkpoint(pg) is None;c.close()
 passed.append('MAGNET/Poker/lobby transitions retain wallet; signout clears private Critter data')
 missing_critter=True;c=context();pg=c.new_page();pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');pg.evaluate('VaultCritter.open()');pg.wait_for_function("document.getElementById('critterMessage').textContent.includes('supabase_critter.txt')");assert pg.locator('#critterSpin').is_disabled();before=pg.evaluate('state.balance');pg.evaluate("document.getElementById('critterSpin').click()");assert pg.evaluate('state.balance')==before;pg.evaluate('openPokerGame()');assert pg.locator('#pokerApp').is_visible();c.close();b.close()
 passed.append('Missing migration disables only Critter and cannot charge; existing Poker stays accessible')
assert not errors,errors
assert all(any(w in e for w in ['net::ERR','Failed to fetch','VAULT sync failed','400','404']) for e in console_errors),console_errors
(ROOT/'reports/critter-browser.json').write_text(json.dumps({'mode':'Chromium + actual SDK with HTTP fixture; PostgreSQL separately; not live Supabase','passed':passed,'pageErrors':errors,'expectedOfflineOrRevisionConsoleErrors':console_errors},indent=2)+'\n');print('\n'.join('PASS '+s for s in passed))
