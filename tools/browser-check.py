"""Optional cloud smoke check: python3 tools/browser-check.py (Playwright + Chromium)."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
html=(ROOT/'index.html').read_text()
report={'checks':[],'pageErrors':[],'externalRequests':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':900})
    # file:// is blocked by this cloud Chromium's administrator policy. Inject the exact
    # standalone HTML into an offline document to verify it needs no HTTP/CDN resources.
    context.set_offline(True)
    page=context.new_page();page.set_default_timeout(6000)
    page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
    page.on('request',lambda r:report['externalRequests'].append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.set_content(html,wait_until='load')
    page.locator('#openMainGame').click()
    assert page.locator('.grid .cell').count()==25
    assert page.locator('.grid img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)')
    report['checks'].append('offline inline script, embedded images, lobby and 25-cell grid')
    # Keep the actual real-time animation in this check.
    page.evaluate('state.sound=false;state.fastGame=true;spin()')
    page.wait_for_function('!state.busy',timeout=60000)
    assert page.evaluate('state.sticky.size')==0
    report['checks'].append('real animated base spin, normal Wild never sticky')
    # Purchase fixture: select a seeded non-winning initial board so the purchase
    # balance and first-FS timing are unambiguous. Never change app probabilities.
    seed=page.evaluate('''() => {
      for(let seed=1;seed<1000;seed++){
        const m=SLOT_MATH.newBoard();SLOT_MATH.generate(m,SLOT_MATH.seededRandom(seed),{forceScatters:4});
        if(!SLOT_MATH.findWins(m).length)return seed;
      }
      throw new Error('No fixture seed');
    }''')
    page.evaluate('''seed=>{
      rand=SLOT_MATH.seededRandom(seed);state.balance=1000000;
      window.purchaseBalance=state.balance;window.purchaseBet=bet();
      const originalSpin=spin;window.actualSpin=originalSpin;
      spin=async o=>{if(!window.firstFreeSpinStarted)window.firstFreeSpinStarted=performance.now();return originalSpin(o)};
      buyBonusFeature('super');
    }''',seed)
    page.locator('#startBonusBtn').wait_for(state='visible',timeout=20000)
    assert page.evaluate('state.balance===purchaseBalance-purchaseBet*65')
    page.evaluate('window.rulesClosedAt=performance.now()');page.locator('#startBonusBtn').click()
    page.wait_for_function('!!window.firstFreeSpinStarted',timeout=10000)
    delay=page.evaluate('firstFreeSpinStarted-rulesClosedAt');assert delay>=950
    page.evaluate('state.bonusAutoRunning=false;clearTimeout(bonusAutoTimer)')
    page.wait_for_function('!state.busy',timeout=60000)
    report['firstFreeSpinDelayMs']=delay
    report['checks'].append('Super purchase cost, rules modal, first automatic FS after one second')
    # Another fresh offline page checks live/simulator parity with animation and auto
    # scheduling disabled only in the test fixture, never in the shipped HTML.
    parity=context.new_page();parity.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
    parity.set_content(html,wait_until='load')
    results=parity.evaluate('''async()=>{
      const savedEnd=endBonus;
      render=()=>{};sound=()=>{};toast=()=>{};showWinFloat=async()=>{};showWinMilestones=async()=>{};
      showBonusIntro=async()=>{};showBonusResult=async()=>{};levelUp=async()=>{};
      scheduleBonusAuto=()=>{};waitAfterFullDrop=async()=>{};
      const originalTimeout=window.setTimeout;window.setTimeout=(cb,ms,...args)=>{queueMicrotask(()=>cb(...args));return 0};
      endBonus=async()=>{window.finished={x:state.bonusTotalWin/bet(),spins:state.bonusSpinsPlayed,cascades:state.bonusCascades};await savedEnd()};
      const results=[];
      for(const variant of ['normal','super']){
        const type=variant,seed=438;
        const makeRng=()=>SLOT_MATH.seededRandom(seed);
        const expected=SLOT_MATH.simulateOne(type,makeRng());
        rand=makeRng();state.balance=1000000;state.busy=false;
        await startBonus(type);state.bonusAutoRunning=false;
        let limit=0;while(state.bonus&&limit++<10000){await spin();if(state.cascadeStopReason!=='no-win')throw new Error('Guard hit')}
        if(state.bonus)throw new Error('Bonus unfinished');
        if(Math.abs(finished.x-expected.x)>1e-8||finished.spins!==expected.spins||finished.cascades!==expected.cascades)throw new Error('Live/simulator divergence: '+JSON.stringify({finished,expected}));
        if(state.size!==5||state.sticky.size)throw new Error('Bonus did not reset');
        results.push({type:variant,...finished});
      }
      const fixtures=[];
      for(const large of [false,true]){
        const initial=SLOT_MATH.newBonus('normal');initial.grid.fill(-1);
        for(let r=0;r<5;r++)for(let c=0;c<5;c++)initial.grid[r*5+c]=(r*3+c)%9;
        for(let c=0;c<5;c++)initial.grid[c]=large?(c<3?12:2):0;
        const fixtureSeed=123,expected=SLOT_MATH.settle(initial,SLOT_MATH.seededRandom(fixtureSeed));
        const model=SLOT_MATH.newBonus('normal');
        for(let r=0;r<5;r++)for(let c=0;c<5;c++)model.grid[r*5+c]=(r*3+c)%9;
        for(let c=0;c<5;c++)model.grid[c]=large?(c<3?12:2):0;
        state.bonus=true;state.bonusType='normal';state.slotProfile='normal';state.bonusTotalWin=0;
        state.bonusCascades=0;state.lastWin=0;state.balance=1000000;writeSlotModel(model);
        rand=SLOT_MATH.seededRandom(fixtureSeed);const payments=[];showWinFloat=async amount=>payments.push(amount/bet());
        const before=state.balance,actual=await settleSpin();
        if(Math.abs(actual/bet()-expected.totalX)>1e-8||Math.abs((state.balance-before)/bet()-expected.totalX)>1e-8)throw new Error('Wallet differs from paytable');
        if(large&&payments[0]<=50)throw new Error('Large payout was capped');
        if(!large&&payments[0]>=1)throw new Error('Small payout was rounded up');
        fixtures.push({large,firstCascadeX:payments[0],totalX:actual/bet()});
      }
      return {sessions:results,paytableFixtures:fixtures};
    }''')
    report['parity']=results;report['checks'].append('complete Bonus and Super: live/simulator parity, 5x5 reset')
    page.close();parity.close()
    other=context.new_page();other.on('pageerror',lambda e:report['pageErrors'].append(str(e)));other.set_content(html,wait_until='load')
    other.locator('#openPokerGame').click();other.locator('#pokerStartBtn').click();other.locator('#choice0').click()
    assert other.evaluate('pokerState.player.length')==1
    other.locator('#backLobbyPoker').click();other.locator('#openBirdGame').click();other.locator('#birdStartBtn').click()
    assert other.evaluate('birdState.active&&birdState.blocks.length>0')
    report['checks'].append('Poker Duel draft and Bird Siege startup')
    assert not report['pageErrors'],report['pageErrors'];assert not report['externalRequests'],report['externalRequests']
    browser.close()
(ROOT/'reports'/'browser-v44.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
