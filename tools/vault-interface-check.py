"""Mandatory auth entry/shared VAULT shell using isolated SDK/API fixtures."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py')
namespace={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),namespace)
globals().update({k:v for k,v in namespace.items() if not k.startswith('__')})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000});ctx.route('https://**',lambda r:r.abort());ctx.route('https://cdn.jsdelivr.net/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SDK));ctx.route('https://vault-test.supabase.co/**',cloud.route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(status=200,content_type='text/html',body=HTML))
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready')
 assert page.locator('#vaultAuthDialog').is_visible() and not page.locator('#lobbyBalance').is_visible()
 page.locator('#vaultAuthSwitch').click();assert page.locator('#vaultUsernameField').is_visible();page.locator('#vaultAuthSwitch').click();
 page.keyboard.press('Escape');assert page.locator('#vaultAuthDialog').is_visible()
 page.evaluate('openSlotGame();openPokerGame();openBirdGame()');assert page.evaluate('currentGame')=='lobby';assert not page.evaluate("VaultRoundService.canPlay('slot')")
 page.screenshot(path='/workspace/output/vault-entry-desktop.png')
 page.locator('#vaultAuthEmail').fill('alice@example.test');page.locator('#vaultAuthPassword').fill('fixture-password');page.locator('#vaultAuthSubmit').click();page.wait_for_function("VaultSession.mode==='authenticated'")
 page.wait_for_function("!document.getElementById('vaultAuthDialog').open")
 for game in ['slot','poker','bird']:
  page.evaluate({'slot':'openSlotGame()','poker':'openPokerGame()','bird':'openBirdGame()'}[game]);assert page.locator('.lobby-top').is_visible();assert page.locator('#lobbyBalance').is_visible()
 page.evaluate('openSlotGame()');page.wait_for_timeout(600);page.screenshot(path='/workspace/output/derby-shell-desktop.png',full_page=True)
 for width in [1440,1024,768,390,320]:
  page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  if width>=1024:
   bounds=page.evaluate('''()=>{const a=document.querySelector('.player-zone-left').getBoundingClientRect(),b=document.querySelector('.player-zone-right').getBoundingClientRect(),g=document.getElementById('grid').getBoundingClientRect();return {heightDiff:Math.abs(a.height-b.height),leftOK:a.right<=g.left,rightOK:b.left>=g.right}}''');assert bounds['heightDiff']<1 and bounds['leftOK'] and bounds['rightOK'],bounds
  page.evaluate('state.size=8;fillGrid();render();resizeCell()');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.evaluate('state.size=5;fillGrid();render();resizeCell()')
  if width==390:page.screenshot(path='/workspace/output/derby-shell-mobile.png',full_page=True)
 page.evaluate('openPokerGame()');page.locator('#pokerStartBtn').click();page.locator('#choice0').click();page.locator('#choice0').click();page.locator('#pokerFoldBtn').click();balance=page.evaluate('state.balance');page.reload();page.wait_for_function('VaultSession.ready');assert page.evaluate('state.balance')==balance
 page.evaluate('openLobby()');page.locator('#vaultProfileMenu summary').click();page.locator('#vaultSignOut').click();page.wait_for_function("VaultSession.mode==='guest'");assert page.locator('#vaultAuthDialog').is_visible() and not page.locator('#lobbyBalance').is_visible()
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/workspace/output/vault-entry-mobile.png');assert not errors,errors
 result={'authGate':True,'sharedShellThreeGames':True,'reloadBalance':True,'viewports':[1440,1024,768,390,320],'consoleErrors':errors};(ROOT/'reports/vault-interface.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
 b.close()
