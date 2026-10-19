"""Presentation-only regression: actual browser, deterministic recorded plans, isolated Auth/RPC fixture."""
from pathlib import Path
import subprocess,hashlib,json
source=Path(__file__).with_name('magnet-browser-check.py')
ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
baseline='b78eef5'
protected=['magnet/model.js','magnet/config.js','magnet/assets.js','vault/runtime.js','supabase_magnet.sql']
for name in protected:
 assert (ROOT/name).read_bytes()==subprocess.check_output(['git','show',baseline+':'+name],cwd=ROOT),name
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1200})
 c.route('https://**',lambda r:r.abort());c.route('https://vault-test.supabase.co/**',magnet_route)
 c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...a)=>nt(fn,ms===850?100000:ms,...a)')
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
 pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready')
 pg.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")');pg.evaluate('VaultMagnet.open()');pg.wait_for_function('VaultMagnet.inspect().ready')
 def shot(name):pg.locator('#magnetApp').screenshot(path=str(ROOT.parent/'output'/f'magnet-clarity-{name}.png'))
 shot('idle')
 seeds=pg.evaluate('''()=>{const out={};for(let s=0;s<10000&&Object.keys(out).length<7;s++){const p=MAGNET_MODEL.plan(s);for(const k of ['attract','repel','gravity','flip','chain','wild','repulsor'])if(p.orderedEffects.some(e=>e.kind===k)&&p.scatters<3)out[k]??=s;}return out}''')
 seen=[]
 for kind,seed in seeds.items():
  pg.evaluate('''()=>{window.clarityTrace=[];let previous='';const observer=new MutationObserver(()=>{const f=document.getElementById('magnetField'),r=document.getElementById('magnetApp'),key=f.dataset.playback+':'+r.dataset.effect+':'+f.querySelectorAll('.interacting').length;if(key!==previous){previous=key;clarityTrace.push({key,kind:r.dataset.effect,source:f.querySelectorAll('.force-source').length,target:f.querySelectorAll('.interacting').length,arrows:document.querySelectorAll('#magnetForces .magnet-arrow').length});}});observer.observe(document.getElementById('magnetField'),{subtree:true,attributes:true,childList:true});window.clarityObserver=observer;}''')
  pg.evaluate('''s=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=s;return a};document.getElementById('magnetSpin').click();crypto.getRandomValues=old;}''',seed)
  expected=pg.evaluate('VaultMagnet.getCheckpoint()')
  pg.wait_for_function('(k)=>document.querySelector(`#magnetForces g[data-kind="${k}"]`)',arg=kind)
  shot(kind)
  pg.wait_for_function('!VaultMagnet.isBusy',timeout=20000)
  assert pg.evaluate('VaultMagnet.getCheckpoint()')==expected
  cells=pg.evaluate("[...document.querySelectorAll('#magnetField .magnet-token')].map(n=>({uid:+n.dataset.uid,cell:+n.dataset.cell,symbol:n.dataset.symbol,polarity:+n.dataset.polarity})).sort((a,b)=>a.cell-b.cell).map(({cell,...t})=>t)")
  assert cells==expected['magneticPlan']['finalGrid'],kind
  assert pg.locator('#magnetForces g,.magnet-ghost,.force-source,.interacting,.potential-target,.moved,.flipping').count()==0
  trace=pg.evaluate('clarityObserver.disconnect();clarityTrace');seen.extend(trace)
  assert any(t['source'] and t['target'] and t['arrows'] for t in trace if t.get('kind') in ['attract','repel','gravity','wild','repulsor'])
  if expected['magneticPlan']['winX']>0:
   assert pg.locator('#magnetField .winning').count()>0
   shot('winning')
 # FAST remains presentation-only, with the same end field.
 pg.evaluate('state.fastGame=true')
 pg.locator('#magnetSpin').click();expected=pg.evaluate('VaultMagnet.getCheckpoint()');pg.wait_for_function('!VaultMagnet.isBusy')
 assert pg.evaluate('VaultMagnet.getCheckpoint()')==expected
 pg.evaluate('state.fastGame=false')
 pg.locator('#magnetHelpOpen').click();assert pg.locator('.magnet-special-help>div').count()==6
 assert '6 выигрышных путей' in pg.locator('#magnetHelp').inner_text();shot('help');pg.locator('#magnetHelpClose').click()
 for width in [1024,768,390,320]:
  pg.set_viewport_size({'width':width,'height':900});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert pg.locator('#magnetSpin').is_visible()
  if width==390:shot('mobile')
 pg.set_viewport_size({'width':390,'height':900});pg.locator('#magnetHelpOpen').click()
 assert pg.evaluate("document.getElementById('magnetHelp').scrollWidth<=document.getElementById('magnetHelp').clientWidth+1")
 pg.locator('#magnetHelpClose').click();c.close();b.close()
assert not errors,errors
assert not console_errors,console_errors
report={'baseline':baseline,'protectedFilesByteIdentical':protected,'effectsObserved':list(seeds),'planCheckpointAndFinalGridExact':True,'noResidualEffects':True,'normalAndFast':True,'responsiveWidths':[1440,1024,768,390,320],'pageErrors':errors,'consoleErrors':console_errors}
(ROOT/'reports/magnet-clarity.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
