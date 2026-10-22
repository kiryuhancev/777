"""Real seeded Base Game presentation/credit/reload checks; no production calls."""
from pathlib import Path
import json
source=Path(__file__).with_name('upside-paws-browser-check.py');ns={'__file__':str(source)};exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns);globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
checks=[];errors=[];console_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',api);ctx.route('http://127.0.0.1:8777/**',site)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None);page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');page.wait_for_function('VaultBonusSession.ready');page.evaluate('VaultBigTop.open();state.sound=false');page.wait_for_function('VaultBigTop.inspect().ready');page.emulate_media(reduced_motion='reduce')
 def sync():page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict',timeout=30000)
 sync()
 samples=page.evaluate("""()=>{const out={};for(let seed=0;seed<20000;seed++){const r=BIG_TOP_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});if(r.bonus||r.baseWinX>=20)continue;const ticket=!!r.base.featurePlan.length,win=r.base.wins.some(w=>w.winX>0),key=(win?'win':'lose')+(ticket?'Ticket':'Plain');out[key]??=seed;if(Object.keys(out).length===4)break;}return out;}""");assert len(samples)==4,samples
 for name,seed in samples.items():
  before=page.evaluate('state.balance');page.evaluate("""s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a;};document.getElementById('bigTopSpin').click();crypto.getRandomValues=old;}""",seed);page.wait_for_function('!VaultBigTop.isBusy',timeout=15000);sync();r=page.evaluate('VaultBigTop.getCheckpoint()');assert r['seed']==seed;assert page.evaluate('state.balance')==round(before-r['cost']+r['payout'],6)
  tr=page.evaluate('VaultBigTop.inspect().trace');start=max(i for i,x in enumerate(tr) if x['type']=='START');tr=tr[start:];gate=next(x for x in tr if x['type']=='BASE_FEATURE_CHECK');assert max(x['time'] for x in tr if x['type']=='SETTLED')<=gate['time'];reveals=[x for x in tr if x['type']=='TICKET_FOCUS'];expected=name=='winTicket';assert bool(reveals)==expected
  assert page.locator('.bigtop-curtain').count()==(len(r['base']['featurePlan']) if expected else 0)
  if expected:assert all(x['time']>=gate['time'] for x in reveals)
  if name=='loseTicket':
   assert page.locator('.bigtop-final .bigtop-ticket').count()>0
   saved_balance=page.evaluate('state.balance');page.reload();page.wait_for_function('VaultSession.ready&&VaultBigTop.inspect().ready');sync();assert page.locator('.bigtop-curtain').count()==0;assert page.locator('.bigtop-final .bigtop-ticket').count()>0;assert page.evaluate('state.balance')==saved_balance
  checks.append(name+': reel stop before gate, correct reveal visibility, unchanged exact payout'+('; F5 retains ticket/no curtain/no duplicate' if name=='loseTicket' else ''))
 # Render both complete scenes to test the whole-composite idle lighting in isolation.
 page.emulate_media(reduced_motion='no-preference');page.evaluate("""()=>{const reels=[...document.querySelectorAll('.bigtop-reel')];for(const [i,winner] of ['bombo','skinny'].entries()){reels[i].querySelectorAll('.bigtop-curtain').forEach(n=>n.remove());reels[i].append(CurtainOverlay.create({id:'idle-'+i,reel:i,winner,multiplier:i?5:1},{resolved:true}));}}""");page.wait_for_timeout(100)
 for node in page.locator('.bigtop-winner-scene').all():
  result=node.evaluate("""n=>{const a=n.getAnimations()[0];if(!a)throw Error('missing idle');a.pause();const rect=n.getBoundingClientRect(),frames=a.effect.getKeyframes();let max=1;for(let t=0;t<9000;t+=200){a.currentTime=t;max=Math.max(max,parseFloat(getComputedStyle(n).filter.match(/[\\d.]+/)[0]));const b=n.getBoundingClientRect();if(['x','y','width','height'].some(k=>Math.abs(b[k]-rect[k])>.01))throw Error('idle geometry changed');}return {max,noTransform:frames.every(f=>!f.transform)};}""");assert 1<result['max']<=1.05 and result['noTransform'],result
 page.emulate_media(reduced_motion='reduce');assert page.locator('.bigtop-winner-scene').evaluate_all("ns=>ns.every(n=>getComputedStyle(n).animationName==='none')");page.emulate_media(reduced_motion='no-preference');page.evaluate("document.body.classList.add('slot-reduced-motion')");assert page.locator('.bigtop-winner-scene').evaluate_all("ns=>ns.every(n=>getComputedStyle(n).animationName==='none')")
 checks.append('BOMBO/SKINNY slow mild lighting only, no composite movement/deformation/geometry change, system and shared reduced-motion disable idle')
 assert not errors,errors;assert not console_errors,console_errors;b.close()
(ROOT/'reports/bigtop-base-gate.json').write_text(json.dumps({'passed':checks,'seeds':samples,'runtimeErrors':errors,'consoleErrors':console_errors},indent=2));print('\n'.join('PASS '+x for x in checks))
