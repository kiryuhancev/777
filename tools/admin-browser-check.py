"""Admin panel UI against the real SDK contract; real authorization separately tested in PostgreSQL."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
D='dddddddd-dddd-4ddd-8ddd-dddddddddddd';cloud.create(D,'al.kiryuhancev@yandex.ru','Administrator');errors=[];passed=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def context():
  c=browser.new_context(viewport={'width':1440,'height':1000});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));return c
 def login(c,email):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',email);return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().conflict&&!VaultStorage.inspect().data.queue.length',timeout=20000)
 def open_admin(pg):pg.locator('#vaultProfileMenu summary').click();pg.locator('#vaultAdminOpen').click();pg.wait_for_function('document.querySelectorAll("#vaultAdminUsers>button").length>0')
 userctx=context();u=login(userctx,'bob@example.test');assert u.locator('#vaultAdminOpen').is_hidden();denied=u.evaluate('()=>VaultAdminService.users("",0).then(()=>false,()=>true)');assert denied
 passed.append('Ordinary user sees no admin entry and private RPC rejects direct invocation')
 adminctx=context();a=login(adminctx,'al.kiryuhancev@yandex.ru');a.wait_for_function('VaultAdmin.authorized');open_admin(a);assert a.locator('#vaultAdminUsers>button').count()==3
 a.locator('#vaultAdminQuery').fill('bob@example.test');a.locator('#vaultAdminSearch button[type=submit]').click();a.wait_for_function('document.querySelectorAll("#vaultAdminUsers>button").length===1');a.locator('#vaultAdminUsers>button').click();a.wait_for_function('!document.getElementById("vaultAdminDetail").hidden')
 a.locator('#vaultAdminAmount').fill('100');a.locator('#vaultAdminReason').fill('Manual test credit');before=cloud.rows[B]['wallets']['balance'];a.locator('#vaultAdminBalanceForm button').click();a.wait_for_function('document.getElementById("vaultAdminStatus").textContent.includes("Изменения сохранены")');assert cloud.rows[B]['wallets']['balance']==before+100;assert len(cloud.admin_audit)==1
 passed.append('Authorized admin searches users, credits exact amount and sees a logged reason')
 # Lost reply commits once. A visible retry carries the same request UUID.
 cloud.drop_admin=True;a.locator('#vaultAdminAmount').fill('50');a.locator('#vaultAdminReason').fill('Retry after lost reply');a.locator('#vaultAdminBalanceForm button').click();a.wait_for_function('document.getElementById("vaultAdminStatus").textContent.includes("Не удалось")');assert cloud.rows[B]['wallets']['balance']==before+150
 a.locator('#vaultAdminBalanceForm button').click();a.wait_for_function('document.getElementById("vaultAdminStatus").textContent.includes("Изменения сохранены")');assert cloud.rows[B]['wallets']['balance']==before+150;assert len(cloud.admin_audit)==2
 passed.append('Lost admin reply + retry uses one UUID and cannot credit twice')
 # Stale screen must not overwrite money changed since selection.
 cloud.rows[B]['wallets']['balance']+=25;cloud.rows[B]['wallets']['revision']+=1;a.locator('#vaultAdminOperation').select_option('set');a.locator('#vaultAdminAmount').fill('42');a.locator('#vaultAdminReason').fill('Stale absolute value');a.locator('#vaultAdminBalanceForm button').click();a.wait_for_function('document.getElementById("vaultAdminStatus").textContent.includes("Баланс уже изменился")');assert cloud.rows[B]['wallets']['balance']==before+175
 passed.append('Stale wallet revision rejects an absolute overwrite and refreshes the displayed user')
 # Already-started Mines remains finishable; fresh bets are blocked.
 u.evaluate('VaultMines.open()');u.wait_for_function('VaultMines.inspect().ready');u.locator('#minesAction').click();sync(u)
 a.locator('#vaultAdminAccessReason').fill('Pause new bets');a.locator('#vaultAdminAccessToggle').click();a.wait_for_function('document.getElementById("vaultAdminStatus").textContent.includes("Изменения сохранены")');assert cloud.access[B] is False
 u.evaluate('VaultAccess.refresh()');u.wait_for_function('VaultAccess.isBlocked');i=u.evaluate('()=>{const r=VaultMines.inspect().round;return Array.from({length:25},(_,i)=>i).find(i=>!r.minePositions.includes(i))}');u.locator('.mines-tile').nth(i).click();u.locator('#minesAction').click();sync(u);assert u.evaluate('VaultMines.inspect().status')=='CASHED_OUT';balance=u.evaluate('state.balance');u.locator('#minesAction').click();assert u.evaluate('state.balance')==balance
 a.locator('#vaultAdminRefresh').click();a.wait_for_function('document.getElementById("vaultAdminUserMeta").textContent.includes("Раундов: 1")');a.wait_for_function('document.getElementById("vaultAdminRounds").textContent.includes("MINES")')
 passed.append('Admin pauses fresh bets; user finishes accepted Mines without losing payout; activity shows the round')
 a.locator('#vaultAdminAccessReason').fill('Allow play');a.locator('#vaultAdminAccessToggle').click();a.wait_for_function('document.getElementById("vaultAdminStatus").textContent.includes("Изменения сохранены")');u.evaluate('VaultAccess.refresh()');u.wait_for_function('!VaultAccess.isBlocked');u.locator('#minesAction').click();assert u.evaluate('VaultMines.inspect().status')=='PLAYING';mine=u.evaluate('VaultMines.inspect().round.minePositions[0]');u.locator('.mines-tile').nth(mine).click();sync(u)
 passed.append('Unblock is reflected automatically and fresh play resumes')
 # Self balance update refreshes the shared header only after the authorized RPC commits.
 a.locator('#vaultAdminQuery').fill('al.kiryuhancev@yandex.ru');a.locator('#vaultAdminSearch button[type=submit]').click();a.wait_for_function('document.querySelectorAll("#vaultAdminUsers>button").length===1');a.locator('#vaultAdminUsers>button').click();a.locator('#vaultAdminOperation').select_option('credit');a.locator('#vaultAdminAmount').fill('321');a.locator('#vaultAdminReason').fill('Own test wallet');a.locator('#vaultAdminBalanceForm button').click();a.wait_for_function('state.balance===1000321');assert a.locator('#vaultAdminAccessToggle').is_disabled()
 passed.append('Admin own balance refreshes the canonical header; admin account cannot be blocked')
 for width,height in [(1440,1000),(390,844),(320,720)]:
  a.set_viewport_size({'width':width,'height':height});a.wait_for_timeout(50);assert a.locator('#vaultAdminDialog').evaluate('n=>n.scrollWidth<=n.clientWidth+1'),width
  if width in [1440,390]:a.screenshot(path=str(ROOT/'previews'/f'admin-{width}.png'),full_page=True)
 passed.append('Admin panel fits desktop and 390/320 mobile widths')
 a.locator('#vaultAdminClose').click();a.evaluate('VaultAuth.signOut()');assert a.locator('#vaultAdminOpen').is_hidden();assert a.locator('#vaultAdminUsers').inner_text()=='';assert a.locator('#vaultAdminUserMeta').inner_text()=='';assert a.locator('#vaultAdminAudit').inner_text()=='';assert a.locator('#vaultAdminQuery').input_value()==''
 passed.append('Sign-out clears admin role, selected user, dialog and private list')
 # A block discovered only by the backend must unwind an unaccepted local stake automatically.
 sync(u);u.evaluate('openLobby()');cloud.access[B]=False;u.evaluate('openPokerGame()');u.locator('#pokerStartBtn').click();u.locator('#choice0').click();u.locator('#choice0').click();u.locator('#pokerFoldBtn').click();sync(u);assert u.evaluate('VaultAccess.isBlocked');assert u.evaluate('state.balance')==cloud.rows[B]['wallets']['balance'];passed.append('Backend-only block rejects queued new stake and automatically restores the confirmed wallet')
 browser.close()
assert not errors,errors
report={'mode':'Chromium + real SDK with HTTP fixture, not live Supabase','passed':passed,'pageErrors':errors};(ROOT/'reports/admin-browser.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
