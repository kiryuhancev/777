"""Autoplay never makes a risk decision; STOP cancels the pending next paid spin."""
from pathlib import Path
source=Path(__file__).with_name('heist-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def setup(email,freeze):
  c=b.new_context();c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  if freeze:c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms===500?100000:ms,...a)')
  pg=c.new_page();pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',email);pg.evaluate('VaultHeist.open()');pg.wait_for_function('VaultHeist.inspect().ready');pg.evaluate('state.fastGame=true');return c,pg
 def auto(pg,trigger):pg.evaluate('''trigger=>{let seed;for(let s=1;s<10000;s++){const r=VAULT_HEIST_MODEL.start({seed:s,bet:20,roundId:crypto.randomUUID()});if(VAULT_HEIST_MODEL.active(r)===trigger){seed=s;break;}}const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=seed;return a};const n=document.getElementById('heistAuto');n.value='10';n.dispatchEvent(new Event('change'));crypto.getRandomValues=old;}''',trigger);pg.wait_for_function('!VaultHeist.isBusy')
 c,pg=setup('alice@example.test',True);auto(pg,True);assert pg.evaluate('VaultHeist.inspect().auto')==9
 for i in range(3):pg.locator('#heistSpin').click();pg.wait_for_function('!VaultHeist.isBusy')
 assert pg.evaluate('VaultHeist.inspect().auto')==0;assert pg.locator('#heistChoice').is_visible();saved=pg.evaluate('VaultHeist.getCheckpoint()');pg.wait_for_timeout(700);assert pg.evaluate('VaultHeist.getCheckpoint()')==saved;c.close()
 c,pg=setup('bob@example.test',False);auto(pg,False);rid=pg.evaluate('VaultHeist.getCheckpoint().roundId');pg.select_option('#heistAuto','0');pg.wait_for_timeout(750);assert pg.evaluate('VaultHeist.getCheckpoint().roundId')==rid;c.close();b.close()
print('PASS AUTO pauses on choice without selecting either action; STOP cancels pending next paid spin')
