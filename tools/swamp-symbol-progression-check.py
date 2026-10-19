"""Visual progression against actual SDK/HTTP fixture; no production result forcing."""
from pathlib import Path
import subprocess,re
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
base='1cf020f';errors=[];passed=[]
for f in ['swamp/config.js','swamp/model.js','vault/runtime.js','supabase_schema.sql','supabase_admin_swamp.sql']:
 assert subprocess.check_output(['git','show',f'{base}:{f}'],cwd=ROOT)==(ROOT/f).read_bytes(),f
old=subprocess.check_output(['git','show',base+':index.html'],cwd=ROOT).decode()
def normalize(s):
 for name in ['SWAMP STYLES','SWAMP SCREEN','SWAMP MODULE']:
  s=re.sub(r'<!-- BEGIN '+name+r' -->[\s\S]*?<!-- END '+name+r' -->','',s)
 return s
assert normalize(old)==normalize((ROOT/'index.html').read_text())
passed.append('All other games/lobby/auth/wallet/SQL and entire RNG/math config remain byte-identical')
out=ROOT.parent/'output';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def setup(count=None,remaining=30,reduced=False):
  cloud.rows[B]['wallets']['recovery']['swampBonus']=None if count is None else {'version':1,'featureId':'cccccccc-cccc-4ccc-8ccc-cccccccccccc','bet':20,'remaining':remaining,'collectors':count,'tier':min(3,count//4),'totalWinX':0,'spinsPlayed':0}
  c=browser.new_context(viewport={'width':1440,'height':1080},reduced_motion='reduce' if reduced else 'no-preference')
  c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',cloud.route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...args)=>nt(fn,(ms===350||ms===80)?100000:ms,...args)')
  pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate("VaultAuth.signIn('bob@example.test','fixture-password')");pg.evaluate('VaultSwamp.open()');pg.wait_for_function('VaultRoundService.swampSupport');pg.evaluate('state.fastGame=true;state.fastBonus=true');return c,pg
 def seed(pg,n,bonus=True):
  return pg.evaluate('''x=>{for(let s=1;s<200000;s++){const e=SWAMP_MODEL.evaluate(SWAMP_MODEL.generate(x.bonus,SWAMP_MODEL.seeded(s)));if((x.bonus?e.collectors.length:e.scatters)===x.n&&(x.n===0||!x.bonus||e.fish.length))return s}}''',{'n':n,'bonus':bonus})
 def play(pg,s):pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('swampSpin').click();crypto.getRandomValues=old;}''',s)
 def snap(pg,name):
  pg.wait_for_function("()=>[...document.querySelectorAll('#swampApp img[src]')].every(n=>n.complete&&n.naturalWidth)")
  pg.screenshot(path=str(out/name),full_page=True)
 c,pg=setup();assert not pg.locator('#swampFeatureBar').is_visible();assert pg.locator('#swampFeatureBar').evaluate('n=>n.getBoundingClientRect().height')==0
 play(pg,seed(pg,2,False));pg.wait_for_function('!VaultSwamp.isBusy');assert pg.locator('.swamp-cell.scatter').count()==2;snap(pg,'swamp-updated-base.png');c.close()
 passed.append('Base: new left-facing Scatter, no progression panel or reserved height')
 c,pg=setup(0);assert pg.locator('.swamp-progress-icon').count()==12;assert pg.locator('.swamp-progress-icon.active').count()==0;snap(pg,'swamp-updated-fs-0.png');c.close()
 for count,n in [(2,3),(5,1),(7,2),(11,2),(12,4)]:
  c,pg=setup(count);s=seed(pg,n);prior=pg.evaluate('VaultSwamp.inspect().bonus');expected=pg.evaluate('x=>SWAMP_MODEL.resolve(SWAMP_MODEL.generate(true,SWAMP_MODEL.seeded(x.s)),x.b)',{'s':s,'b':prior});before=pg.evaluate('state.balance');play(pg,s)
  pg.wait_for_selector('.swamp-flying-collector',state='attached');assert pg.locator('.swamp-cell').count()==15;assert pg.locator('.swamp-cell.collector').count()==n
  pg.wait_for_function('!VaultSwamp.isBusy');assert pg.locator('.swamp-progress-icon.active').count()==min(12,count+n);assert pg.evaluate('VaultSwamp.inspect().bonus')==expected['nextBonus'];assert pg.evaluate('state.balance')==round(before+expected['winX']*20,6)
  assert pg.locator('.swamp-flying-collector').count()==0
  if count==5:
   snap(pg,'swamp-updated-fs-6.png')
   for w,h in [(1024,768),(768,1024),(390,844),(320,720)]:
    pg.set_viewport_size({'width':w,'height':h});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),w
    assert pg.locator('#swampReels').is_visible();assert pg.locator('#swampSpin').is_visible()
    if w==390:snap(pg,'swamp-updated-fs-mobile.png')
  if count==11:snap(pg,'swamp-updated-fs-12.png')
  if count==12:assert pg.locator('#swampCurrentMultiplier').inner_text()=='×10';assert '+10' in pg.locator('#swampMilestoneMessage').inner_text()
  saved=pg.evaluate('VaultSwamp.inspect().bonus');balance=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready');assert pg.evaluate('VaultSwamp.inspect().bonus')==saved;assert pg.evaluate('state.balance')==balance;assert pg.locator('.swamp-flying-collector').count()==0;assert pg.locator('#swampMilestoneMessage').inner_text()=='';assert pg.locator('.swamp-progress-icon.active').count()==min(12,count+n);c.close()
 passed.append('Multiple Collectors fill successive slots, cross 4/8/12 thresholds, retain overflow and full meter at 16; unchanged model payouts/FS; five viewports')
 c,pg=setup(5);play(pg,seed(pg,1));pg.wait_for_selector('.swamp-flying-collector',state='attached');saved=pg.evaluate('VaultSwamp.inspect().bonus');balance=pg.evaluate('state.balance');pg.reload();pg.wait_for_function('VaultSession.ready');assert pg.evaluate('VaultSwamp.inspect().bonus')==saved;assert pg.evaluate('state.balance')==balance;assert pg.locator('.swamp-progress-icon.active').count()==6;assert pg.locator('.swamp-flying-collector').count()==0;c.close()
 passed.append('F5 during flight restores committed count and wallet once, without replaying a flight or reward')
 c,pg=setup(0,reduced=True);pg.evaluate("window.flightCount=0;new MutationObserver(()=>window.flightCount+=document.querySelectorAll('.swamp-flying-collector').length).observe(document.getElementById('swampProgressFlights'),{childList:true})");play(pg,seed(pg,3));pg.wait_for_function('!VaultSwamp.isBusy');assert pg.evaluate('window.flightCount')==0;assert pg.locator('.swamp-progress-icon.active').count()==3;c.close()
 passed.append('Reduced motion fills real progression without flying clones')
 c,pg=setup(0,remaining=1);play(pg,seed(pg,0));pg.wait_for_function('!VaultSwamp.isBusy');assert not pg.locator('#swampFeatureBar').is_visible();assert pg.locator('#swampFeatureBar').evaluate('n=>n.getBoundingClientRect().height')==0;c.close()
 passed.append('Feature completion removes panel completely')
 browser.close()
assert not errors,errors
report={'mode':'Chromium and actual Supabase SDK with HTTP fixture; no live DB changes','passed':passed,'errors':errors};(ROOT/'reports/swamp-symbol-progression.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
