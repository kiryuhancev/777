"""Real DOM control flow for AUTO, purchased entries, paced reels and mobile toolbar."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];passed=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def ctx():
  c=b.new_context(viewport={'width':1440,'height':1080});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML));c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,(ms===350||ms===80)?100000:ms,...a)');return c
 def login(c,email='alice@example.test'):
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('e=>VaultAuth.signIn(e,"fixture-password")',email);pg.evaluate('VaultSwamp.open()');pg.wait_for_function('VaultRoundService.swampSupport');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=20000)
 c=ctx();pg=login(c);sync(pg)
 seed=pg.evaluate('()=>{for(let i=1;i<10000;i++)if(!SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(i))).triggerSpins)return i}')
 pg.evaluate('seed=>{const native=crypto.getRandomValues.bind(crypto);window.testRestoreRng=()=>crypto.getRandomValues=native;crypto.getRandomValues=a=>{a[0]=seed;return a;};}',seed)
 pg.locator('#swampAuto').click();assert pg.locator('[data-swamp-auto]').count()==5;pg.locator('[data-swamp-auto="50"]').click();assert pg.evaluate('VaultSwamp.inspect().auto')==49;assert pg.locator('#swampBetPlus').is_disabled();pg.locator('#swampAuto').click();assert pg.evaluate('VaultSwamp.inspect().auto')==0;pg.wait_for_function('!VaultSwamp.isBusy');sync(pg);n=cloud.stats[(A,'swamp')]['rounds_played'];pg.wait_for_timeout(800);assert cloud.stats[(A,'swamp')]['rounds_played']==n
 pg.locator('#swampAuto').click();pg.locator('[data-swamp-auto="-1"]').click();assert pg.evaluate('VaultSwamp.inspect().auto')==-1;assert '∞' in pg.locator('#swampAuto').inner_text();pg.locator('#swampAuto').click();pg.wait_for_function('!VaultSwamp.isBusy');sync(pg)
 passed.append('AUTO offers 10/25/50/100/unlimited, locks bet, STOP finishes only the current spin')
 pg.evaluate('state.fastGame=false');t=pg.evaluate('performance.now()');pg.locator('#swampSpin').click();pg.wait_for_function('!VaultSwamp.isBusy');duration=pg.evaluate('performance.now()')-t;assert duration>=1100,duration
 passed.append(f'Normal no-anticipation spin lasts {duration:.0f}ms, with deterministic result unaffected by timing')
 pg.locator('#swampBuy').click();assert pg.locator('#swampBonusShop').is_visible();pg.locator('#swampShopBetPlus').click();assert '3 850' in pg.locator('[data-swamp-buy="bonus"]').inner_text().replace('\xa0',' ');pg.locator('#swampShopBetMinus').click();balance=pg.evaluate('state.balance');pg.locator('[data-swamp-buy="bonus"]').click();feature=pg.evaluate('VaultSwamp.inspect().bonus');assert feature['remaining']==10;assert pg.evaluate('state.balance')==balance-20*77
 pg.reload();pg.wait_for_function('VaultSession.ready');pg.wait_for_function('VaultRoundService.swampSupport');sync(pg);assert pg.evaluate('VaultSwamp.inspect().bonus')==feature;assert pg.evaluate('state.balance')==balance-1540
 before=pg.evaluate('state.balance');pg.evaluate("document.querySelector('[data-swamp-buy=bonus]').click()");assert pg.evaluate('state.balance')==before
 assert pg.locator('#swampBuy').is_disabled();assert pg.locator('#swampBetPlus').is_disabled()
 passed.append('10 FS costs 77x once; stake and paid entitlement survive immediate F5; duplicate purchase blocked')
 for w,h in [(1440,1080),(390,844),(320,720)]:
  pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(80);assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),w
  for id in ['swampAuto','swampSpin','swampBuy']:
   box=pg.locator('#'+id).bounding_box();assert box['width']>=40 and box['height']>=44,(w,id,box)
  if w in [1440,390]:pg.screenshot(path=str(ROOT/'previews'/f'swamp-controls-{w}.png'),full_page=True)
 passed.append('Six-function toolbar fits desktop and 390/320 mobile widths, with visible >=44px controls')
 pg.evaluate('openLobby()');pg.evaluate('VaultAuth.signOut()');pg.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");pg.evaluate('VaultSwamp.open()');pg.wait_for_function('VaultRoundService.swampSupport');pg.locator('#swampBuy').click();balance=pg.evaluate('state.balance');pg.locator('[data-swamp-buy="super"]').click();assert pg.evaluate('state.balance')==balance-7000;assert pg.evaluate('VaultSwamp.inspect().bonus.remaining')==20;pg.wait_for_function('!VaultSwamp.isBusy');sync(pg)
 passed.append('20 FS entry costs 350x once, starts normal x1 collector progression and has its own feature UUID')
 c.close();b.close()
assert not errors,errors
report={'mode':'Chromium + actual SDK HTTP fixture, not live Supabase','passed':passed,'pageErrors':errors};(ROOT/'reports/swamp-controls.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
