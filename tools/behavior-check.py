"""Browser regression checks for cascade Wilds and Scatter anticipation."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':375,'height':812})
    context.set_offline(True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text(),wait_until='load')
    page.locator('#openMainGame').click()
    zoom=page.evaluate('''()=>{
      state.fastGame=false;state.grid=blankGrid(5);state.sticky.clear();
      for(let r=0;r<5;r++)for(let c=0;c<5;c++)state.grid[r][c]=REGULAR[(r*3+c)%9];
      state.grid[0][0]=state.grid[0][1]=state.grid[4][2]='scatter';
      const entering=new Set();for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(r!==0||c>1)entering.add(key(r,c));
      render({enterCells:entering});
      return [...document.querySelectorAll('#grid .cell')].map((e,i)=>({r:Math.floor(i/5),c:i%5,enter:e.classList.contains('enter'),ms:parseFloat(e.style.getPropertyValue('--drop-duration'))}));
    }''')
    assert all(x['ms']==52 for x in zoom if x['enter'] and x['c'] in (0,1))
    assert all(x['ms']==52 for x in zoom if x['enter'] and x['c']==2 and x['r']<4)
    assert any(x['ms']>52 for x in zoom if x['enter'] and x['c']>=3)
    result=page.evaluate('''async()=>{
      const realTimeout=window.setTimeout;
      const work=async()=>{
        window.setTimeout=(cb,ms,...args)=>{queueMicrotask(()=>cb(...args));return 0};
        sound=()=>{};toast=()=>{};showWinFloat=async()=>{};showWinMilestones=async()=>{};
        showBonusIntro=async()=>{};showBonusResult=async()=>{};levelUp=async()=>{};
        waitAfterFullDrop=async()=>{};scheduleBonusAuto=()=>{};
        let lockedDuringGravity=false;const gravity=applyGravity;
        applyGravity=()=>{if(!state.bonus&&state.sticky.has(key(0,0)))lockedDuringGravity=true;return gravity()};
        const model=SLOT_MATH.newBoard();for(let i=0;i<25;i++)model.grid[i]=(Math.floor(i/5)*3+i%5)%9;
        model.grid[0]=10;for(let i=1;i<5;i++)model.grid[i]=0;
        writeSlotModel(model);state.balance=1000000;state.busy=false;
        const expected=SLOT_MATH.settle(structuredClone(model),SLOT_MATH.seededRandom(123));
        rand=SLOT_MATH.seededRandom(123);const total=await settleSpin();
        if(!lockedDuringGravity||state.sticky.size)throw Error('Base Sticky lifecycle');
        if(Math.abs(total/bet()-expected.totalX)>1e-8)throw Error('Base live/math mismatch');
        const sessions=[];
        for(const type of ['normal','super']){
          const expected=SLOT_MATH.simulateOne(type,SLOT_MATH.seededRandom(438));
          rand=SLOT_MATH.seededRandom(438);await startBonus(type);state.bonusAutoRunning=false;
          let spins=0,total=0;
          while(state.bonus&&spins<1000){await spin();total+=state.lastWin/bet();spins++;}
          if(state.bonus||spins!==expected.spins||Math.abs(total-expected.x)>1e-8)throw Error('Bonus live/math mismatch');
          sessions.push({type,spins,totalX:total});
        }
        return {lockedDuringGravity,sessions};
      };
      return await Promise.race([work(),new Promise((_,reject)=>realTimeout(()=>reject(Error('Browser fixture timed out')),30000))]);
    }''')
    assert not errors,errors
    browser.close()
report={'scatterZoom':zoom,'cascadeChecks':result,'pageErrors':errors}
(ROOT/'reports/browser-v45.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(result))
