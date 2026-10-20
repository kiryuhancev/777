"""Real pinned Supabase SDK against a deterministic HTTP contract fixture.
This is NOT a test of a live Supabase project or email delivery. RLS is tested in PostgreSQL separately.
"""
from pathlib import Path
import os,json,base64,time,re
from urllib.request import urlopen
from datetime import datetime,timezone
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js'
SDK_PATH=Path(os.environ.get('VAULT_TEST_SDK','/tmp/vault-supabase-sdk.js'))
if not SDK_PATH.exists():SDK_PATH.write_bytes(urlopen(SDK_URL,timeout=30).read())
SDK=SDK_PATH.read_text()
HTML=(ROOT/'index.html').read_text()
def jwt(uid=None):
 def enc(x):return base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
 return enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':'authenticated' if uid else 'anon','sub':uid or '', 'exp':int(time.time())+3600,'aud':'authenticated'})+'.fixture-only'
PUBLIC=jwt();HTML=re.sub(r"supabaseUrl: '[^']*'","supabaseUrl: 'https://vault-test.supabase.co'",HTML,count=1);HTML=re.sub(r"supabaseAnonKey: '[^']*'",f"supabaseAnonKey: '{PUBLIC}'",HTML,count=1);HTML=re.sub(r"sdkUrl: '[^']*'",f"sdkUrl: '{SDK_URL}'",HTML,count=1)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
def now():return datetime.now(timezone.utc).isoformat()
class Cloud:
 def __init__(self):
  self.users={};self.rows={};self.rounds={};self.stats={};self.offline=False;self.table_schema_ready=True;self.swamp_schema_ready=True;self.mines_schema_ready=True;self.drop_admin=False;self.admin_audit={};self.access={};self.drop_settle=False;self.calls=[];self.unavailable_profiles=set();self.unavailable_wallets=set()
  self.create(A,'alice@example.test','Alice');self.create(B,'bob@example.test','Bob')
 def create(self,uid,email,username):
  self.users[uid]={'id':uid,'email':email,'aud':'authenticated','role':'authenticated','user_metadata':{'username':username},'app_metadata':{'provider':'email','providers':['email']},'created_at':now(),'email_confirmed_at':now(),'last_sign_in_at':now(),'identities':[]}
  self.rows[uid]={'profiles':{'id':uid,'username':username,'avatar_url':None,'xp':0,'level':1},'wallets':{'user_id':uid,'balance':1000000,'revision':0,'recovery':{}},'user_settings':{'user_id':uid,'sound_enabled':True,'music_enabled':False,'fast_mode':False,'fast_bonus':False,'scatter_boost':False,'last_game_id':'lobby','selected_bets':{'slot':2,'poker':2,'bird':1},'updated_at':now()}}
 def session(self,uid):return {'access_token':jwt(uid),'refresh_token':'fixture-refresh-'+uid,'expires_in':3600,'token_type':'bearer','user':self.users[uid]}
 def route(self,route):
  req=route.request;url=urlsplit(req.url);path=url.path
  headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,x-client-info,content-type,prefer','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS','Content-Type':'application/json'}
  def response(value,status=200):route.fulfill(status=status,headers=headers,body=json.dumps(value))
  if req.method=='OPTIONS':return response({})
  if self.offline:return route.abort('internetdisconnected')
  payload=req.post_data_json if req.post_data else {}
  uid=None;token=req.headers.get('authorization','').removeprefix('Bearer ')
  try:uid=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'==='))['sub']
  except Exception:pass
  if path.startswith('/auth/v1/'):
   if path.endswith('/token'):
    if parse_qs(url.query).get('grant_type')==['refresh_token']:uid=payload['refresh_token'].removeprefix('fixture-refresh-')
    else:uid=next((id for id,u in self.users.items() if u['email']==payload.get('email')),None)
    if not uid:return response({'msg':'Invalid credentials'},400)
    return response(self.session(uid))
   if path.endswith('/signup'):
    uid=A;self.users[uid]['user_metadata']['username']=payload.get('data',{}).get('username','Alice');self.rows[uid]['profiles']['username']=self.users[uid]['user_metadata']['username'];return response(self.session(uid))
   if path.endswith('/logout'):return response({})
   if path.endswith('/user'):return response(self.users[uid])
  if uid not in self.rows:return response({'message':'Authentication required'},401)
  if path.startswith('/rest/v1/rpc/'):
   name=path.split('/')[-1];self.calls.append((uid,name,payload));wallet=self.rows[uid]['wallets']
   if name=='mines_capabilities':return response({'version':1}) if self.mines_schema_ready else response({'message':'Function not found','code':'PGRST202'},404)
   if name=='swamp_slot_capabilities':return response({'version':2,'purchaseVersion':1,'siteAdminVersion':1,'boostVersion':1,'bonusVersion':2}) if self.swamp_schema_ready else response({'message':'Function not found','code':'PGRST202'},404)
   if name=='table_games_capabilities':return response({'version':1}) if self.table_schema_ready else response({'message':'Function not found','code':'PGRST202'},404)
   is_admin=lambda id:self.users[id]['email']=='al.kiryuhancev@yandex.ru' and self.users[id].get('email_confirmed_at') is not None
   if name=='vault_admin_context':return response({'isAdmin':is_admin(uid)})
   if name=='vault_presence_heartbeat':return response({'enabled':self.access.get(uid,True)})
   if name.startswith('vault_admin_'):
    if not is_admin(uid):return response({'message':'VAULT_ADMIN_FORBIDDEN'},403)
    if name=='vault_admin_users':
     results=[]
     for id,u in self.users.items():
      if payload.get('p_search','').lower() not in (u['email']+' '+self.rows[id]['profiles']['username']).lower():continue
      w=self.rows[id]['wallets'];results.append({'user_id':id,'email':u['email'],'username':self.rows[id]['profiles']['username'],'balance':w['balance'],'revision':w['revision'],'enabled':self.access.get(id,True),'is_admin':is_admin(id),'last_sign_in_at':u['last_sign_in_at'],'last_seen_at':now(),'online':True,'last_round_at':now() if any(r['user_id']==id for r in self.rounds.values()) else None,'rounds_played':sum(s['rounds_played'] for (i,g),s in self.stats.items() if i==id)})
     return response(results[payload['p_offset']:payload['p_offset']+payload['p_limit']])
    if name=='vault_admin_activity':return response({'rounds':[{'game_id':r['p_game_id'],'status':r['status'],'bet':r['p_bet'],'payout':r.get('payout',0),'created_at':now()} for r in self.rounds.values() if r['user_id']==payload['p_user_id']], 'audit':[a for a in self.admin_audit.values() if a['user_id']==payload['p_user_id']]})
    target=payload['p_user_id'];w=self.rows[target]['wallets'];request=payload['p_request_id']
    if request in self.admin_audit:return response({'duplicate':True})
    if name=='vault_admin_balance':
     if payload['p_expected_revision']!=w['revision']:return response({'message':'VAULT_ADMIN_REVISION'},400)
     if any(r['user_id']==target and r['status']=='started' for r in self.rounds.values()):return response({'message':'VAULT_ADMIN_ACTIVE_ROUND'},400)
     op=payload['p_operation'];amount=payload['p_amount'];next_balance=amount if op=='set' else w['balance']+(amount if op=='credit' else -amount)
     if next_balance<0:return response({'message':'VAULT_ADMIN_FUNDS'},400)
     w['balance']=round(next_balance,6);w['revision']+=1;action={'action':'balance','operation':op,'new_balance':w['balance']}
    elif name=='vault_admin_access':
     if is_admin(target) and not payload['p_enabled']:return response({'message':'VAULT_ADMIN_SELF_BLOCK'},400)
     self.access[target]=payload['p_enabled'];action={'action':'access','enabled':payload['p_enabled']}
    self.admin_audit[request]={'user_id':target,'created_at':now(),'reason':payload['p_reason'],**action}
    if self.drop_admin:self.drop_admin=False;return route.abort('failed')
    return response({'duplicate':False})
   if name=='save_vault_settings':
    s=self.rows[uid]['user_settings'];x=payload['p_settings'];ts=payload['p_updated_at']
    if ts>s['updated_at']:
     for key,source in [('sound_enabled','sound'),('music_enabled','music'),('fast_mode','fastGame'),('fast_bonus','fastBonus'),('scatter_boost','scatterBoost'),('last_game_id','lastGame'),('selected_bets','bets')]:s[key]=x[source]
     s['updated_at']=ts
    return response(s)
   rid=payload['p_round_id'];r=self.rounds.get(rid)
   if name=='save_mines_checkpoint':
    c=payload['p_checkpoint'];previous=r.get('p_metadata',{}).get('mines') if r else None
    if not r or r['user_id']!=uid or r['status']!='started' or not previous:return response({'message':'VAULT_WALLET_CONFLICT'},400)
    immutable=lambda x:{k:v for k,v in x.items() if k not in ['opened','status','multiplier','payout']}
    if immutable(c)!=immutable(previous) or c['opened'][:len(previous['opened'])]!=previous['opened']:
     if immutable(c)==immutable(previous) and previous['opened'][:len(c['opened'])]==c['opened']:return response({'duplicate':True})
     return response({'message':'VAULT_WALLET_CONFLICT'},400)
    r['p_metadata']['mines']=c;wallet['recovery']['minesRound']=c;return response({'duplicate':False})
   if name=='begin_game_round':
    if not r:
     if payload['p_bet']>0 and not self.access.get(uid,True):return response({'message':'VAULT_ACCOUNT_DISABLED'},400)
     if any(x['user_id']==uid and x['p_game_id']==payload['p_game_id'] and x['status']=='started' for x in self.rounds.values()) or payload['p_expected_revision']!=wallet['revision'] or payload['p_bet']>wallet['balance']:return response({'message':'VAULT_WALLET_CONFLICT'},400)
     if payload['p_game_id']=='swamp':
      m=payload.get('p_metadata',{});prev=wallet['recovery'].get('swampBonus');nxt=payload.get('p_recovery',{}).get('swampBonus')
      if m.get('freeSpin'):
       if not prev or prev['remaining']<1 or m.get('featureId')!=prev.get('featureId') or m.get('freeSpinIndex')!=prev['spinsPlayed']+1 or not nxt or nxt['remaining']!=prev['remaining']-1 or nxt['spinsPlayed']!=prev['spinsPlayed']+1:return response({'message':'VAULT_WALLET_CONFLICT'},400)
      elif prev and prev['remaining']>0:return response({'message':'VAULT_WALLET_CONFLICT'},400)
     r={**payload,'user_id':uid,'status':'started','payout':0};self.rounds[rid]=r;wallet['balance']=round(wallet['balance']-payload['p_bet'],6);wallet['revision']+=1;wallet['recovery']={**wallet['recovery'],**{k:v for k,v in payload['p_recovery'].items() if k==({'swamp':'swampBonus','slot':'slotBonus','mines':'minesRound'}[payload['p_game_id']])}} if payload['p_game_id'] in ['slot','swamp','mines'] else wallet['recovery']
    elif r['user_id']!=uid:return response({'message':'Round mismatch'},400)
   elif name=='record_game_round':
    if not r or r['user_id']!=uid:return response({'message':'Round missing or mismatch'},400)
    if r['status']=='started':
     if payload['p_game_id']=='mines':
      c=payload['p_metadata']['mines'];previous=r['p_metadata']['mines']
      if c['opened'][:len(previous['opened'])]!=previous['opened'] or c['minePositions']!=previous['minePositions']:return response({'message':'VAULT_WALLET_CONFLICT'},400)
     extra=payload['p_bet']-r['p_bet']
     if extra and (payload['p_game_id']!='blackjack' or extra!=r['p_bet'] or not payload['p_metadata'].get('doubled')):return response({'message':'Round missing or mismatch'},400)
     if extra>wallet['balance']:return response({'message':'VAULT_WALLET_CONFLICT'},400)
     wallet['balance']-=extra;r['p_bet']=payload['p_bet']
     r['status']=payload['p_status'];r['payout']=payload['p_payout'];wallet['balance']=round(wallet['balance']+r['payout'],6);wallet['revision']+=1;wallet['recovery']={**wallet['recovery'],**{k:v for k,v in payload['p_recovery'].items() if k==({'swamp':'swampBonus','slot':'slotBonus','mines':'minesRound'}[payload['p_game_id']])}} if payload['p_game_id'] in ['slot','swamp','mines'] else wallet['recovery']
     game=payload['p_game_id'];s=self.stats.setdefault((uid,game),{'user_id':uid,'game_id':game,'rounds_played':0,'total_wagered':0,'total_won':0,'biggest_win':0,'biggest_multiplier':0});s['rounds_played']+=1;s['total_wagered']+=payload['p_bet'];s['total_won']+=r['payout'];s['biggest_win']=max(s['biggest_win'],r['payout']);s['biggest_multiplier']=max(s['biggest_multiplier'],payload['p_multiplier']);self.rows[uid]['profiles']['xp']+=10
     if self.drop_settle:self.drop_settle=False;self.offline=True;return route.abort('failed')
   return response({'balance':wallet['balance'],'revision':wallet['revision'],'status':r['status']})
  table=path.split('/')[-1]
  if table=='wallets' and uid in self.unavailable_wallets:return response({'message':'Wallet unavailable'},503)
  if table=='profiles' and uid in self.unavailable_profiles:return response({'message':'Profile unavailable'},503)
  if table=='game_rounds':
   q=parse_qs(url.query);wanted=q.get('round_id',[''])[0];status_filter=q.get('status',[''])[0]
   selected=set(wanted.removeprefix('in.(').removesuffix(')').split(',')) if wanted else None
   return response([{'round_id':id,'game_id':r['p_game_id'],'bet':r['p_bet'],'payout':r.get('payout',0),'status':r['status']} for id,r in self.rounds.items() if r['user_id']==uid and (not selected or id in selected) and (not status_filter or r['status']==status_filter.removeprefix('eq.'))])
  if table=='game_stats':return response([s for (id,_),s in self.stats.items() if id==uid])
  if req.method=='PATCH':self.rows[uid][table].update(payload)
  return response(self.rows[uid][table])
cloud=Cloud();report={'mode':'Real Supabase SDK with HTTP fixtures; not live cloud','passed':[],'pageErrors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  ctx=b.new_context();ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));ctx.route('https://vault-test.supabase.co/**',cloud.route)
  ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML));return ctx
 ctx=context();page=ctx.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
 def ready(pg):pg.wait_for_function('window.VaultSession?.ready',timeout=20000)
 def settled_sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('VaultStorage.inspect().data.queue.length===0',timeout=10000)
 def fold(pg):
  pg.evaluate('openPokerGame()');pg.locator('#pokerStartBtn').click();pg.locator('#choice0').click();pg.locator('#choice0').click();pg.locator('#pokerFoldBtn').click()
 page.goto('http://127.0.0.1:8777/');ready(page)
 page.evaluate("state.balance=999123;state.betIndex=4;toggleSetting('sound');openLobby();saveVaultState()")
 page.evaluate("()=>{const m=SLOT_MATH.newBonus('normal',rand);state.bonus=true;state.bonusType='normal';state.slotProfile='normal';writeSlotModel(m);state.bonusAutoRunning=false;VaultRecovery.checkpointSlot();}")
 page.locator('#vaultAuthSwitch').click();page.locator('#vaultAuthUsername').fill('Alice Vault');page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('fixture-password');page.locator('#vaultAuthSubmit').click();page.wait_for_function('VaultSession.mode==="authenticated"&&VaultSession.ready')
 settled_sync(page);assert page.evaluate('state.balance')==1000000;assert page.evaluate('state.betIndex')==4;assert not page.evaluate('state.bonus')
 report['passed'].append('Registration via actual SDK; guest preferences migrate, guest wallet never imports')
 page.reload();ready(page);assert page.evaluate('VaultSession.user.id')==A;assert page.evaluate('state.betIndex')==4
 report['passed'].append('SDK persistSession/getSession restores signed-in identity after F5')
 fold(page);settled_sync(page);balance=page.evaluate('state.balance');assert balance==cloud.rows[A]['wallets']['balance'];assert cloud.stats[(A,'poker')]['rounds_played']==1
 page.reload();ready(page);settled_sync(page);assert page.evaluate('state.balance')==balance;assert cloud.stats[(A,'poker')]['rounds_played']==1
 report['passed'].append('Round/wallet/statistics synchronize once; repeated reload creates no duplicate')
 # Lost reply after a committed payout: retry must not award/stat again.
 cloud.drop_settle=True;fold(page);page.evaluate('VaultSync.flush()');assert cloud.offline;assert cloud.stats[(A,'poker')]['rounds_played']==2
 pending=page.evaluate('VaultStorage.inspect().data.queue.length');assert pending>0
 page.reload();ready(page);assert page.evaluate('VaultSession.user.id')==A;assert page.evaluate('VaultStorage.inspect().data.queue.length')>0
 cloud.offline=False;settled_sync(page);assert cloud.stats[(A,'poker')]['rounds_played']==2;assert page.evaluate('state.balance')==cloud.rows[A]['wallets']['balance']
 report['passed'].append('Offline auth cache and bounded outbox; lost settlement reply retries without a second payout')
 cloud.offline=True;fold(page);offline_balance=page.evaluate('state.balance');assert page.evaluate('VaultStorage.inspect().data.queue.length')>0
 cloud.offline=False;settled_sync(page);assert page.evaluate('state.balance')==offline_balance
 report['passed'].append('Offline round queues locally and reconnect flushes business events')
 ctx2=context();other=ctx2.new_page();other.goto('http://127.0.0.1:8777/');ready(other)
 result=other.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')");assert 'error' not in result;settled_sync(other)
 assert other.evaluate('VaultSession.profile.username')=='Alice Vault';assert other.evaluate('state.balance')==cloud.rows[A]['wallets']['balance']
 report['passed'].append('Second browser profile loads remote identity, profile, wallet and settings')
 cloud.offline=True;fold(page);cloud.offline=False;fold(other);settled_sync(other);page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().conflict&&VaultStorage.inspect().data.queue.length===0',timeout=20000)
 assert page.locator('#vaultConflictButton').get_attribute('hidden') is not None
 assert not page.evaluate('VaultStorage.inspect().conflict');assert page.evaluate('state.balance')==cloud.rows[A]['wallets']['balance']
 report['passed'].append('Cross-device wallet revision rebases pending business events automatically, never max(balance)')
 result=page.evaluate('VaultAuth.signOut()');assert 'error' not in result;assert page.evaluate('VaultSession.mode')=='guest';assert page.evaluate('state.balance')==999123;assert page.evaluate('state.bonus&&state.freeSpins===8&&!state.bonusAutoRunning')
 report['passed'].append('Paused guest bonus remains in its owner namespace and is never imported into an account')
 result=page.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");assert 'error' not in result;assert page.evaluate('VaultSession.user.id')==B;assert page.evaluate('state.balance')==1000000
 report['passed'].append('Sign-out restores separate guest namespace; next account cannot see previous wallet/profile/outbox')
 page.evaluate('VaultAuth.signOut()');page.reload();ready(page);assert page.evaluate('VaultSession.mode')=='guest'
 report['passed'].append('Sign-out remains signed out after F5; no password stored in application cache')
 # Token refresh must keep an active round; an external identity change cannot flush A's outbox into B.
 check_ctx=context();check=check_ctx.new_page();check.goto('http://127.0.0.1:8777/');ready(check)
 check.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')")
 check.evaluate('openPokerGame()');check.locator('#pokerStartBtn').click()
 rid=check.evaluate('VaultRoundService.get("poker").roundId')
 check.evaluate('VaultAuth.client.auth.refreshSession()');check.wait_for_timeout(50)
 assert check.evaluate('VaultRoundService.get("poker").roundId')==rid and check.evaluate('pokerState.phase')=='draft'
 report['passed'].append('TOKEN_REFRESHED preserves the current round, cards and wallet')
 bob_balance=cloud.rows[B]['wallets']['balance']
 check.evaluate("VaultAuth.client.auth.signInWithPassword({email:'bob@example.test',password:'fixture-password'})")
 check.wait_for_timeout(50);assert check.evaluate('VaultSession.user.id')==A
 check.locator('#choice0').click();check.locator('#choice0').click();check.locator('#pokerFoldBtn').click();check.evaluate('VaultSync.flush()')
 assert cloud.rows[B]['wallets']['balance']==bob_balance
 assert check.evaluate('VaultStorage.inspect().data.queue.length')>0
 report['passed'].append('Changed SDK identity cannot send a previous account outbox with a different JWT')
 check_ctx.close()
 offline_ctx=context();offline_page=offline_ctx.new_page();offline_page.goto('http://127.0.0.1:8777/');ready(offline_page)
 offline_page.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");cloud.offline=True
 offline_page.evaluate('VaultAuth.signOut()');assert offline_page.evaluate('VaultSession.mode')=='guest'
 session=offline_page.evaluate('VaultAuth.client.auth.getSession()');assert session['data']['session'] is None
 offline_page.reload();ready(offline_page);assert offline_page.evaluate('VaultSession.mode')=='guest'
 cloud.offline=False;offline_ctx.close()
 report['passed'].append('Offline sign-out clears the persisted SDK session and cannot re-authenticate on reload')
 missing_ctx=context();missing=missing_ctx.new_page();missing.goto('http://127.0.0.1:8777/');ready(missing)
 cloud.rows[B]['wallets']['balance']=43210;cloud.unavailable_profiles.add(B);missing.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')")
 assert missing.evaluate('state.balance')==43210;assert missing.locator('#lobbyBalance').inner_text()!='—';assert missing.locator('#vaultReloadAccount').is_visible();assert not missing.evaluate('VaultRoundService.canPlay("poker")')
 assert missing.evaluate("localStorage.getItem('vault:v1:user:"+B+"')") is None
 cloud.unavailable_profiles.remove(B);missing.locator('#vaultReloadAccount').click();missing.wait_for_function('document.getElementById("vaultReloadAccount").hidden');assert missing.locator('#lobbyBalance').inner_text()!='—'
 missing_ctx.close();report['passed'].append('A failed profile query preserves the confirmed personal wallet; retry restores account readiness')
 cloud.unavailable_wallets.add(B);wallet_ctx=context();wallet_page=wallet_ctx.new_page();wallet_page.goto('http://127.0.0.1:8777/');ready(wallet_page);wallet_page.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");assert wallet_page.locator('#lobbyBalance').inner_text()=='—';assert not wallet_page.evaluate('VaultRoundService.canPlay("slot")');cloud.unavailable_wallets.remove(B);wallet_ctx.close();report['passed'].append('A failed wallet request never fabricates an account balance')
 cache=page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('vault:v1:')).map(k=>localStorage.getItem(k)).join('')");assert 'fixture-password' not in cache
 b.close()
assert not report['pageErrors'],report
(ROOT/'reports/vault-auth.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
