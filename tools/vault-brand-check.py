"""Mandatory auth entry/shared VAULT shell using isolated SDK/API fixtures."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py')
namespace={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),namespace)
globals().update({k:v for k,v in namespace.items() if not k.startswith('__')})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context();c.route('https://**',lambda r:r.abort());c.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML))
 pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));checks=[]
 for width,height in [(1920,1080),(1440,900),(1366,768),(390,844),(360,800),(320,640)]:
  pg.set_viewport_size({'width':width,'height':height});pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready')
  for signup in [False,True]:
   if signup:pg.locator('#vaultAuthSwitch').click()
   assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert pg.locator('#vaultAuthSubmit').is_visible()
   assert pg.evaluate("()=>[...document.querySelectorAll('[data-vault-mark]')].every(i=>i.complete&&i.naturalWidth>0)")
   if width in [1440,390]:pg.screenshot(path=f'/workspace/output/vault-brand-{width}-'+('signup' if signup else 'signin')+'.png')
  pg.evaluate("VaultAuth.signIn('alice@example.test','fixture-password')")
  assert pg.locator('#lobbyBalance').is_visible()
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert pg.evaluate("()=>{const a=document.querySelector('.vault-brand-lockup').getBoundingClientRect(),b=document.querySelector('.lobby-balance').getBoundingClientRect();return a.right<=b.left||a.bottom<=b.top}")
  if width in [1440,390]:pg.screenshot(path=f'/workspace/output/vault-brand-{width}-lobby.png')
  pg.evaluate('VaultAuth.signOut()');checks.append([width,height])
 assert not errors,errors
 import subprocess,re
 before=subprocess.check_output(['git','show','HEAD:index.html'],cwd=ROOT,text=True)
 current=(ROOT/'index.html').read_text();assert re.search(r'<style>([\s\S]*?)</style>',before)[1]==re.search(r'<style>([\s\S]*?)</style>',current)[1]
 result={'viewports':checks,'consoleErrors':errors,'originalGameStylesUnchanged':True,'signInAndSignUpBranding':True,'balanceVisibleAfterLogin':True}
 (ROOT/'reports/vault-brand.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
