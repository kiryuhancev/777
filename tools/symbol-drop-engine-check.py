"""Actual WAAPI timing, hooks, cancellation and portable interactive/video previews."""
from pathlib import Path
import json,subprocess,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;out=root.parent/'output';passed=[];preview=(out/'VAULT_Symbol_Drop_Preview.html').read_text();url='http://127.0.0.1:8777/preview'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':720,'height':900});ctx.route(url,lambda r:r.fulfill(content_type='text/html',body=preview));page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url);page.wait_for_function('!!window.VaultSymbolDrop')
 durations={}
 for mode in ['classic','premium','impact']:
  for speed in ['normal','quick','turbo']:
   page.select_option('#mode',mode);page.select_option('#speed',speed)
   result=page.evaluate('''async()=>{
    const nodes=[...grid.children],before=nodes.map(n=>n.innerHTML),start=performance.now();
    const old=Math.random,oldCrypto=crypto.getRandomValues;Math.random=()=>{throw Error('RNG touched')};crypto.getRandomValues=()=>{throw Error('RNG touched')};
    try{await previewPlay();}finally{Math.random=old;crypto.getRandomValues=oldCrypto;}
    const events=VaultSymbolDrop.inspect().events.filter(e=>e.time>=start);
    return {same:before.every((s,i)=>s===nodes[i].innerHTML),active:VaultSymbolDrop.isBusy('swamp'),animations:nodes.flatMap(n=>n.getAnimations()).length,enters:events.filter(e=>e.hook==='onSymbolEnter').length,lands:events.filter(e=>e.hook==='onSymbolLand').length,columns:events.filter(e=>e.hook==='onColumnLand').length,settled:events.filter(e=>e.hook==='onGridSettled').length,elapsed:events.find(e=>e.hook==='onGridSettled')?.elapsed};
   }''')
   assert result['same'] and not result['active'] and result['animations']==0,result
   assert [result[k] for k in ['enters','lands','columns','settled']]==[15,15,5,1],result
   durations[mode,speed]=result['elapsed']
  assert durations[mode,'turbo']<durations[mode,'quick']<durations[mode,'normal'],durations
 passed.append('Classic/Premium/Impact × Normal/Quick/Turbo: fixed art/cells unchanged, no RNG, all hooks exactly once, finished promises and zero residual animations')
 # An existing CSS move must not be baked into the drop as an intermediate position.
 transition=page.evaluate('''async()=>{const n=grid.children[0];n.style.opacity='.6';n.style.transition='transform 2s linear';n.style.transform='translateX(0px)';getComputedStyle(n).transform;n.style.transform='translateX(80px)';const pending=VaultSymbolDrop.play('swamp',{root:grid,cells:[{node:n,column:0,row:0,symbol:'regular'}],rows:3,settle:false,mode:'classic'});const a=n.getAnimations().find(a=>a.effect.getKeyframes().length===3);a.currentTime=120;const mid=new DOMMatrix(getComputedStyle(n).transform).m41;const frames=a.effect.getKeyframes();await pending;const end=new DOMMatrix(getComputedStyle(n).transform).m41;n.style.transition='none';n.style.transform='';const opacity=Number(getComputedStyle(n).opacity);n.style.opacity='';return {mid,end,opacity,frames:frames.length,active:n.hasAttribute('data-slot-drop-active')};}''')
 assert abs(transition['mid']-80)<.01 and abs(transition['end']-80)<.01 and abs(transition['opacity']-.6)<.01 and not transition['active'],transition
 passed.append('CSS transition conflict: inline target preserved during/after drop, single continuous fall segment, no final position jump')
 page.select_option('#mode','classic');page.select_option('#speed','normal');page.check('#anticipation')
 special=page.evaluate('''async()=>{const t=performance.now();await previewPlay();const e=VaultSymbolDrop.inspect().events.filter(e=>e.time>=t);return {special:e.filter(e=>e.hook==='onSpecialSymbolLand').length,suspense:e.filter(e=>e.hook==='onSymbolEnter'&&e.anticipation).length,columns:[0,1,2,3,4].map(c=>Math.min(...e.filter(e=>e.hook==='onSymbolEnter'&&e.column===c).map(e=>e.time-t)))};}''')
 assert special['special']==2 and special['suspense']==3,special
 assert special['columns'][-1]>special['columns'][-2]+300,special
 page.check('#reduced');page.evaluate('previewPlay()');page.uncheck('#reduced')
 page.emulate_media(reduced_motion='reduce');assert page.evaluate('VaultSymbolDrop.getConfig("swamp").reducedMotion');page.evaluate('previewPlay()');page.emulate_media(reduced_motion='no-preference')
 page.select_option('#columns','SEQUENTIAL_COLUMNS');page.evaluate('previewPlay()');page.select_option('#columns','STAGGERED_COLUMNS')
 result=page.evaluate('''async()=>{const pending=VaultSymbolDrop.play('swamp',{root:grid,rows:3,cells:[...grid.children].map((node,i)=>({node,column:i%5,row:Math.floor(i/5),symbol:'wild'}))});VaultSymbolDrop.cancel('swamp');const result=await pending;return {...result,active:VaultSymbolDrop.isBusy('swamp'),residual:document.querySelectorAll('[data-slot-landing]').length};}''')
 assert result['cancelled'] and not result['gridSettled'] and not result['active'] and result['residual']==0,result
 page.set_viewport_size({'width':390,'height':844});page.evaluate('previewPlay()');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'symbol-drop-mobile.png'),full_page=True)
 assert page.locator('.slot-animation-debug').count()==0
 assert not errors,errors;ctx.close()
 debug=browser.new_context();debug.add_init_script('window.SLOT_ANIMATION_DEBUG=true');debug.route(url,lambda r:r.fulfill(content_type='text/html',body=preview));dp=debug.new_page();dp.goto(url);assert dp.locator('.slot-animation-debug').count()==1;dp.select_option('.slot-animation-debug [data-key="speedProfile"]','turbo');assert dp.evaluate('VaultSymbolDrop.getConfig("swamp").speedProfile')=='turbo';debug.close()
 passed.append('Two Scatter hero pulses once, suspense on final column, sequential/staggered, reduced motion, clean cancellation, mobile390px')
 # Record the actual standalone engine for each mode plus Quick/Turbo and anticipation.
 for name,mode,speed,anticipation in ([('classic','classic','normal',False),('premium','premium','normal',False),('impact','impact','normal',False),('quick','classic','quick',False),('turbo','classic','turbo',False),('anticipation','classic','normal',True)] if '--record' in sys.argv else []):
  ctx=browser.new_context(viewport={'width':720,'height':900},record_video_dir=str(out/'drop-recordings'),record_video_size={'width':720,'height':900});ctx.route(url,lambda r:r.fulfill(content_type='text/html',body=preview));pg=ctx.new_page();pg.goto(url);pg.select_option('#mode',mode);pg.select_option('#speed',speed)
  if anticipation:pg.check('#anticipation')
  for i in range(2):pg.evaluate('previewPlay()');pg.wait_for_timeout(250)
  video=pg.video;ctx.close();video.save_as(str(out/f'symbol-drop-{name}.webm'))
 browser.close()
(root/'reports/symbol-drop-engine.json').write_text(json.dumps({'passed':passed,'durationsMs':{m:{s:durations[m,s] for s in ['normal','quick','turbo']} for m in ['classic','premium','impact']},'pageErrors':errors},indent=2)+'\n')
print('\n'.join('PASS '+s for s in passed))
