"""Offline game integration and isolation checks (Playwright + Chromium)."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
report={'checks':[], 'pageErrors':[], 'externalRequests':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1280,'height':900})
    ctx.set_offline(True)
    page=ctx.new_page()
    page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
    page.on('request',lambda r:report['externalRequests'].append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.set_content((ROOT/'index.html').read_text(),wait_until='load')
    page.locator('#openBirdGame').click()
    generated=page.evaluate('''()=>{
      const random=Math.random;Math.random=SLOT_MATH.seededRandom(451);
      const rows=[],counts=new Set();let worstAngle=0,worstSpeed=0,start=performance.now();
      for(let i=0;i<50;i++){
        startBirdRound();const before=birdState.world.bodies.filter(b=>!b.static).map(b=>({b,x:b.x,y:b.y}));
        const pigs=birdState.pigs.length,balance=state.balance;
        for(let t=0;t<240;t++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT);
        if(birdState.pigsKilled||birdState.roundWin||state.balance!==balance||birdState.pigs.some(p=>p.hp!==p.maxHp)||birdState.pigs.filter(p=>p.alive).length!==pigs)throw Error('Pre-launch damage/payout');
        const angle=Math.max(...birdState.blocks.map(b=>Math.abs(b.angle))),speed=Math.max(...birdState.blocks.map(b=>Math.hypot(b.vx,b.vy)));
        worstAngle=Math.max(worstAngle,angle);worstSpeed=Math.max(worstSpeed,speed);
        if(angle>.06||speed>8)throw Error('Unstable generated tower '+JSON.stringify({angle,speed}));
        counts.add(birdState.structureCount);rows.push({pigs,blocks:birdState.blocks.length});
      }
      Math.random=random;birdState.active=false;if(counts.size!==5)throw Error('Generator count coverage');
      return {structureCounts:[...counts].sort(),count:rows.length,worstAngle,worstSpeed,seconds:(performance.now()-start)/1000};
    }''')
    report['generation']=generated;report['checks'].append('50 generated worlds: no pre-launch collapse, damage or reward')
    abilities=page.evaluate('''()=>{
      birdState.active=true;birdState.roundBet=20;birdState.world=BIRD_PHYSICS.createWorld();birdState.birds=[];birdState.blocks=[];birdState.pigs=[];
      const bird=makeFlyingBird({x:300,y:300,vx:500,vy:-100});applyBonus(bird,{type:'split',active:true});
      if(birdState.birds.length!==3||new Set(birdState.birds.map(b=>b.id)).size!==3)throw Error('Split body IDs');
      const before=bird.mass,oldI=bird.inertia;applyBonus(bird,{type:'mega',active:true});
      if(Math.abs(bird.mass/before-1.55**2)>1e-8||Math.abs(bird.inertia/oldI-1.55**4)>1e-8)throw Error('Mega mass/inertia');
      const block=createBlock(340,280,18,70,'wood');birdState.blocks.push(block);birdState.world.bodies.push(block);
      applyBonus(bird,{type:'bomb',active:true});explodeBird(bird);
      if(!bird.alive||bird.static||Math.hypot(block.vx,block.vy)<10||Math.abs(block.angularVelocity)<.01)throw Error('Explosion physics');
      const pig=BIRD_PHYSICS.createBody({kind:'pig',material:'pig',shape:'circle',x:450,y:400,r:16,hp:45,maxHp:45,value:10,flash:0});
      birdState.pigs.push(pig);birdState.world.bodies.push(pig);
      applyBonus(bird,{type:'homing',active:true});if(bird.vx<=0||bird.vy<=0)throw Error('Homing');
      const clone=birdState.birds[1];applyBonus(clone,{type:'dead',active:true});if(clone.alive)throw Error('Death ability');
      const balance=state.balance,killed=birdState.pigsKilled;damagePig(pig,100);damagePig(pig,100);
      if(state.balance!==balance+10||birdState.pigsKilled!==killed+1)throw Error('Duplicate pig payment');
      const parent=createBlock(600,300,120,14,'wood'),mass=parent.mass;
      birdState.blocks.push(parent);birdState.world.bodies.push(parent);damageBlock(parent,1e6);
      const pieces=birdState.blocks.filter(b=>b.kind==='debris'&&b.x>550);
      if(pieces.length!==2||Math.abs(pieces.reduce((s,b)=>s+b.mass,0)-mass)>1e-9)throw Error('Fragment mass conservation');
      birdState.active=false;return {splitBodies:3,megaMassRatio:bird.mass/before,physicalFragments:pieces.length};
    }''')
    report['abilities']=abilities;report['checks'].append('all five bonuses, fragment mass conservation, one-time pig payments')
    completion=page.evaluate('''()=>{
      startBirdRound();birdState.bonuses=[];birdState.roundBet=20;birdState.roundWin=0;birdState.pigsKilled=0;
      birdState.world=BIRD_PHYSICS.createWorld({onImpact:birdImpactDamage});birdState.blocks=[];birdState.birds=[];
      const pig=BIRD_PHYSICS.createBody({shape:'circle',kind:'pig',material:'pig',x:600,y:494,r:16,hp:45,maxHp:45,value:10,flash:0});
      birdState.pigs=[pig];birdState.world.bodies.push(pig);
      const beam=createBlock(545,270,110,18,'stone');birdState.blocks.push(beam);birdState.world.bodies.push(beam);
      birdState.launched=true;birdState.birdsLeft=0;const balance=state.balance;
      for(let i=0;i<2400&&birdState.active;i++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT);
      if(birdState.active||birdState.pigsKilled!==1||state.balance!==balance+25||birdState.roundWin!==25)throw Error('Physical kill and round payout');
      for(let i=0;i<120;i++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT);
      if(state.balance!==balance+25)throw Error('Duplicate clear bonus');
      const clearTime=birdState.world.time;
      startBirdRound();birdState.bonuses=[];birdState.world=BIRD_PHYSICS.createWorld();birdState.blocks=[];birdState.birds=[];
      const survivor=BIRD_PHYSICS.createBody({shape:'circle',kind:'pig',material:'pig',x:900,y:494,r:16,hp:45,maxHp:45,value:10,flash:0});
      birdState.pigs=[survivor];birdState.world.bodies.push(survivor);const noWinBalance=state.balance;
      for(let shot=0;shot<3;shot++){
        birdState.dragX=230;birdState.dragY=410;launchBird();
        for(let i=0;i<2400&&birdState.active&&birdState.launched;i++)updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT);
      }
      if(birdState.active||birdState.birdsLeft!==0||state.balance!==noWinBalance||birdState.roundWin!==0)throw Error('Three misses completion');
      return {clearPayout:25,clearSeconds:clearTime,threeMissesCompleted:true};
    }''')
    report['completion']=completion;report['checks'].append('actual falling-beam kill, clear bonus paid once, three misses finish without payout')
    # A real pointer drag and release, then real-time fixed-step simulation.
    page.evaluate('Math.random=SLOT_MATH.seededRandom(27)')
    page.locator('#birdStartBtn').click()
    before=page.evaluate('state.balance')
    rect=page.locator('#birdCanvas').bounding_box()
    def point(x,y):return (rect['x']+x/960*rect['width'],rect['y']+y/540*rect['height'])
    page.mouse.move(*point(115,390));page.mouse.down();page.mouse.move(*point(27,478),steps=12);page.mouse.up()
    assert page.evaluate('birdState.launched&&birdState.birdsLeft===2')
    assert page.evaluate('birdState.birds[0].invMass>0&&birdState.birds[0].invInertia>0')
    page.wait_for_timeout(1600)
    page.screenshot(path='/workspace/output/Bird_Siege_rigid_bodies.png',full_page=True)
    report['realShot']=page.evaluate('({pigsKilled:birdState.pigsKilled,roundWin:birdState.roundWin,birds:birdState.birds.length,blocks:birdState.blocks.length,worldTime:birdState.world.time})')
    assert report['realShot']['worldTime']>1.5
    report['checks'].append('real slingshot pointer input and fixed-step live physics')
    page.evaluate('birdState.debug=true');page.wait_for_timeout(40)
    page.screenshot(path='/workspace/output/Bird_Siege_debug.png',full_page=True)
    page.locator('#backLobbyBird').click();page.locator('#openPokerGame').click();page.locator('#pokerStartBtn').click();page.locator('#choice0').click()
    assert page.evaluate('pokerState.player.length')==1
    page.locator('#backLobbyPoker').click();page.locator('#openMainGame').click()
    assert page.locator('#grid .cell').count()==25
    assert page.locator('#grid img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)')
    report['checks'].append('Poker draft, slot lobby/embedded symbols still work offline')
    assert not report['pageErrors'],report['pageErrors']
    assert not report['externalRequests'],report['externalRequests']
    browser.close()
(ROOT/'reports/bird-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
