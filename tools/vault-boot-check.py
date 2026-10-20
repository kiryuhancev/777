"""Exercise independent early guard with hung init and a script crash; no account mutation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent;guard=(root/'vault/boot.js').read_text();css=(root/'vault/auth.css').read_text();checks=[]
html=(root/'index.html').read_text();assert html.index('<meta charset=')<1024;assert html.index('BEGIN VAULT BOOT GUARD')<html.index('BEGIN VAULT RUNTIME');
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mode in ['healthy','hung','crash']:
  page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # Scale only guard deadline; the application itself has no timing/financial changes.
  early="const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms===30000?80:ms,...a);"
  script="document.body.classList.remove('vault-booting');document.getElementById('vaultBoot').hidden=true;" if mode=='healthy' else "throw new Error('fixture-startup-crash')" if mode=='crash' else ''
  html=f"<html><head><script>{early}{guard}</script><style>{css}</style></head><body class='vault-booting'><div id='vaultBoot' class='vault-boot'>VAULT</div><main id='private'>PRIVATE BALANCE</main><script>{script}</script></body></html>"
  page.route('http://boot.test/**',lambda r:r.fulfill(body=html,content_type='text/html'));page.goto('http://boot.test/');page.evaluate("localStorage.setItem('vault:v1:user:test','preserve-me')");page.wait_for_timeout(150)
  if mode=='healthy':assert page.locator('#vaultBootRecovery').count()==0 and page.evaluate('VaultBootDiagnostics.inspect().finished')
  else:
   assert page.locator('#vaultBootRecovery button').is_visible();assert page.locator('#private').is_hidden();assert page.evaluate("localStorage.getItem('vault:v1:user:test')")=='preserve-me'
   assert page.locator('#vaultBootDiagnostic').inner_text().startswith('JS_STARTUP_ERROR' if mode=='crash' else 'STARTUP_PENDING')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if mode=='hung':
    page.screenshot(path='/workspace/output/vault-boot-recovery-mobile.png')
    page.evaluate("document.body.classList.remove('vault-booting');document.getElementById('vaultBoot').hidden=true")
    page.wait_for_function('VaultBootDiagnostics.inspect().finished');assert page.locator('#vaultBootRecovery').count()==0
  checks.append(mode+': correct gated recovery without changing storage/auth/readiness');page.close()
 b.close()
print('\n'.join('PASS '+s for s in checks));(root/'reports/vault-boot.json').write_text(json.dumps({'passed':checks,'mode':'isolated early-guard browser test'},indent=2)+'\n')
