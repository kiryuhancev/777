"""Real WAAPI strips: continuity, same target nodes, ordered stops, profiles and frames."""
from pathlib import Path
import json,base64
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT.parent/'output';HTML=(OUT/'VAULT_Swamp_Analog_Preview.html').read_text();url='http://127.0.0.1:8777/analog';passed=[];frames=[];timings={};errors=[]
monitor='''window.analogCommits=[];const replace=Element.prototype.replaceChildren;Element.prototype.replaceChildren=function(...nodes){const match=this.matches('.swamp-reel[data-swamp-analog]')&&nodes.length===3&&this.querySelector('.swamp-analog-strip');if(match){const before=nodes.map(n=>n.getBoundingClientRect().toJSON());queueMicrotask(()=>analogCommits.push({same:nodes.every(n=>n.parentNode===this),delta:Math.max(...nodes.map((n,i)=>{const r=n.getBoundingClientRect();return Math.max(Math.abs(r.y-before[i].y),Math.abs(r.height-before[i].height));}))}));}return replace.apply(this,nodes);};'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':820,'height':1000});ctx.route(url,lambda r:r.fulfill(content_type='text/html',body=HTML));ctx.add_init_script(monitor);pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url)
 def shot(name):
  path=OUT/f'swamp-analog-{name}.png';pg.locator('main').screenshot(path=str(path));frames.append((name,path))
 for speed in ['normal','quick','turbo']:
  pg.select_option('#speed',speed);pg.evaluate('window.startTime=performance.now();analogCommits.length=0');pg.locator('#play').click()
  assert pg.locator('.swamp-analog-strip').count()==5
  assert pg.evaluate('reels.every(n=>getComputedStyle(n).overflow==="hidden")')
  if speed=='normal':
   shot('01-acceleration');pg.wait_for_function('VaultAnalogReels.inspect().active?.reels[0].stage==="FULL_SPEED"');shot('02-full-speed')
   moving=pg.evaluate('''async()=>{const n=reels[0].firstElementChild,values=[];for(let i=0;i<7;i++){await new Promise(requestAnimationFrame);values.push(new DOMMatrix(getComputedStyle(n).transform).m42);}return {values,same:n===reels[0].firstElementChild};}''')
   assert moving['same'] and all(b>a for a,b in zip(moving['values'],moving['values'][1:])),moving
   pg.wait_for_function('VaultAnalogReels.inspect().active?.reels[0].stage==="DECELERATION"');shot('03-deceleration')
   pg.wait_for_function('VaultAnalogReels.inspect().active?.reels[0].stage==="FINAL_ALIGNMENT"');shot('04-final-alignment')
   pg.wait_for_function('VaultAnalogReels.inspect().active?.reels[0].stage==="SETTLED"');shot('05-progressive-stops')
  pg.wait_for_function('!document.getElementById("play").disabled')
  actual=pg.evaluate('reels.map(n=>[...n.children].map(c=>({id:c.dataset.symbol,...(c.dataset.value?{valueX:+c.dataset.value}:{})})))');assert actual==pg.evaluate('plannedGrid')
  commits=pg.evaluate('analogCommits');assert len(commits)==5 and all(c['same'] and c['delta']<1 for c in commits),commits
  events=pg.evaluate('VaultAnalogReels.inspect().events.filter(e=>e.time>=startTime)');stops=[e for e in events if e['hook']=='onReelStop'];starts=[e for e in events if e['hook']=='onReelStart']
  assert [e['reelIndex'] for e in stops]==list(range(5)),stops
  assert all(sum(e['hook']==hook for e in events)==5 for hook in ['onReelStart','onReelFullSpeed','onReelDecelerate','onReelStop'])
  assert sum(e['hook']=='onAllReelsStopped' for e in events)==1
  timings[speed]=[round(e['time']-starts[e['reelIndex']]['time']) for e in stops]
  assert not pg.evaluate('VaultSymbolDrop.isBusy("swamp")') and pg.locator('.swamp-analog-strip').count()==0
  if speed=='normal':shot('06-settled')
 assert .58<timings['quick'][-1]/timings['normal'][-1]<.75,timings
 assert .3<timings['turbo'][-1]/timings['normal'][-1]<.5,timings
 passed.append('5 physical strips move continuously downward; all phases/hooks once; ordered stops; SAME target nodes align within1px; Quick/Turbo proportional')
 pg.select_option('#speed','normal');pg.check('#anticipation');pg.evaluate('window.startTime=performance.now()');pg.locator('#play').click();pg.wait_for_function('VaultAnalogReels.inspect().active?.reels[4].stage==="DECELERATION"');shot('07-scatter-anticipation');pg.wait_for_function('!document.getElementById("play").disabled')
 events=pg.evaluate('VaultAnalogReels.inspect().events.filter(e=>e.time>=startTime)');last=next(e for e in events if e['hook']=='onReelStart' and e['reelIndex']==4);assert last['decelerationDuration']==900
 dec=next(e for e in events if e['hook']=='onReelDecelerate' and e['reelIndex']==4);second=next(e for e in events if e['hook']=='onReelStop' and e['reelIndex']==1);assert dec['time']>second['time']
 pg.uncheck('#anticipation');pg.check('#bonus');pg.locator('#play').click();pg.wait_for_function('!document.getElementById("play").disabled');assert pg.evaluate('VaultAnalogReels.inspect().events.at(-1).phase')=='free-spin'
 for width in [320,390,430,768]:
  pg.set_viewport_size({'width':width,'height':950});pg.select_option('#speed','turbo');pg.locator('#play').click();assert pg.locator('.swamp-analog-strip').count()==5;pg.wait_for_function('!document.getElementById("play").disabled');assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width==390:shot('08-mobile')
 pg.check('#reduced');pg.select_option('#speed','normal');pg.locator('#play').click();assert pg.locator('.swamp-analog-strip').count()==5;pg.wait_for_function('!document.getElementById("play").disabled')
 pg.uncheck('#reduced');pg.evaluate('()=>{window.p=previewAnalog();}');pg.wait_for_function('VaultSymbolDrop.isBusy("swamp")');pg.evaluate('VaultSymbolDrop.cancel("swamp")');pg.wait_for_function('!document.getElementById("play").disabled');assert pg.locator('.swamp-analog-strip,[data-swamp-analog]').count()==0
 passed.append('Two Scatter anticipation starts after real landings; FS uses same strips; mobile320–768 and reduced motion retain rotation; cancel cleans transient state')
 assert not errors,errors;ctx.close();b.close()
gallery='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Swamp Analog — frame sequence</title><style>body{background:#101813;color:#f4dfb3;font:16px Arial;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}img{width:100%;border-radius:12px}h2{font-size:15px}</style><h1>Swamp Fishing · Actual animation frames</h1><p>Acceleration → full speed → deceleration → alignment → progressive stops → settled. Same fixed grid, same engine; no wagers.</p><main>'
for name,path in frames:gallery+='<section><h2>'+name+'</h2><img src="data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()+'"></section>'
(OUT/'Swamp_Analog_Frame_Sequence.html').write_text(gallery+'</main>')
(ROOT/'reports/swamp-analog-engine.json').write_text(json.dumps({'passed':passed,'stopTimesMs':timings,'pageErrors':errors},indent=2)+'\n');print('\n'.join('PASS '+s for s in passed));print(timings)
