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
 const boosted=()=>!!state.scatterBoost&&!!window.VaultRoundService?.swampBoostSupport,spinCost=()=>money(wager()*(hasBonus()?1:boosted()?C.scatterBoost.costMultiplier:1));
 const asset=s=>s.id==='money'?A.money[s.skin||0]:A[s.id];
 function cell(s){return `<div class="swamp-cell ${s.id}" data-symbol="${s.id}" ${s.valueX?`data-value="${s.valueX}"`:''}><img src="${asset(s)}" alt="${s.id==='money'?'Money Fish '+s.valueX+'x':s.id==='collector'?'Collector Wild':s.id.replaceAll('_',' ')}" draggable="false">${s.id==='money'?`<strong class="swamp-value">${s.valueX}×</strong>`:''}</div>`;}
 function drawColumn(i,landed=false){columns[i].innerHTML=shown[i].map(cell).join('');if(landed)columns[i].querySelectorAll('.scatter,.collector').forEach(n=>n.classList.add('landed'));}
 function drawAll(){for(let i=0;i<5;i++)drawColumn(i);}
 window.addEventListener('vault-symbol-drop:onColumnLand',e=>{if(e.detail.game==='swamp')tone(150+e.detail.column*13,.05,.004);});
 window.addEventListener('vault-symbol-drop:onSpecialSymbolLand',e=>{if(e.detail.game==='swamp'&&e.detail.symbol==='collector')scene.classList.add('collector-flash');});
 window.addEventListener('vault-symbol-drop:onSymbolEnter',e=>{if(e.detail.game==='swamp'&&e.detail.anticipation)scene.classList.add('anticipating');});
 window.addEventListener('vault-analog-reels:onReelDecelerate',e=>{if(e.detail.anticipation)scene.classList.add('anticipating');});
 function preload(){if(preloaded)return;preloaded=true;VaultReelLayout.prepare('swamp');}
 function tone(freq=180,duration=.06,gain=.009){if(!state.sound||!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.65),audio.currentTime+duration);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
 function startAudio(){if(!state.sound&&!state.music)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}syncAmbient();}
 function syncAmbient(){clearInterval(ambient);ambient=null;if(currentGame!=='swamp'||!state.music||!audio)return;ambient=setInterval(()=>{if(document.hidden||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hasBonus()?61:73;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.linearRampToValueAtTime(.008,audio.currentTime+.3);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.6);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+1.7);},2200);}
 // Only a transient copy of the real checkpoint is revealed progressively; no UI counter is saved.
 const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const progressAnimations=new Set();
 const progressSlots=Array.from({length:12},(_,i)=>{
  if(i%4===0){const group=document.createElement('div');group.className='swamp-progress-group';group.dataset.milestone=String(i+4);by('swampMeter').append(group);}
  const n=document.createElement('span');n.className='swamp-progress-icon';n.dataset.index=i+1;n.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src=A.collectorProgress;img.alt='';img.draggable=false;if(i%4===3){n.classList.add('swamp-milestone-icon');n.innerHTML='<span aria-hidden="true">⚓</span><b>×'+C.multipliers[Math.floor(i/4)+1]+'</b>';}else n.append(img);by('swampMeter').lastElementChild.append(n);return n;
 });
 function paintProgress(snapshot,visible){
  const bar=by('swampFeatureBar');bar.hidden=!visible;
  const count=Math.min(12,snapshot?.collectors||0);
  by('swampCollectorTotal').textContent=String(snapshot?.collectors||0)+' FISHERMEN';
  by('swampMeter').setAttribute('aria-label',`${snapshot?.collectors||0} collectors gathered${(snapshot?.collectors||0)>=12?' · progression complete':''}`);
  for(let i=0;i<12;i++)progressSlots[i].classList.toggle('active',i<count);
  for(const group of by('swampMeter').children)group.classList.toggle('complete',count>=Number(group.dataset.milestone));
  by('swampCurrentMultiplier').textContent=`×${C.multipliers[snapshot?.phase==='level-up'?snapshot.previousTier:snapshot?.tier||0]}`;
 }
 function clearProgressFX(){window.VaultAnalogReels?.cancel();root.querySelector('.swamp-frame').classList.remove('has-win');for(const animation of progressAnimations)animation.cancel();progressAnimations.clear();by('swampProgressFlights').replaceChildren();by('swampMilestoneMessage').textContent='';by('swampFeatureBar').classList.remove('milestone');by('swampMeter').querySelectorAll('.arrival,.milestone-group').forEach(n=>n.classList.remove('arrival','milestone-group'));root.querySelectorAll('.collecting').forEach(n=>n.classList.remove('collecting'));}
 function milestone(count){
  const index=count/4,tier=C.multipliers[Math.min(3,index)];
  by('swampMilestoneMessage').textContent=count<=12?`×${tier} QUALIFIED · FINISH CURRENT LEVEL`:`${count} COLLECTORS · CURRENT LEVEL CONTINUES`;
  const target=count<=12?by('swampMeter').children[index-1]:by('swampFeatureBar');
  target.classList.remove(count<=12?'milestone-group':'milestone');void target.offsetWidth;target.classList.add(count<=12?'milestone-group':'milestone');
 }
 async function animateProgress(outcome,prior,g){
  if(!prior||!outcome.collectors.length)return;
  const layer=by('swampProgressFlights'),box=layer.getBoundingClientRect(),initial=prior.collectors;
  const small=reducedMotion();
  // Measure once per collector, never inside an animation frame callback.
  const flights=outcome.collectors.map((position,i)=>{
   const n=initial+i+1,source=columns[position.reel].children[position.row].querySelector('img');
   const target=n<=12?progressSlots[n-1]:by('swampCurrentMultiplier');
   return {n,source,from:source.getBoundingClientRect(),to:target.getBoundingClientRect(),target,index:i};
  });
  const arrivals=flights.map(async f=>{
   if(g!==generation)return;
   let clone=null,animation=null;
   if(!small){
    clone=document.createElement('div');clone.className='swamp-flying-collector';clone.dataset.destination=String(f.n<=12?f.n:12);clone.append(f.source.cloneNode(false));
    const size=Math.max(30,Math.min(f.from.width,f.from.height)),sx=f.from.x+f.from.width/2-box.x-size/2,sy=f.from.y+f.from.height/2-box.y-size/2;
    const dx=f.to.x+f.to.width/2-(f.from.x+f.from.width/2),dy=f.to.y+f.to.height/2-(f.from.y+f.from.height/2),end=Math.max(.25,f.to.width/size);
    Object.assign(clone.style,{left:sx+'px',top:sy+'px',width:size+'px',height:size+'px'});layer.append(clone);
    animation=clone.animate([{opacity:0,transform:'translate3d(0,0,0) scale(1)'},{offset:.08,opacity:1,transform:'translate3d(0,-5px,0) scale(1.05)'},{offset:.5,opacity:1,transform:`translate3d(${dx*.45}px,${dy*.45-45}px,0) scale(1.12)`},{opacity:.8,transform:`translate3d(${dx}px,${dy}px,0) scale(${end})`}],{duration:560,delay:f.index*140,fill:'both',easing:'cubic-bezier(.3,.12,.25,1)'});
    progressAnimations.add(animation);try{await animation.finished;}catch{}progressAnimations.delete(animation);clone.remove();
   }else await sleep(70+f.index*80);
   if(g!==generation)return;
   // Derived from the committed prior/current checkpoints, never a second game-state counter.
   viewBonus=prior.version===1?{...bonus,collectors:f.n,tier:Math.min(bonus.tier,Math.floor(f.n/4)),remaining:Math.min(bonus.remaining,prior.remaining-1+(Math.floor(f.n/4)-Math.floor(prior.collectors/4))*10)}:{...bonus,collectors:f.n,tier:prior.tier,phase:'playing',remaining:Math.max(0,prior.remaining-1)};
   controls();f.target.classList.add('arrival');
   if(f.n%4===0)milestone(f.n);
  });
  await Promise.all(arrivals);if(g!==generation)return;
  if(outcome.awardedSpins)await sleep(small?80:220);
 }

 // Stable popup boundaries are checkpoints, never animation frames.
 const popup=by('swampBonusGate');let pendingGate=false,gateArmedAt=0;
 function presentationKey(){return 'vault:v1:user:'+VaultSession.user?.id+':swamp-presentation';}
 function gateToken(b){return b?[b.featureId,b.phase,b.spinsPlayed].join(':'):'';}
 function acknowledged(b){try{return JSON.parse(localStorage.getItem(presentationKey()))?.token===gateToken(b);}catch{return false;}}
 function markAcknowledged(b){try{localStorage.setItem(presentationKey(),JSON.stringify({version:1,token:gateToken(b),updatedAt:Date.now()}));}catch{}}
 function closeGate(){window.VaultBonusPopup?.cancel('swamp');pendingGate=false;if(popup.open)popup.close();}
 function showGate(){
  if(pendingGate&&window.VaultBonusPopup?.isOpen('swamp'))return true;
  if(!bonus||bonus.version<2||bonus.phase==='playing')return false;
  if(acknowledged(bonus)){if(bonus.phase==='complete'){if(!VaultBonusSession.complete('swamp'))return true;bonus=null;VaultRecovery.checkpointSwamp();controls();return false;}bonus=M.acknowledge(bonus);VaultRecovery.checkpointSwamp();controls();return false;}
  pendingGate=true;gateArmedAt=performance.now()+180;clearTimeout(timer);toggleAuto(false);
  const phase=bonus.phase,level=bonus.tier+1;
  by('swampGateTitle').textContent=phase==='intro'?'ПОЗДРАВЛЯЕМ!':phase==='level-up'?'НОВЫЙ УРОВЕНЬ!':'BONUS COMPLETE';
  by('swampGateKicker').textContent=phase==='intro'?'ВЫ ВЫИГРАЛИ':phase==='level-up'?'COLLECTOR MULTIPLIER':'TOTAL WIN';
  const held=window.VaultBonusSession?.get('swamp');const total=held?.status==='active'?held.heldWin:money(bonus.totalWinX*bonus.bet);
  by('swampGateValue').textContent=phase==='complete'?format(total):phase==='intro'?'15':'×'+C.multipliers[bonus.tier];
  by('swampGateDetail').textContent=phase==='complete'?format(total/bonus.bet)+'× TOTAL':phase==='intro'?'БЕСПЛАТНЫХ ВРАЩЕНИЙ · LEVEL 1 · ×1':'+15 FREE SPINS · LEVEL '+level;
  const g=generation;VaultBonusPopup.show('swamp',{title:by('swampGateTitle').textContent,kicker:by('swampGateKicker').textContent,value:by('swampGateValue').textContent,detail:by('swampGateDetail').textContent}).then(ok=>{if(ok&&g===generation)continueGate();});controls();
  if(phase==='complete'&&!reducedMotion()){
   const target=total,start=performance.now(),g=generation;
   function frame(now){if(!pendingGate||g!==generation)return;const t=Math.min(1,(now-start)/650);by('swampGateValue').textContent=format(target*(1-(1-t)**3));if(t<1)requestAnimationFrame(frame);}
   requestAnimationFrame(frame);
  }
  return true;
 }
 function continueGate(e){
  if(!pendingGate||!window.VaultBonusPopup&&performance.now()<gateArmedAt)return;e?.preventDefault();e?.stopImmediatePropagation();
  const b=bonus;if(b.phase==='complete'&&!VaultBonusSession.complete('swamp'))return;markAcknowledged(b);closeGate();
  if(b.phase==='complete'){bonus=null;viewBonus=null;VaultRecovery.checkpointSwamp();busy=false;controls();schedule();return;}
  bonus=M.acknowledge(b);viewBonus=bonus;VaultRecovery.checkpointSwamp();busy=false;controls();spin();
 }
 popup.addEventListener('click',continueGate);popup.addEventListener('cancel',e=>e.preventDefault());
 document.addEventListener('keydown',e=>{if(pendingGate&&!window.VaultBonusPopup){if(e.code==='Space'&&!e.repeat)continueGate(e);else{e.preventDefault();e.stopImmediatePropagation();}}},true);
 function controls(){
  const view=busy?viewBonus:bonus;
  by('swampBetValue').textContent=format(busy&&view?view.bet:wager());by('swampLastWin').textContent=format(busy?displayedWin:lastWin);by('swampFeatureWin').textContent=format(busy?displayedFeatureWin:featureWin);
  by('swampSpins').textContent=view?String(view.phase==='level-up'?0:view.remaining):'—';paintProgress(view,busy?!!view:hasBonus());
  scene.classList.toggle('in-bonus',busy?!!view:hasBonus());
  const locked=busy||pendingGate||hasBonus()||autoRunning();for(const id of ['swampBetMinus','swampBetPlus','swampMaxBet'])by(id).disabled=locked;
  by('swampSpin').disabled=busy||pendingGate||autoRunning()||!window.VaultRoundService?.swampSupport||!hasBonus()&&spinCost()>state.balance;by('swampSpin').textContent=busy?'SPINNING':hasBonus()?'FREE SPIN':'SPIN';
  by('swampAuto').disabled=pendingGate||!window.VaultRoundService?.swampSupport||!autoRunning()&&(hasBonus()||busy);by('swampAuto').textContent=autoRunning()?`STOP ${auto===-1?'∞':auto}`:'AUTO';by('swampAuto').setAttribute('aria-pressed',String(autoRunning()));by('swampBuy').disabled=locked;shopControls();
  root.querySelectorAll('[data-setting]').forEach(n=>n.setAttribute('aria-pressed',String(!!state[n.dataset.setting])));
 }
 function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
 function markWins(outcome){root.querySelector('.swamp-frame').classList.toggle('has-win',outcome.winX>0);by('swampLines').innerHTML=outcome.lines.map(l=>`<polyline points="${l.rows.slice(0,l.count).map((r,c)=>`${c*100+50},${r*100+50}`).join(' ')}"/>`).join('');for(const l of outcome.lines)for(let c=0;c<l.count;c++)columns[c].children[l.rows[c]].classList.add('win');if(outcome.collectedX>0)root.querySelectorAll('.swamp-cell.money,.swamp-cell.collector').forEach(n=>n.classList.add('win'));}
 function animateCollect(outcome){root.querySelectorAll('.swamp-cell.money,.swamp-cell.collector').forEach(n=>n.classList.add('collecting'));const layer=by('swampCollectLayer'),box=layer.getBoundingClientRect();let count=0;for(const target of outcome.collectors){for(const fish of outcome.fish){if(count++>=32)break;const n=document.createElement('span');n.className='swamp-flying-value';n.textContent=`${fish.valueX}×`;n.style.setProperty('--sx',`${(fish.reel+.5)/5*100}%`);n.style.setProperty('--sy',`${(fish.row+.5)/3*100}%`);n.style.setProperty('--dx',`${(target.reel-fish.reel)*box.width/5}px`);n.style.setProperty('--dy',`${(target.row-fish.row)*box.height/3}px`);layer.append(n);}}tone(220,.7,.012);}
 async function transition(text,small,g){const n=by('swampTransition');n.replaceChildren();const t=document.createElement('span');t.textContent=text;const sub=document.createElement('small');sub.textContent=small;n.append(t,sub);n.hidden=false;await sleep(state.fastBonus?250:650);if(generation===g)n.hidden=true;}
 function schedule(){clearTimeout(timer);if(!pendingGate&&!document.hidden&&currentGame==='swamp'&&(hasBonus()||autoRunning()))timer=setTimeout(()=>spin(),hasBonus()?(state.fastBonus?80:350):C.timing.pause);}
 async function spin(){if(!VaultReelLayout.isReady('swamp'))return;
  if(busy||pendingGate||currentGame!=='swamp'||!VaultRoundService.canPlay('swamp'))return;
  if(showGate())return;
  const inBonus=hasBonus(),stake=wager(),boost=!inBonus&&boosted(),cost=money(stake*(boost?C.scatterBoost.costMultiplier:1));if(!inBonus&&cost>state.balance){auto=0;message('Недостаточно средств');controls();return;}
  const prior=bonus?{...bonus}:null;
  // Begin checkpoints the consumed free spin before any await; the model receives its prior count.
  if(inBonus)bonus={...bonus,remaining:bonus.remaining-1,spinsPlayed:bonus.spinsPlayed+1};else{bonus=null;featureWin=0;}
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const rid=VaultRoundService.begin('swamp',inBonus?0:cost,{stake,baseBet:stake,scatterBoost:boost,mathVersion:prior?.version===1?2:prior?.version===2?3:C.version,freeSpin:inBonus,freeSpinIndex:inBonus?prior.spinsPlayed+1:0,seed,featureId:prior?.featureId||null});
  if(!rid){bonus=prior;controls();return;}
  busy=true;viewBonus=prior?{...prior,remaining:prior.remaining-1}:null;VaultWalletService.holdPresentation('swamp');const g=++generation;let outcome;
  try{
   outcome=M.resolve(M.generate(inBonus,M.seeded(seed),inBonus?M.configForBonus(prior):C,boost),inBonus?prior:null);lastOutcome=outcome;
   if(inBonus){bonus=outcome.nextBonus;featureWin=money(bonus.totalWinX*stake);}
   else if(outcome.triggerSpins){bonus={...M.newBonus(outcome.scatters,stake,C,outcome.winX),featureId:rid};featureWin=money(outcome.winX*stake);}
   lastWin=money(outcome.winX*stake);
   // Wallet, entitlement and final result are one stable local checkpoint before animation.
   VaultRoundService.settleWithPayout('swamp',lastWin,outcome.winX>0?'win':'no-win',{mathVersion:prior?.version===1?2:prior?.version===2?3:C.version,seed,featureId:bonus?.featureId||prior?.featureId||rid,freeSpin:inBonus,scatters:outcome.scatters,collectors:outcome.collectors.length,moneyFish:outcome.fish.map(f=>f.valueX),multiplier:outcome.multiplier,lineWinX:outcome.lineWinX,collectedX:outcome.collectedX,retriggerSpins:outcome.awardedSpins,winX:outcome.winX,capped:outcome.capped});
  }catch(e){console.error('VAULT swamp round failed',e);VaultRoundService.finish('swamp','interrupted','cancelled');busy=false;VaultWalletService.releasePresentation('swamp');auto=0;message('Не удалось завершить спин. Ставка сохранена в истории.');controls();return;}
  clearProgressFX();
  if(!inBonus&&auto>0)auto--;by('swampLines').replaceChildren();by('swampCollectLayer').replaceChildren();root.querySelector('.swamp-frame').classList.remove('has-win');controls();message(inBonus?'The swamp wakes…':'Casting into the dark…');
  const fast=inBonus?state.fastBonus:state.fastGame;
  await VaultSymbolDrop.play('swamp',{root:by('swampReels'),reels:columns,finalGrid:outcome.grid,renderCell:cell,decorativeSymbols:C.symbols.map(s=>({id:s.id})),rows:3,roundId:rid,hasWin:outcome.winX>0,feature:inBonus,anticipation:!inBonus,speedProfile:fast?'quick':'normal'});if(g!==generation)return;shown=outcome.grid;
  scene.classList.remove('anticipating');markWins(outcome);if(outcome.winX>0)message(`WIN ${format(lastWin)} · ${format(outcome.winX)}×`);
  if(inBonus&&outcome.collectedX>0){animateCollect(outcome);message(`${format(outcome.fish.reduce((n,f)=>n+f.valueX,0))}× × ${outcome.multiplier} × ${outcome.collectors.length} COLLECTOR${outcome.collectors.length>1?'S':''} = ${format(outcome.collectedX)}×`);await sleep(fast?200:750);if(g!==generation)return;by('swampCollectLayer').replaceChildren();}
  if(inBonus)await animateProgress(outcome,prior,g);if(g!==generation)return;
  root.querySelectorAll('.collecting').forEach(n=>n.classList.remove('collecting'));
  viewBonus=bonus;displayedWin=lastWin;displayedFeatureWin=featureWin;VaultWalletService.releasePresentation('swamp');controls();
  if(outcome.winX>=WIN_LEVELS.find(level=>level.label==='BIG WIN').mult){await showWinMilestones(lastWin,stake);if(g!==generation)return;}
  if(outcome.triggerSpins&&bonus?.version===1)await transition(`${outcome.triggerSpins} FREE SPINS`,'THE SWAMP WAKES',g);
  // Collector milestones are shown at each icon arrival; rewards were already committed above.
  if(g!==generation)return;
  if(outcome.capped)message(`MAX WIN · ${format(C.maxWinX)}×`);
  else if(inBonus&&bonus?.remaining===0)message(`FREE SPINS COMPLETE · ${format(featureWin)}`);
  else if(outcome.winX>0)message(`WIN ${format(lastWin)} · ${format(outcome.winX)}×`);
  else if(outcome.collectors.length)message('Collector mark earned · no Money Fish this spin');
  else message(inBonus?'Quiet water… next free spin.':'No catch. Money Fish collect only in Free Spins.');
  if(bonus?.version===1&&bonus.remaining===0)bonus=null;scene.classList.remove('collector-flash');busy=false;controls();if(!showGate())schedule();
 }
 function message(text){by('swampMessage').textContent=text;}
 function toggleAuto(show){by('swampAutoMenu').hidden=!show;by('swampAuto').setAttribute('aria-expanded',String(show));}
 function shopControls(){by('swampScatterBoost').disabled=busy||hasBonus()||autoRunning()||!window.VaultRoundService?.swampBoostSupport;by('swampScatterBoost').setAttribute('aria-pressed',String(boosted()));by('swampBoostInfo').textContent=window.VaultRoundService?.swampBoostSupport?`${boosted()?'АКТИВЕН · ':''}шанс символа Scatter ×${C.scatterBoost.symbolMultiplier} · цена спина ×${C.scatterBoost.costMultiplier}`:'Scatter Boost доступен после обновления базы';by('swampSpinCost').textContent=hasBonus()?'FREE SPINS · без доплаты за Boost':`Базовая ставка ${format(wager())} · цена спина ${format(spinCost())}${boosted()?' · SCATTER BOOST':''}`;if(!by('swampShopOffers').children.length)return;by('swampShopBet').textContent=format(BETS[betIndex]);for(const b of root.querySelectorAll('[data-swamp-buy]')){const offer=C.purchases.find(x=>x.id===b.dataset.swampBuy);b.textContent=`BUY · ${format(offer.costX*BETS[betIndex])}`;b.disabled=busy||hasBonus()||autoRunning()||offer.costX*BETS[betIndex]>state.balance||!window.VaultRoundService?.swampPurchaseSupport;}by('swampShopMessage').textContent=window.VaultRoundService?.swampPurchaseSupport?'Each purchase charges the shown total once. The stake is locked throughout Free Spins.':'Для покупки бонусов требуется обновление базы.';}
 async function buyFeature(type){
  const offer=C.purchases.find(x=>x.id===type);if(!offer||busy||pendingGate||hasBonus()||autoRunning()||!VaultRoundService.swampPurchaseSupport||!VaultRoundService.canPlay('swamp'))return;
  const stake=BETS[betIndex],cost=money(stake*offer.costX);if(cost>state.balance)return;
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];clearProgressFX();bonus={...M.newBonus(3,stake),featureId:null,triggerSeed:seed};
  const id=VaultRoundService.begin('swamp',cost,{stake,purchaseStake:stake,purchaseType:offer.id,purchaseSpins:15,purchaseCostX:offer.costX,seed,mathVersion:C.version});
  if(!id){bonus=null;controls();return;}featureWin=0;lastWin=0;
  VaultRoundService.settleWithPayout('swamp',0,'bonus-purchased',{featureId:id,purchaseType:offer.id,purchaseSpins:15,purchaseCostX:offer.costX,seed,mathVersion:C.version,presentationTrigger:true});
  by('swampBonusShop').close();toggleAuto(false);busy=true;viewBonus=bonus;controls();const g=++generation,grid=M.purchaseTrigger(seed);
  message('PURCHASED ENTRY · 3 SCATTER TRIGGER');
  await VaultSymbolDrop.play('swamp',{root:by('swampReels'),reels:columns,finalGrid:grid,renderCell:cell,decorativeSymbols:C.symbols.map(s=>({id:s.id})),rows:3,roundId:id,hasWin:false,feature:false,anticipation:true,speedProfile:state.fastGame?'quick':'normal'});
  if(g!==generation)return;shown=grid;root.querySelectorAll('.swamp-cell.scatter').forEach(n=>n.classList.add('win'));busy=false;controls();showGate();
 }

 function getCheckpoint(){return bonus?{...bonus}:null;}
 function recoveryGrid(){
  // Reconstruct only the visual board from the last owned, already settled seed.
  // No resolve/settle, wallet change, entitlement consumption or new RNG draw.
  const saved=window.VaultStorage?.inspect().data.rounds;
  const record=saved?.findLast(r=>r.gameId==='swamp'&&r.status==='settled'&&[2,3,C.version].includes(r.metadata?.mathVersion)&&Number.isInteger(r.metadata?.seed)&&r.metadata.seed>=0&&r.metadata.seed<=4294967295);
  return record?(record.metadata.presentationTrigger===true?M.purchaseTrigger(record.metadata.seed):M.generate(record.metadata.freeSpin===true,M.seeded(record.metadata.seed),M.configForBonus({version:record.metadata.mathVersion===2?1:record.metadata.mathVersion===3?2:3}),record.metadata.scatterBoost===true)):Array.from({length:5},(_,c)=>Array.from({length:3},(_,r)=>({id:preview[(c*3+r)%preview.length]})));
 }
 function restore(value){closeGate();clearProgressFX();window.VaultWalletService?.releasePresentation('swamp');displayedWin=0;displayedFeatureWin=0;viewBonus=null;scene.classList.remove('anticipating','collector-flash');clearTimeout(timer);generation++;bonus=M.validateBonus(value);const savedSession=window.VaultBonusSession?.get('swamp');if(bonus?.phase==='complete'&&savedSession?.id===bonus.featureId&&savedSession.status==='settled')bonus=null;busy=false;auto=0;featureWin=bonus?money(bonus.totalWinX*bonus.bet):0;lastWin=0;lastOutcome=null;columns.forEach(n=>n.classList.remove('rolling','anticipation'));by('swampCollectLayer').replaceChildren();by('swampLines').replaceChildren();by('swampTransition').hidden=true;shown=recoveryGrid();drawAll();controls();message(hasBonus()?`FREE SPINS RESTORED · ${bonus.remaining}`:'10 fixed paylines · Money Fish collect in Free Spins.');}
 async function open(){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame='swamp';document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active','table-active');document.body.classList.add('game-mode','swamp-active');root.hidden=false;VaultStorage.schedule();syncMusic();preload();startAudio();controls();by('swampSpin').disabled=true;await VaultReelLayout.prepare('swamp');if(currentGame!=='swamp')return;controls();
  if(!VaultRoundService.swampSupport){message('Connecting to the dock…');const ready=await VaultRoundService.checkSwampSupport();if(currentGame!=='swamp')return;message(ready?'10 fixed paylines · Money Fish collect in Free Spins.':'Слот пока недоступен: требуется обновление базы.');controls();}
  if(VaultRoundService.swampSupport&&!showGate())schedule();
 }
 function leave(){if(root.hidden)return;closeGate();clearProgressFX();toggleAuto(false);if(by('swampBonusShop').open)by('swampBonusShop').close();VaultWalletService.releasePresentation('swamp');scene.classList.remove('anticipating','collector-flash');root.hidden=true;clearTimeout(timer);generation++;busy=false;auto=0;by('swampTransition').hidden=true;by('swampCollectLayer').replaceChildren();columns.forEach(n=>n.classList.remove('rolling','anticipation'));if(document.body.classList.contains('swamp-active'))document.body.classList.remove('swamp-active');clearInterval(ambient);ambient=null;}
 by('openSwampGame').onclick=open;by('swampSpin').onclick=()=>{startAudio();spin();};by('swampAuto').onclick=()=>{if(autoRunning()){auto=0;clearTimeout(timer);toggleAuto(false);controls();if(hasBonus()&&!busy)schedule();return;}if(busy||hasBonus())return;toggleAuto(by('swampAutoMenu').hidden);};
 for(const [id,delta] of [['swampBetMinus',-1],['swampBetPlus',1],['swampMaxBet',999]])by(id).onclick=()=>{if(busy||hasBonus()||autoRunning())return;betIndex=Math.max(0,Math.min(BETS.length-1,delta===999?BETS.length-1:betIndex+delta));controls();VaultStorage.schedule();};
 root.querySelectorAll('[data-setting]').forEach(n=>n.onclick=()=>{toggleSetting(n.dataset.setting);startAudio();controls();syncAmbient();});
 by('swampScatterBoost').onclick=()=>{if(busy||hasBonus()||autoRunning()||!window.VaultRoundService?.swampBoostSupport)return;toggleSetting('scatterBoost');controls();VaultStorage.saveLocalState();};
 by('swampBuy').onclick=()=>{if(busy||hasBonus()||autoRunning())return;toggleAuto(false);shopControls();by('swampBonusShop').showModal();};by('swampShopClose').onclick=()=>by('swampBonusShop').close();
 by('swampShopOffers').innerHTML=C.purchases.map(o=>`<article class="swamp-offer"><h3>${o.label}</h3><strong>${o.spins} FREE SPINS</strong><small>START ×1 · PROGRESS TO ×10</small><p>Cost ${o.costX}× bet · 15 SPINS PER QUALIFIED LEVEL</p><button data-swamp-buy="${o.id}">BUY</button></article>`).join('');root.querySelectorAll('[data-swamp-buy]').forEach(b=>b.onclick=()=>{startAudio();buyFeature(b.dataset.swampBuy);});
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
 return {getHudState:()=>({bonus:bonus?{remaining:bonus.phase==='level-up'?0:bonus.remaining,freeSpinsRemaining:bonus.phase==='level-up'?0:bonus.remaining,active:bonus.phase!=='complete',level:(bonus.phase==='level-up'?bonus.previousTier:bonus.tier)+1,activeMultiplier:C.multipliers[bonus.phase==='level-up'?bonus.previousTier:bonus.tier],fishermenCollected:bonus.collectors,nextThreshold:(bonus.phase==='level-up'?bonus.previousTier:bonus.tier)<3?((bonus.phase==='level-up'?bonus.previousTier:bonus.tier)+1)*4:null,bonusTotal:money(bonus.totalWinX*bonus.bet),phase:bonus.phase}:null}),open,restore,getCheckpoint,attachPurchaseRound:id=>{if(bonus)bonus.featureId=id;},resume:()=>{if(currentGame==='swamp'&&!busy&&!showGate())schedule();},get isBusy(){return busy;},get betIndex(){return betIndex;},set betIndex(value){betIndex=Number.isInteger(value)&&value>=0&&value<BETS.length?value:2;controls();},inspect:()=>({pendingGate,betIndex,bonus:getCheckpoint(),busy,auto,lastWin,featureWin,lastOutcome,shown})};
})();
