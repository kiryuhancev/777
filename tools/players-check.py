"""Desktop footballers: symmetry, matching heights, motion and reel exclusion."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
report={'checks':[],'errors':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.context.set_offline(True)
 page.set_content((ROOT/'index.html').read_text());page.locator('#openMainGame').click()
 for width,height in [(1920,1080),(1440,900),(1280,800),(1100,800),(1024,768),(980,800),(768,1024),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  for size in [5,8]:
   page.evaluate("size=>{state.size=size;state.bonus=size===8;state.slotProfile=size===8?'super':'base';state.grid=blankGrid(size);state.sticky.clear();document.body.classList.toggle('bonus',size===8);fillGrid();render();updateUI();}",size)
   page.wait_for_timeout(100)
   data=page.evaluate('''()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {l:rect('.player-zone-left .derby-footballer'),r:rect('.player-zone-right .derby-footballer'),g:rect('#grid'),f:rect('#fieldShell'),overflow:document.documentElement.scrollWidth>innerWidth}}''')
   assert not data['overflow'],(width,size,data)
   if width>980:
    l,r,g,f=(data[k] for k in ['l','r','g','f']);assert abs(l['height']-r['height'])<1
    assert abs(l['bottom']-r['bottom'])<1
    center=(g['left']+g['right'])/2;assert abs(center-(l['left']+l['right']+r['left']+r['right'])/4)<1
    assert l['right']<=f['left'] and r['left']>=f['right'],data
    assert l['right']<=g['left'] and r['left']>=g['right']
    if width==1440:page.screenshot(path=str(ROOT.parent/'output'/f'derby-players-{size}.png'))
   else:assert page.locator('.derby-footballer-red').is_hidden() and page.locator('.derby-footballer-blue').is_hidden()
   report['checks'].append({'width':width,'size':size,'symmetryAndExclusion':True})
 page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(100)
 before=page.evaluate('JSON.stringify({grid:state.grid,balance:state.balance,sticky:[...state.sticky]})')
 motion=page.evaluate('''()=>{const nodes=[...document.querySelectorAll('.derby-player-upper')];return nodes.map(node=>{const a=node.getAnimations()[0];a.pause();a.currentTime=0;const before=getComputedStyle(node).transform;a.currentTime=6500;return {before,after:getComputedStyle(node).transform};});}''')
 assert all(x['before']!=x['after'] for x in motion),motion
 assert before==page.evaluate('JSON.stringify({grid:state.grid,balance:state.balance,sticky:[...state.sticky]})')
 page.emulate_media(reduced_motion='reduce');assert page.evaluate("[...document.querySelectorAll('.derby-player-upper')].every(e=>getComputedStyle(e).animationName==='none')")
 assert not report['errors'],report
 b.close()
(ROOT/'reports/players-layout.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
