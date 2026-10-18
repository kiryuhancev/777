/* Standalone swamp UI; all business changes go through existing VAULT services. */
const VaultSwamp=window.VaultSwamp=(()=>{
 const C=SWAMP_CONFIG,M=SWAMP_MODEL,A=SWAMP_SLOT_ASSETS,by=id=>document.getElementById(id),root=by('swampApp'),scene=root.querySelector('.swamp-scene');
 const format=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:6});
 let betIndex=2,bonus=null,busy=false,auto=0,generation=0,timer=null,featureWin=0,lastWin=0,lastOutcome=null,preloaded=false,audio=null,ambient=null,viewBonus=null,displayedWin=0,displayedFeatureWin=0;
 const columns=Array.from({length:5},(_,i)=>{const n=document.createElement('div');n.className='swamp-reel';n.dataset.reel=i;by('swampReels').append(n);return n;});
 const preview=C.symbols.map(s=>s.id);let shown=Array.from({length:5},(_,c)=>Array.from({length:3},(_,r)=>({id:preview[(c*3+r)%preview.length]})));
 const autoRunning=()=>auto===-1||auto>0;
 const hasBonus=()=>!!bonus&&bonus.remaining>0;
 const wager=()=>hasBonus()?bonus.bet:BETS[betIndex];
 const money=n=>Math.round(n*1e6)/1e6;
 const asset=s=>s.id==='money'?A.money[s.skin||0]:A[s.id];
 function cell(s){return `<div class="swamp-cell ${s.id}" data-symbol="${s.id}" ${s.valueX?`data-value="${s.valueX}"`:''}><img src="${asset(s)}" alt="${s.id==='money'?'Money Fish '+s.valueX+'x':s.id==='collector'?'Collector Wild':s.id.replaceAll('_',' ')}" draggable="false">${s.id==='money'?`<strong class="swamp-value">${s.valueX}×</strong>`:''}</div>`;}
 function drawColumn(i,landed=false){columns[i].innerHTML=shown[i].map(cell).join('');if(landed)columns[i].querySelectorAll('.scatter').forEach(n=>n.classList.add('landed'));}
 function drawAll(){for(let i=0;i<5;i++)drawColumn(i);}
 function preload(){if(preloaded)return;preloaded=true;const urls=new Set([...Object.values(A).filter(x=>typeof x==='string'),...A.money]);for(const url of urls){const image=new Image();image.src=url;image.decode?.().catch(()=>{});}}
 function tone(freq=180,duration=.06,gain=.009){if(!state.sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.65),audio.currentTime+duration);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
 function startAudio(){if(!state.sound&&!state.music)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}syncAmbient();}
 function syncAmbient(){clearInterval(ambient);ambient=null;if(currentGame!=='swamp'||!state.music||!audio)return;ambient=setInterval(()=>{if(document.hidden||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hasBonus()?61:73;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.linearRampToValueAtTime(.008,audio.currentTime+.3);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.6);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+1.7);},2200);}
 function controls(){
  const view=busy?viewBonus:bonus;
  by('swampBetValue').textContent=format(busy&&view?view.bet:wager());by('swampLastWin').textContent=format(busy?displayedWin:lastWin);by('swampFeatureWin').textContent=format(busy?displayedFeatureWin:featureWin);
  by('swampSpins').textContent=view?String(view.remaining):'—';const count=view?.collectors||0;by('swampCollectorCount').textContent=`${count%4} / 4`;
  by('swampMeter').innerHTML=Array.from({length:4},(_,i)=>`<i class="${i<count%4?'lit':''}" aria-hidden="true"></i>`).join('');
  by('swampTiers').innerHTML=C.multipliers.map((n,i)=>`<span class="${i===(view?.tier||0)?'active':''}">×${n}</span>`).join('');
  scene.classList.toggle('in-bonus',busy?!!view:hasBonus());
  const locked=busy||hasBonus()||autoRunning();for(const id of ['swampBetMinus','swampBetPlus','swampMaxBet'])by(id).disabled=locked;
  by('swampSpin').disabled=busy||autoRunning()||!window.VaultRoundService?.swampSupport||!hasBonus()&&wager()>state.balance;by('swampSpin').textContent=busy?'SPINNING':hasBonus()?'FREE SPIN':'SPIN';
  by('swampAuto').disabled=!window.VaultRoundService?.swampSupport||!autoRunning()&&(hasBonus()||busy);by('swampAuto').textContent=autoRunning()?`STOP ${auto===-1?'∞':auto}`:'AUTO';by('swampAuto').setAttribute('aria-pressed',String(autoRunning()));by('swampBuy').disabled=locked;shopControls();
  root.querySelectorAll('[data-setting]').forEach(n=>n.setAttribute('aria-pressed',String(!!state[n.dataset.setting])));
 }
 function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
 function markWins(outcome){by('swampLines').innerHTML=outcome.lines.map(l=>`<polyline points="${l.rows.slice(0,l.count).map((r,c)=>`${c*100+50},${r*100+50}`).join(' ')}"/>`).join('');for(const l of outcome.lines)for(let c=0;c<l.count;c++)columns[c].children[l.rows[c]].classList.add('win');}
 function animateCollect(outcome){const layer=by('swampCollectLayer'),box=layer.getBoundingClientRect();let count=0;for(const target of outcome.collectors){for(const fish of outcome.fish){if(count++>=32)break;const n=document.createElement('span');n.className='swamp-flying-value';n.textContent=`${fish.valueX}×`;n.style.setProperty('--sx',`${(fish.reel+.5)/5*100}%`);n.style.setProperty('--sy',`${(fish.row+.5)/3*100}%`);n.style.setProperty('--dx',`${(target.reel-fish.reel)*box.width/5}px`);n.style.setProperty('--dy',`${(target.row-fish.row)*box.height/3}px`);layer.append(n);}}tone(220,.7,.012);}
 async function transition(text,small,g){const n=by('swampTransition');n.replaceChildren();const t=document.createElement('span');t.textContent=text;const sub=document.createElement('small');sub.textContent=small;n.append(t,sub);n.hidden=false;await sleep(state.fastBonus?250:650);if(generation===g)n.hidden=true;}
 function schedule(){clearTimeout(timer);if(!document.hidden&&currentGame==='swamp'&&(hasBonus()||autoRunning()))timer=setTimeout(()=>spin(),hasBonus()?(state.fastBonus?80:350):C.timing.pause);}
 async function spin(){
  if(busy||currentGame!=='swamp'||!VaultRoundService.canPlay('swamp'))return;
  const inBonus=hasBonus(),stake=wager();if(!inBonus&&stake>state.balance){auto=0;message('Недостаточно средств');controls();return;}
  const prior=bonus?{...bonus}:null;
  // Begin checkpoints the consumed free spin before any await; the model receives its prior count.
  if(inBonus)bonus={...bonus,remaining:bonus.remaining-1,spinsPlayed:bonus.spinsPlayed+1};else{bonus=null;featureWin=0;}
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const rid=VaultRoundService.begin('swamp',inBonus?0:stake,{stake,mathVersion:C.version,freeSpin:inBonus,freeSpinIndex:inBonus?prior.spinsPlayed+1:0,seed,featureId:prior?.featureId||null});
  if(!rid){bonus=prior;controls();return;}
  busy=true;viewBonus=prior?{...prior,remaining:prior.remaining-1}:null;VaultWalletService.holdPresentation('swamp');const g=++generation;let outcome;
  try{
   outcome=M.resolve(M.generate(inBonus,M.seeded(seed)),inBonus?prior:null);lastOutcome=outcome;
   if(inBonus){bonus=outcome.nextBonus;featureWin=money(bonus.totalWinX*stake);}
   else if(outcome.triggerSpins){bonus={...M.newBonus(outcome.scatters,stake,C,outcome.winX),featureId:rid};featureWin=money(outcome.winX*stake);}
   lastWin=money(outcome.winX*stake);
   // Wallet, entitlement and final result are one stable local checkpoint before animation.
   VaultRoundService.settleWithPayout('swamp',lastWin,outcome.winX>0?'win':'no-win',{mathVersion:C.version,seed,featureId:bonus?.featureId||prior?.featureId||rid,freeSpin:inBonus,scatters:outcome.scatters,collectors:outcome.collectors.length,moneyFish:outcome.fish.map(f=>f.valueX),multiplier:outcome.multiplier,lineWinX:outcome.lineWinX,collectedX:outcome.collectedX,retriggerSpins:outcome.awardedSpins,winX:outcome.winX,capped:outcome.capped});
  }catch(e){console.error('VAULT swamp round failed',e);VaultRoundService.finish('swamp','interrupted','cancelled');busy=false;VaultWalletService.releasePresentation('swamp');auto=0;message('Не удалось завершить спин. Ставка сохранена в истории.');controls();return;}
  if(!inBonus&&auto>0)auto--;by('swampLines').replaceChildren();by('swampCollectLayer').replaceChildren();columns.forEach((n,i)=>{const strip=document.createElement('div');strip.className='swamp-strip';strip.innerHTML=[...shown[i],...shown[i]].map(cell).join('');n.replaceChildren(strip);n.classList.add('rolling');});controls();message(inBonus?'The swamp wakes…':'Casting into the dark…');
  const fast=inBonus?state.fastBonus:state.fastGame;await sleep(fast?C.timing.fastInitial:C.timing.initial);if(g!==generation)return;
  let scatters=0;
  for(let c=0;c<5;c++){
   if(scatters>=2&&!inBonus){scene.classList.add('anticipating');for(let x=c;x<5;x++)columns[x].classList.add('anticipation');await sleep(fast?70:C.timing.anticipation);if(g!==generation)return;}
   await sleep(fast?C.timing.fastReel:C.timing.reel);if(g!==generation)return;shown[c]=outcome.grid[c];columns[c].classList.remove('rolling','anticipation');drawColumn(c,true);if(shown[c].some(s=>s.id==='collector'))scene.classList.add('collector-flash');scatters+=shown[c].filter(s=>s.id==='scatter').length;tone(150+c*13,.05,.004);
  }
  scene.classList.remove('anticipating');markWins(outcome);
  if(inBonus&&outcome.collectedX>0){animateCollect(outcome);message(`${format(outcome.fish.reduce((n,f)=>n+f.valueX,0))}× × ${outcome.multiplier} × ${outcome.collectors.length} COLLECTOR${outcome.collectors.length>1?'S':''} = ${format(outcome.collectedX)}×`);await sleep(fast?200:750);if(g!==generation)return;by('swampCollectLayer').replaceChildren();}
  viewBonus=bonus;displayedWin=lastWin;displayedFeatureWin=featureWin;VaultWalletService.releasePresentation('swamp');controls();
  if(outcome.triggerSpins)await transition(`${outcome.triggerSpins} FREE SPINS`,'THE SWAMP WAKES',g);
  else if(outcome.awardedSpins)await transition(`+${outcome.awardedSpins} FREE SPINS`,`NEXT COLLECT ×${C.multipliers[bonus?.tier||0]}`,g);
  if(g!==generation)return;
  if(outcome.capped)message(`MAX WIN · ${format(C.maxWinX)}×`);
  else if(inBonus&&bonus?.remaining===0)message(`FREE SPINS COMPLETE · ${format(featureWin)}`);
  else if(outcome.winX>0)message(`WIN ${format(lastWin)} · ${format(outcome.winX)}×`);
  else if(outcome.collectors.length)message('Collector mark earned · no Money Fish this spin');
  else message(inBonus?'Quiet water… next free spin.':'No catch. Money Fish collect only in Free Spins.');
  if(bonus?.remaining===0)bonus=null;scene.classList.remove('collector-flash');busy=false;controls();schedule();
 }
 function message(text){by('swampMessage').textContent=text;}
 function toggleAuto(show){by('swampAutoMenu').hidden=!show;by('swampAuto').setAttribute('aria-expanded',String(show));}
 function shopControls(){if(!by('swampShopOffers').children.length)return;by('swampShopBet').textContent=format(BETS[betIndex]);for(const b of root.querySelectorAll('[data-swamp-buy]')){const offer=C.purchases.find(x=>x.id===b.dataset.swampBuy);b.textContent=`BUY · ${format(offer.costX*BETS[betIndex])}`;b.disabled=busy||hasBonus()||autoRunning()||offer.costX*BETS[betIndex]>state.balance||!window.VaultRoundService?.swampPurchaseSupport;}by('swampShopMessage').textContent=window.VaultRoundService?.swampPurchaseSupport?'Each purchase charges the shown total once. The stake is locked throughout Free Spins.':'Для покупки бонусов требуется обновление базы.';}
 async function buyFeature(type){const offer=C.purchases.find(x=>x.id===type);if(!offer||busy||hasBonus()||autoRunning()||!VaultRoundService.swampPurchaseSupport||!VaultRoundService.canPlay('swamp'))return;const stake=BETS[betIndex],cost=money(stake*offer.costX);if(cost>state.balance)return;bonus={...M.newBonus(offer.spins===20?5:3,stake),featureId:null};const id=VaultRoundService.begin('swamp',cost,{stake,purchaseStake:stake,purchaseType:offer.id,purchaseSpins:offer.spins,purchaseCostX:offer.costX,mathVersion:C.version});if(!id){bonus=null;controls();return;}featureWin=0;lastWin=0;VaultRoundService.settleWithPayout('swamp',0,'bonus-purchased',{featureId:id,purchaseType:offer.id,purchaseSpins:offer.spins,purchaseCostX:offer.costX});by('swampBonusShop').close();toggleAuto(false);busy=true;viewBonus=bonus;controls();const g=++generation;await transition(`${offer.spins} FREE SPINS`,'FEATURE PURCHASED · COLLECT ×1',g);if(g!==generation)return;busy=false;controls();schedule();}
 function getCheckpoint(){return bonus?{...bonus}:null;}
 function restore(value){window.VaultWalletService?.releasePresentation('swamp');displayedWin=0;displayedFeatureWin=0;viewBonus=null;scene.classList.remove('anticipating','collector-flash');clearTimeout(timer);generation++;bonus=M.validateBonus(value);busy=false;auto=0;featureWin=bonus?money(bonus.totalWinX*bonus.bet):0;lastWin=0;lastOutcome=null;columns.forEach(n=>n.classList.remove('rolling','anticipation'));by('swampCollectLayer').replaceChildren();by('swampLines').replaceChildren();by('swampTransition').hidden=true;shown=Array.from({length:5},(_,c)=>Array.from({length:3},(_,r)=>({id:preview[(c*3+r)%preview.length]})));drawAll();controls();message(hasBonus()?`FREE SPINS RESTORED · ${bonus.remaining}`:'10 fixed paylines · Money Fish collect in Free Spins.');}
 async function open(){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame='swamp';document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active','table-active');document.body.classList.add('game-mode','swamp-active');root.hidden=false;VaultStorage.schedule();syncMusic();preload();startAudio();controls();
  if(!VaultRoundService.swampSupport){message('Connecting to the dock…');const ready=await VaultRoundService.checkSwampSupport();if(currentGame!=='swamp')return;message(ready?'10 fixed paylines · Money Fish collect in Free Spins.':'Слот пока недоступен: требуется обновление базы.');controls();}
  if(VaultRoundService.swampSupport)schedule();
 }
 function leave(){if(root.hidden)return;toggleAuto(false);if(by('swampBonusShop').open)by('swampBonusShop').close();VaultWalletService.releasePresentation('swamp');scene.classList.remove('anticipating','collector-flash');root.hidden=true;clearTimeout(timer);generation++;busy=false;auto=0;by('swampTransition').hidden=true;by('swampCollectLayer').replaceChildren();columns.forEach(n=>n.classList.remove('rolling','anticipation'));if(document.body.classList.contains('swamp-active'))document.body.classList.remove('swamp-active');clearInterval(ambient);ambient=null;}
 by('openSwampGame').onclick=open;by('swampSpin').onclick=()=>{startAudio();spin();};by('swampAuto').onclick=()=>{if(autoRunning()){auto=0;clearTimeout(timer);toggleAuto(false);controls();if(hasBonus()&&!busy)schedule();return;}if(busy||hasBonus())return;toggleAuto(by('swampAutoMenu').hidden);};
 for(const [id,delta] of [['swampBetMinus',-1],['swampBetPlus',1],['swampMaxBet',999]])by(id).onclick=()=>{if(busy||hasBonus()||autoRunning())return;betIndex=Math.max(0,Math.min(BETS.length-1,delta===999?BETS.length-1:betIndex+delta));controls();VaultStorage.schedule();};
 root.querySelectorAll('[data-setting]').forEach(n=>n.onclick=()=>{toggleSetting(n.dataset.setting);startAudio();controls();syncAmbient();});
 by('swampBuy').onclick=()=>{if(busy||hasBonus()||autoRunning())return;toggleAuto(false);shopControls();by('swampBonusShop').showModal();};by('swampShopClose').onclick=()=>by('swampBonusShop').close();
 by('swampShopOffers').innerHTML=C.purchases.map(o=>`<article class="swamp-offer"><h3>${o.label}</h3><strong>${o.spins} FREE SPINS</strong><small>START ×1 · PROGRESS TO ×10</small><p>Cost ${o.costX}× bet · collector retriggers included</p><button data-swamp-buy="${o.id}">BUY</button></article>`).join('');root.querySelectorAll('[data-swamp-buy]').forEach(b=>b.onclick=()=>{startAudio();buyFeature(b.dataset.swampBuy);});
 for(const [id,d] of [['swampShopBetMinus',-1],['swampShopBetPlus',1]])by(id).onclick=()=>{if(busy||hasBonus()||autoRunning())return;betIndex=Math.max(0,Math.min(BETS.length-1,betIndex+d));controls();VaultStorage.schedule();};
 root.querySelectorAll('[data-swamp-auto]').forEach(b=>b.onclick=()=>{const count=Number(b.dataset.swampAuto);if(busy||hasBonus()||!C.autoChoices.includes(count))return;auto=count;toggleAuto(false);startAudio();controls();spin();});document.addEventListener('click',e=>{if(!e.target.closest('.swamp-auto-wrap'))toggleAuto(false);});
 by('swampTitle').textContent=C.displayName;if(C.GAME_LOGO_SRC){by('swampLogo').onerror=()=>{by('swampLogo').hidden=true;by('swampTitle').hidden=false;};by('swampLogo').src=C.GAME_LOGO_SRC;by('swampLogo').hidden=false;by('swampTitle').hidden=true;}
 root.querySelector('.swamp-environment').style.backgroundImage=`linear-gradient(180deg,#10151220,#10151238 48%,#101512d9),url("${A.background}")`;
 root.querySelectorAll('.swamp-lantern').forEach(n=>n.src=A.lantern);
 by('swampCapInfo').textContent=`Maximum paid-spin + feature win: ${format(C.maxWinX)}× the triggering bet. Reaching it ends Free Spins. Money Fish values: ${C.money.map(m=>m.x+'×').join(', ')}. 2000× is extremely rare. Outcomes are independent of previous wins.`;
 by('swampPaytable').innerHTML='<div class="swamp-pay-row"><span></span><b>SYMBOL</b><b>3</b><b>4</b><b>5</b></div>'+C.symbols.map(s=>`<div class="swamp-pay-row"><img src="${A[s.id]}" alt=""><span>${s.id.replaceAll('_',' ')}</span>${s.pays.map(p=>`<b>${format(money(p*C.lineScale))}×</b>`).join('')}</div>`).join('');
 by('swampLineGuide').innerHTML=C.paylines.map((rows,i)=>`<svg viewBox="0 0 100 60" role="img" aria-label="Payline ${i+1}"><polyline points="${rows.map((r,c)=>`${c*20+10},${r*20+10}`).join(' ')}"/></svg>`).join('');
 root.querySelector('.swamp-fireflies').innerHTML=Array.from({length:14},(_,i)=>`<i style="left:${(i*37+7)%100}%;top:${(i*19+9)%95}%;animation-delay:-${i*.7}s"></i>`).join('');
 new MutationObserver(()=>{if(currentGame!=='swamp')leave();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);clearInterval(ambient);ambient=null;}else if(currentGame==='swamp'){syncAmbient();if(!busy)schedule();}});
 drawAll();controls();
 return {open,restore,getCheckpoint,attachPurchaseRound:id=>{if(bonus)bonus.featureId=id;},resume:schedule,get isBusy(){return busy;},get betIndex(){return betIndex;},set betIndex(value){betIndex=Number.isInteger(value)&&value>=0&&value<BETS.length?value:2;controls();},inspect:()=>({betIndex,bonus:getCheckpoint(),busy,auto,lastWin,featureWin,lastOutcome,shown})};
})();
