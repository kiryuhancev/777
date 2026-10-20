"""Review regressions: cacheable Pages build, HUD layout work and stale identities.
Uses real Chromium/SDK and owned HTTP fixtures; never production accounts.
"""
from pathlib import Path
import json,re,mimetypes
from urllib.parse import urlsplit
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
web=(ROOT/'_site/index.html').read_text();web=re.sub(r"supabaseUrl: '[^']*'","supabaseUrl: 'https://vault-test.supabase.co'",web,count=1);web=re.sub(r"supabaseAnonKey: '[^']*'",f"supabaseAnonKey: '{PUBLIC}'",web,count=1)
D='dddddddd-dddd-4ddd-8ddd-dddddddddddd';cloud.create(D,'al.kiryuhancev@yandex.ru','Administrator');errors=[];requests=[];held=[];mode={'hold':None};checks=[]
def api(r):
 if mode['hold']=='profile' and r.request.method=='PATCH' and '/profiles?' in r.request.url:held.append(r);return
 if mode['hold']=='refresh' and r.request.method=='GET' and '/profiles?' in r.request.url:held.append(r);mode['hold']=None;return
 if mode['hold']=='admin' and r.request.url.endswith('/vault_admin_users'):held.append(r);return
 return critter_route(r)
def site(r):
 path=urlsplit(r.request.url).path.removeprefix('/777/');p=(ROOT/'_site'/path).resolve()
 if path in ('','index.html'):return r.fulfill(body=web,content_type='text/html')
 if p.is_relative_to((ROOT/'_site').resolve()) and p.is_file():requests.append(path);return r.fulfill(body=p.read_bytes(),content_type=mimetypes.guess_type(p)[0] or 'application/octet-stream')
 return r.fulfill(status=404,body='Missing')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',api);ctx.route('http://127.0.0.1:8777/**',site)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")')
 for op in ['openSlotGame()','openPokerGame()','openBirdGame()','VaultTables.open("blackjack")','VaultTables.open("baccarat")','VaultMines.open()','VaultHeist.open()','VaultMagnet.open()','VaultCritter.open()','VaultSwamp.open()']:
  page.evaluate(op);page.wait_for_timeout(150)
  page.wait_for_function("()=>[...document.images].filter(i=>i.getAttribute('src')?.startsWith('assets/embedded/')).every(i=>i.complete&&i.naturalWidth>0)")
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),op
 checks.append('Cacheable build works at nested /777/: auth and all10 game screens, real image decode, mobile bounds, no missing relative URLs')
 page.evaluate('()=>{openLobby();window.reviewBirdFrames=0;const originalBirdLoop=birdLoop;birdLoop=now=>{window.reviewBirdFrames++;originalBirdLoop(now);};}')
 page.wait_for_timeout(150);assert page.evaluate('window.reviewBirdFrames')==0
 page.evaluate('openBirdGame()');page.wait_for_timeout(250);assert page.evaluate('window.reviewBirdFrames')>=2
 page.evaluate('openLobby()');page.wait_for_timeout(50);count=page.evaluate('window.reviewBirdFrames');page.wait_for_timeout(150);assert page.evaluate('window.reviewBirdFrames')==count
 page.evaluate('openBirdGame()');page.wait_for_timeout(100);count=page.evaluate('window.reviewBirdFrames');page.wait_for_timeout(150);assert page.evaluate('window.reviewBirdFrames')>count
 page.evaluate("window.reviewHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.reviewHidden});document.dispatchEvent(new Event('visibilitychange'));");count=page.evaluate('window.reviewBirdFrames');page.wait_for_timeout(150);assert page.evaluate('window.reviewBirdFrames')==count
 page.evaluate("window.reviewHidden=false;document.dispatchEvent(new Event('visibilitychange'));");page.wait_for_timeout(150);assert page.evaluate('window.reviewBirdFrames')>count
 checks.append('Bird RAF sleeps in lobby/hidden document and resumes on entry/visibility without a duplicate loop')
 page.evaluate('VaultCritter.open()');page.wait_for_timeout(300)
 layout=page.evaluate('''()=>{const n=document.querySelector('#critterApp .slot-balance strong'),d=Object.getOwnPropertyDescriptor(Element.prototype,'scrollWidth');let reads=0;Object.defineProperty(Element.prototype,'scrollWidth',{configurable:true,get(){if(this===n)reads++;return d.get.call(this)}});BalanceDisplay.render(n,5323202.373411);const start=reads;for(let i=0;i<100;i++)BalanceDisplay.render(n,5323202.373411);const repeated=reads-start;n.textContent='external update';BalanceDisplay.render(n,5323202.373411);const external=reads-start-repeated;Object.defineProperty(Element.prototype,'scrollWidth',d);return {repeated,external,text:n.textContent};}''')
 assert layout['repeated']==0 and layout['external']>0,layout
 page.set_viewport_size({'width':320,'height':844});page.wait_for_timeout(200);assert page.evaluate("document.querySelector('#critterApp .slot-balance strong').scrollWidth<=document.querySelector('#critterApp .slot-balance strong').clientWidth+1")
 checks.append('100 unchanged balance renders: zero scrollWidth reads; external text/resize invalidate layout; mobile formatting remains correct')
 page.evaluate('openLobby()');mode['hold']='profile';page.evaluate("()=>{window.profileTask=VaultProfileService.update({username:'Alice updated'});}");page.wait_for_timeout(100);assert len(held)==1
 page.evaluate('VaultAuth.signOut()');page.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');mode['hold']=None
 r=held.pop();profile={**cloud.rows[A]['profiles'],'username':'Alice updated'};r.fulfill(content_type='application/json',body=json.dumps(profile),headers={'Access-Control-Allow-Origin':'*'});result=page.evaluate('window.profileTask');assert result['error']=='Session changed',result;assert page.evaluate('VaultSession.user.id')==B and page.evaluate('VaultSession.profile.username')=='Bob'
 checks.append('Delayed Alice profile PATCH after signout/Bob signin never replaces Bob profile or persisted identity')
 page.evaluate('VaultAuth.signOut()');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');mode['hold']='refresh';page.evaluate('()=>{window.refreshTask=document.getElementById("vaultReloadAccount").onclick();}');page.wait_for_timeout(100);assert len(held)==1
 page.evaluate('VaultAuth.signOut()');page.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');bob_balance=page.evaluate('VaultWalletService.getBalance()')
 held.pop().fulfill(content_type='application/json',body=json.dumps(cloud.rows[A]['profiles']),headers={'Access-Control-Allow-Origin':'*'});page.evaluate('window.refreshTask');page.wait_for_timeout(50)
 assert page.evaluate('VaultSession.user.id')==B and page.evaluate('VaultSession.profile.username')=='Bob' and page.evaluate('VaultWalletService.getBalance()')==bob_balance
 checks.append('Delayed same-account refresh after A→B switch cannot apply A wallet/profile/recovery to B')
 page.evaluate('VaultAuth.signOut()');page.evaluate('VaultAuth.signIn("al.kiryuhancev@yandex.ru","fixture-password")');page.wait_for_function('VaultAdmin.authorized');page.locator('#vaultProfileMenu summary').click();page.locator('#vaultAdminOpen').click();page.wait_for_timeout(150)
 mode['hold']='admin';page.locator('#vaultAdminRefresh').click();page.wait_for_timeout(100);assert len(held)==1
 page.evaluate('VaultAuth.signOut()');page.evaluate('VaultAuth.signIn("bob@example.test","fixture-password")');mode['hold']=None;r=held.pop();r.fulfill(status=400,content_type='application/json',body=json.dumps({'message':'old admin request failed'}),headers={'Access-Control-Allow-Origin':'*'});page.wait_for_timeout(100)
 assert page.locator('#vaultAdminStatus').inner_text()=='' and not page.evaluate('VaultAdmin.authorized')
 checks.append('Delayed admin failure after identity switch cannot repopulate the next account admin UI')
 assert not errors,errors;assert requests;ctx.close();b.close()
report={'passed':checks,'pageErrors':errors,'imageRequests':len(requests),'uniqueImagesRequested':len(set(requests))};(ROOT/'reports/review-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
