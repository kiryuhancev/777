"""Critter schema detection and recovery through the actual SDK; no live DB access."""
from pathlib import Path
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0].replace("reply({'version':1})","reply({'version':2})"),str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
passed=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for failure in [503,404,403]:
  cloud=Cloud();counter={'calls':0,'failure':failure};errors=[]
  ctx=b.new_context();ctx.route('https://**',lambda r:r.abort())
  def route(r):
   if r.request.url.endswith('/critter_capabilities'):
    counter['calls']+=1
    if counter['failure'] and (counter['failure']!=503 or counter['calls']==1):
     status=counter['failure'];code='PGRST202' if status==404 else '42501' if status==403 else 'temporary'
     return r.fulfill(status=status,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps({'code':code,'message':'Fixture unavailable'}))
   return critter_route(r)
  ctx.route('https://vault-test.supabase.co/**',route)
  ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready')
  page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.evaluate('VaultCritter.open()')
  if failure==503:
   assert page.evaluate('VaultCritter.inspect().ready')
   assert counter['calls']==2 and page.locator('#critterReconnect').is_hidden()
  else:
   assert page.locator('#critterSpin').is_disabled()
   assert counter['calls']==1
   assert ('БД не видит' if failure==404 else 'Нет доступа') in page.locator('#critterMessage').inner_text()
   before=page.evaluate('state.balance');counter['failure']=0
   page.locator('#critterReconnect').click();page.wait_for_function('VaultCritter.inspect().ready')
   assert page.locator('#critterSpin').is_enabled() and page.evaluate('state.balance')==before
  assert not errors,errors
  ctx.close();passed.append(f'{failure}: correct diagnosis, bounded requests, recovery without reload or charge')
 b.close()
print('\n'.join('PASS '+s for s in passed))
