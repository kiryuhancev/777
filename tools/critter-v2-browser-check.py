"""Real UI/SDK, isolated owned HTTP fixtures. No live Supabase requests."""
from pathlib import Path
import json
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0].replace("reply({'version':1})","reply({'version':2})"),str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1150});c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',critter_route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 c.add_init_script('''const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>{if(window.testHoldWildWin&&ms===230&&[...document.querySelectorAll('#critterGrid .winning .critter-wild-multiplier')].some(n=>n.textContent==='x8')){window.testResumeWildWin=()=>nt(fn,0,...a);return nt(()=>{},100000);}return nt(fn,fn.name==='spin'&&(ms===450||ms===850)?100000:ms<2000?Math.max(1,ms*.08):ms,...a);};const na=Element.prototype.animate;Element.prototype.animate=function(...a){const v=na.apply(this,a);v.playbackRate=12;return v;}''')
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');pg.evaluate('VaultCritter.open()');pg.wait_for_function('VaultCritter.inspect().ready');pg.evaluate('state.fastGame=true')
 def sync():
  pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 def play(seed):pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('critterSpin').click();document.getElementById('critterSpin').click();crypto.getRandomValues=old;}''',seed)
 def done():pg.wait_for_function('!VaultCritter.isBusy',timeout=120000);sync()
 def checkpoint():return pg.evaluate('VaultCritter.getCheckpoint()')
 sync()
 seeds=pg.evaluate('''()=>{const o={};for(let seed=0;seed<10000&&Object.keys(o).length<4;seed++){const r=CRITTER_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(r.bonus)o[r.bonus.kind]??=seed;else if(r.base.steps.some(s=>s.grid.some(t=>t.multiplier>=8)))o.chain??=seed;else if(!r.base.steps.length)o.loss??=seed;}return o;}''');assert set(seeds)=={'normal','super','chain','loss'},seeds
 for kind in ['loss','chain','normal','super']:
  before=pg.evaluate('state.balance');pg.evaluate('v=>window.testHoldWildWin=v',kind=='chain');play(seeds[kind]);r=checkpoint();assert r['version']==2
  if kind=='chain':
   pg.wait_for_function("typeof window.testResumeWildWin==='function'",timeout=30000)
   assert pg.evaluate("()=>{const win=document.querySelector('#critterGrid .winning svg,#critterGrid .winning img'),other=document.querySelector('#critterGrid .critter-cell:not(.winning) svg,#critterGrid .critter-cell:not(.winning) img');return getComputedStyle(win).filter!=='none'&&getComputedStyle(win).opacity==='1'&&Number(getComputedStyle(other).opacity)<1}")
   pg.screenshot(path=str(ROOT.parent/'output/critter-v2-winning.png'),full_page=True)
   pg.evaluate('window.testHoldWildWin=false;window.testResumeWildWin()')
  if r['bonus']:
   pg.wait_for_function("document.getElementById('critterMode').textContent.includes('2 /')",timeout=120000)
   pg.screenshot(path=str(ROOT.parent/'output'/f'critter-v2-{kind}-bonus.png'),full_page=True)
  done();assert pg.evaluate('state.balance')==round(before-20+r['payout'],6)
  expected=r['bonus']['spins'][-1]['finalGrid'] if r['bonus'] else r['base']['finalGrid']
  actual=pg.evaluate("[...document.querySelectorAll('#critterGrid .critter-cell')].map(n=>({uid:+n.dataset.uid,symbol:n.dataset.symbol,multiplier:n.querySelector('.critter-wild-multiplier')?.textContent||null}))")
  assert actual==[{'uid':t['uid'],'symbol':t['symbol'],'multiplier':f"x{t['multiplier']}" if t['symbol']=='wild' else None} for t in expected]
  checks.append(kind+': exact full plan/payout/shared wallet, one paid round; badge tracks model')
 # F5 during bonus never restarts spin or awards payout twice.
 play(seeds['normal']);r=checkpoint();pg.wait_for_function("document.getElementById('critterMode').textContent.includes('BONUS SPIN')",timeout=120000);sync();count=cloud.stats[(A,'critter')]['rounds_played'];balance=pg.evaluate('state.balance')
 pg.reload();pg.wait_for_function('VaultSession.ready&&VaultCritter.inspect().ready');sync();assert not pg.evaluate('VaultCritter.isBusy');assert checkpoint()==r;assert pg.evaluate('state.balance')==balance;assert cloud.stats[(A,'critter')]['rounds_played']==count
 checks.append('F5 inside bonus restores terminal checkpoint once; no debit, bonus replay or duplicate statistics')
 for width in [320,390,430,768,1440]:
  pg.set_viewport_size({'width':width,'height':1100});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert pg.evaluate("()=>[...document.querySelectorAll('#critterGrid .critter-cell')].every(n=>{const c=n.getBoundingClientRect(),a=n.querySelector('svg,img').getBoundingClientRect();return a.width/c.width>.90&&a.height/c.height>.90&&a.width<=c.width&&a.height<=c.height})")
  assert pg.evaluate("()=>[...document.querySelectorAll('.critter-wild-multiplier')].every(n=>{const a=n.getBoundingClientRect(),c=n.parentElement.getBoundingClientRect();return a.left>=c.left&&a.right<=c.right&&a.bottom<=c.bottom&&parseFloat(getComputedStyle(n).fontSize)>=11})")
  if width==390:pg.screenshot(path=str(ROOT.parent/'output/critter-v2-mobile.png'),full_page=True)
 assert pg.evaluate("()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size}")
 checks.append('320/390/430/768/1440px: artwork90%+ of cell, readable multiplier without overlap, no page overflow or duplicate IDs')
 # Legacy checkpoint still recoverable without re-settlement.
 pg.evaluate('VaultCritter.restore(CRITTER_MODEL.legacy.start({seed:63,bet:20,roundId:crypto.randomUUID()}))');assert checkpoint()['version']==1
 checks.append('Legacy v1 terminal checkpoint restores through original model')
 assert not errors,errors
 assert not console_errors,console_errors
 checks.append('No browser page errors')
 b.close()
(ROOT/'reports/critter-v2-browser.json').write_text(json.dumps({'mode':'owned SDK HTTP fixtures, no live DB','seeds':seeds,'passed':checks},indent=2)+'\n');print('\n'.join('PASS '+s for s in checks))
