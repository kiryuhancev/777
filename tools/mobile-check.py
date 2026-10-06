"""Responsive browser checks: requires Playwright and Chromium."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
report={'viewports':[], 'pageErrors':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=browser.new_context(has_touch=True)
    ctx.set_offline(True)
    page=ctx.new_page()
    page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
    page.set_content((ROOT/'index.html').read_text(),wait_until='load')
    page.locator('#openMainGame').tap()
    for w,h in [(320,568),(360,640),(375,812),(390,844),(430,932),(568,320),(667,375),(852,393),(768,1024),(1024,768),(1440,900)]:
        page.set_viewport_size({'width':w,'height':h})
        page.wait_for_timeout(100)
        for size in [5,8]:
            page.evaluate('''size=>{state.bonus=size===8;state.bonusType='super';state.slotProfile=size===8?'super':'base';state.size=size;state.grid=blankGrid(size);state.sticky.clear();document.body.classList.toggle('bonus',size===8);fillGrid();render();updateUI();}''',size)
            result=page.evaluate('''()=>{const g=document.querySelector('#grid'),r=g.getBoundingClientRect();return {pageWidth:document.documentElement.scrollWidth,gridWidth:g.clientWidth,gridScroll:g.scrollWidth,left:r.left,right:r.right,width:r.width,height:r.height,buttons:['settingsBtn','autoBtn','maxBetBtn','spinBtn','buyBtn'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})}}''')
            assert result['pageWidth']<=w,(w,h,size,result)
            assert result['gridScroll']<=result['gridWidth']+1,(w,h,size,result)
            assert result['left']>=0 and result['right']<=w,(w,h,size,result)
            assert abs(result['width']-result['height'])<1,(w,h,size,result)
            if w<=760 or (w<=1100 and h<=540):
                assert all(b['width']>=44 and b['height']>=44 and b['left']>=0 and b['right']<=w and b['top']>=0 and b['bottom']<=h for b in result['buttons'] if b['width']>0),(w,h,result)
            report['viewports'].append({'width':w,'height':h,'size':size,'gridWidth':result['gridWidth']})
    page.set_viewport_size({'width':375,'height':812})
    page.evaluate("state.bonus=false;state.slotProfile='base';state.size=5;state.grid=blankGrid(5);document.body.classList.remove('bonus');fillGrid();render();updateUI()")
    page.locator('#settingsBtn').tap()
    assert page.locator('.settings-popover').is_visible()
    page.screenshot(path='/workspace/output/mobile-settings.png')
    page.locator('#settingsBtn').tap()
    page.locator('#autoBtn').tap()
    assert page.locator('.autoplay-popover').is_visible()
    page.locator('#autoBtn').tap()
    page.locator('.slot-help>summary').tap()
    assert page.locator('#slotHelp').get_attribute('open') is not None
    page.locator('.slot-help>summary').tap()
    page.locator('#buyBtn').tap()
    assert page.locator('.bonus-shop-close').is_visible()
    page.locator('.bonus-shop-close').tap()
    page.screenshot(path='/workspace/output/mobile-slot-375.png')
    page.evaluate('state.sound=false;state.fastGame=true;spin()')
    page.wait_for_function('!state.busy',timeout=60000)
    report['touchChecks']=['settings','autoplay menu','rules disclosure','bonus shop','real spin']
    assert not report['pageErrors'],report['pageErrors']
    browser.close()
(ROOT/'reports/mobile-layout.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report))
