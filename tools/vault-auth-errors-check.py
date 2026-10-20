"""Failed login must be actionable, preserve typed fields and allow retry; real SDK fixture."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];passed=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,390]:
  cloud=Cloud();failure={'value':None};ctx=b.new_context(viewport={'width':width,'height':844})
  ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(content_type='application/javascript',body=SDK))
  def route(r):
   if failure['value'] and '/auth/v1/token' in r.request.url and r.request.method=='POST':
    code,status,message=failure['value'];return r.fulfill(status=status,headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body=json.dumps({'code':code,'msg':message}))
   return cloud.route(r)
  ctx.route('https://vault-test.supabase.co/**',route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');start=page.url
  for code,status,message,text in [('invalid_credentials',400,'Invalid login credentials','Неверный email'),('email_not_confirmed',400,'Email not confirmed','Подтвердите email'),('over_request_rate_limit',429,'Too many requests','Слишком много попыток'),('unexpected_failure',503,'Service unavailable','сервером авторизации')]:
   failure['value']=(code,status,message);page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('typed-password');page.locator('#vaultAuthSubmit').click();page.wait_for_function('!document.getElementById("vaultAuthSubmit").disabled')
   assert text in page.locator('#vaultAuthMessage').inner_text(),(code,page.locator('#vaultAuthMessage').inner_text())
   assert page.locator('#vaultAuthPassword').input_value()=='typed-password'
   assert page.locator('#vaultAuthEmail').input_value()=='alice@example.test'
   assert page.url==start and page.locator('#vaultAuthMessage').is_visible()
   assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
  if width==390:page.screenshot(path=str(ROOT.parent/'output'/'vault-auth-error-mobile.png'),full_page=True)
  failure['value']=None;page.locator('#vaultAuthSubmit').click();page.wait_for_function("VaultSession.mode==='authenticated'&&VaultSession.ready")
  assert page.locator('#vaultAuthPassword').input_value()=='' and not page.locator('#vaultAuthDialog').is_visible()
  page.reload();page.wait_for_function('VaultSession.ready');assert page.evaluate('VaultSession.user.id')==A
  ctx.close();passed.append(f'{width}px: invalid credentials / confirmation / rate limit / service failure preserve fields, show alert, retry and F5 succeed')
 # Vendored SDK boots with the CDN fully blocked.
 cloud=Cloud();ctx=b.new_context();ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',cloud.route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');assert page.evaluate('!!VaultAuth.client')
 page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('typed-password');page.locator('#vaultAuthSubmit').click();page.wait_for_function("VaultSession.mode==='authenticated'&&VaultSession.ready");ctx.close();passed.append('Embedded SDK signs in with the external CDN completely blocked')
 # An initial CDN failure can recover on ENTER without reloading the entire app.
 cloud=Cloud();ctx=b.new_context();attempts={'count':0}
 ctx.route('https://**',lambda r:r.abort())
 def sdk(r):
  attempts['count']+=1
  if attempts['count']==1:return r.abort()
  return r.fulfill(content_type='application/javascript',body=SDK)
 ctx.route('https://cdn.jsdelivr.net/**',sdk);ctx.route('https://vault-test.supabase.co/**',cloud.route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=re.sub(r'<!-- BEGIN SUPABASE SDK -->[\s\S]*?<!-- END SUPABASE SDK -->','',HTML)))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');assert page.evaluate('VaultAuth.client===null')
 page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('typed-password');page.locator('#vaultAuthSubmit').click();page.wait_for_function("VaultSession.mode==='authenticated'&&VaultSession.ready")
 assert attempts['count']==2;ctx.close();passed.append('Initial SDK download failure recovers on next submit without page reload')
 # Inline fallback prevents native form navigation if initialization fails before binding.
 ctx=b.new_context();page=ctx.new_page();page.set_content((ROOT/'vault/auth.html').read_text().replace('__VAULT_MARK__',''));page.evaluate("document.getElementById('vaultAuthDialog').showModal()")
 page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('typed-password');page.locator('#vaultAuthSubmit').click()
 assert page.url=='about:blank' and 'Не удалось запустить вход' in page.locator('#vaultAuthMessage').inner_text()
 ctx.close();passed.append('Fallback blocks native form submission before runtime initialization')
 # Slow mobile transport and a single transient failure recover without another ENTER.
 for scenario in ['slow','disconnect','gateway']:
  cloud=Cloud();ctx=b.new_context();attempts={'count':0}
  ctx.route('https://**',lambda r:r.abort())
  def resilient_route(r):
   if '/auth/v1/token?grant_type=password' in r.request.url and r.request.method=='POST':
    attempts['count']+=1
    if attempts['count']==1:
     if scenario=='slow':time.sleep(9)
     elif scenario=='disconnect':return r.abort('connectionreset')
     elif scenario=='gateway':return r.fulfill(status=503,headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body='{"msg":"Temporarily unavailable"}')
   return cloud.route(r)
  ctx.route('https://vault-test.supabase.co/**',resilient_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready')
  page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('typed-password');page.locator('#vaultAuthSubmit').click();page.wait_for_function("VaultSession.mode==='authenticated'&&VaultSession.ready",timeout=45000)
  assert attempts['count']==(1 if scenario=='slow' else 2),attempts
  page.reload();page.wait_for_function('VaultSession.ready');assert page.evaluate('VaultSession.user.id')==A
  ctx.close();passed.append(f'{scenario}: one submit signs in, bounded request count, F5 restores session')
 b.close()
assert not errors,errors
report={'mode':'Chromium and actual Supabase SDK with HTTP fixtures; not live backend','passed':passed,'pageErrors':errors}
(ROOT/'reports/vault-auth-errors.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
