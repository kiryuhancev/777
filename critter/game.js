const VaultCritter=window.VaultCritter=(()=>{
 const C=CRITTER_CONFIG,M=CRITTER_MODEL,A=CRITTER_ASSETS,$=id=>document.getElementById(id),root=$('critterApp'),gridEl=$('critterGrid');
 let round=null,betIndex=2,boost=false,busy=false,ready=false,auto=0,timer=null,generation=0,shownX=0,progress=null,vortexReady=false;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:6});
 const finalGrid=r=>r.bonus?.spins?.at(-1)?.finalGrid||r.bonus?.plan?.finalGrid||r.base.finalGrid;
 const spinCost=()=>M.cost({bet:BETS[betIndex],scatterBoost:!!boost});
 const name=id=>C.symbols.find(s=>s.id===id)?.name||{wild:'Running Wild',scatter:'Scatter'}[id];
 const atlas=document.createElementNS('http://www.w3.org/2000/svg','svg');atlas.setAttribute('width','0');atlas.setAttribute('height','0');atlas.style.position='absolute';atlas.setAttribute('aria-hidden','true');atlas.innerHTML=`<defs><image id="critterAtlasImage" href="${A.sheet}" width="1200" height="900"/>${Object.entries(CRITTER_SPRITES).map(([id,[x,y,w,h]])=>`<clipPath id="critterClip${id}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`).join('')}</defs>`;root.prepend(atlas);
 const tileImage=document.createElementNS('http://www.w3.org/2000/svg','image');tileImage.id='critterTileAtlas';tileImage.setAttribute('href',A.tiles);tileImage.setAttribute('width',1536);tileImage.setAttribute('height',1024);atlas.querySelector('defs').append(tileImage);
 const cells=Array.from({length:25},(_,i)=>{const n=document.createElement('div');n.className='critter-cell';n.style.setProperty('--column',i%5);gridEl.append(n);return n;});
 let plaqueSerial=0;
 function labelArt(value=1){
  const label=value>1?'x'+value:'WILD',id='critterPlaqueGold'+(++plaqueSerial),font=Math.min(190,650/(label.length*.66));
  return `<svg class="critter-label" viewBox="0 0 1000 334" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffba4"/><stop offset=".45" stop-color="#ffdd3c"/><stop offset="1" stop-color="#ee8c18"/></linearGradient></defs><image href="${A.plaque}" width="1000" height="334"/><text x="500" y="238" text-anchor="middle" font-size="${font}" font-family="Arial Black,Arial,sans-serif" font-weight="1000" fill="url(#${id})" stroke="#743207" stroke-width="13" paint-order="stroke">${label}</text><g class="plaque-sparkles" stroke="#fff0a7" stroke-width="6"><path d="M185 145h36m-18 -18v36M800 230h28m-14 -14v28M670 102h30m-15 -15v30"/></g></svg>`;
 }
 function updateLabel(node,value){const art=node.querySelector('.critter-wild-art');if(!art||art.dataset.multiplier===String(value))return;const template=document.createElement('template');template.innerHTML=labelArt(value);art.querySelector('.critter-label')?.replaceWith(template.content.firstElementChild);art.dataset.multiplier=String(value);}
 function art(id,multiplier=1){if(id==='wild')return `<span class="critter-wild-art" data-multiplier="${multiplier}"><img src="${A.raccoon}" alt="">${labelArt(multiplier)}</span>`;if(id==='scatter')return `<img class="critter-scatter-art" src="${A.newScatter}" alt="Scatter">`;if(CRITTER_TILE_SPRITES[id])return `<svg class="critter-tile-art" preserveAspectRatio="xMidYMid meet" viewBox="${CRITTER_TILE_SPRITES[id].join(' ')}" aria-hidden="true"><use href="#critterTileAtlas"/></svg>`;return `<svg preserveAspectRatio="xMidYMid meet" viewBox="${CRITTER_SPRITES[id].join(' ')}" aria-hidden="true"><use href="#critterAtlasImage" clip-path="url(#critterClip${id})"/></svg>`;}

 function draw(grid,{wins=[],activeWilds=[]}={}){gridEl.classList.toggle('has-wins',wins.length>0);const winning=new Set(wins.flatMap(w=>w.positions)),active=new Set(activeWilds);for(let i=0;i<25;i++){const t=grid[i],n=cells[i];n.className='critter-cell'+(winning.has(i)?' winning':'')+(active.has(t.uid)?' active-wild':'');n.dataset.uid=t.uid;n.setAttribute('aria-label',`${name(t.symbol)}, row ${Math.floor(i/5)+1}, column ${i%5+1}`);if(n.dataset.symbol!==t.symbol){n.innerHTML=art(t.symbol);n.dataset.symbol=t.symbol;}if(t.symbol==='wild')updateLabel(n,t.multiplier||1);}}
 function clearFX(){window.VaultBonusPopup?.cancel(C.id);vortexReady=false;$('critterBonusOverlay').classList.remove('persistent-bonus');gridEl.classList.remove('has-wins');root.classList.remove('critter-reeling');$('critterPaths').replaceChildren();$('critterBonusOverlay').hidden=true;gridEl.querySelectorAll('.critter-runner').forEach(n=>n.remove());cells.forEach(n=>n.classList.remove('winning','active-wild','removing','falling','destination'));}
 function render(){
  root.classList.toggle('critter-fast',state.fastGame);
  $('critterBet').textContent=fmt(BETS[betIndex]);$('critterWin').textContent=fmt(Math.min(C.maxWinX,shownX)*(round?.bet||BETS[betIndex]));$('critterBalance').textContent=window.VaultWalletService?VaultWalletService.formatBalance():'—';
  for(const id of ['critterMinus','critterPlus','critterMax'])$(id).disabled=busy||!!auto||!!(progress&&!progress.complete);
  $('critterSpin').disabled=busy||!!(progress&&!progress.complete)||!ready||spinCost()>state.balance||!!auto;$('critterSpin').textContent=busy?'…':'SPIN';
  $('critterAuto').disabled=!ready||busy&&!auto;$('critterAuto').textContent=auto?`STOP ${auto===-1?'∞':auto}`:'AUTO';
  $('critterBuy').disabled=busy||!!auto||!!(progress&&!progress.complete)||!ready;
  $('critterBoostIndicator').hidden=!boost;$('critterBoostIndicator').textContent='SCATTER BOOST ACTIVE · SCATTER ×'+C.features.scatterMultiplier+' · SPIN '+fmt(spinCost());
  if($('critterBonusShop').open)renderShop();
  $('critterSound').textContent=state.sound?'SOUND ON':'SOUND OFF';$('critterFast').textContent=state.fastGame?'FAST ON':'FAST OFF';
 }
 function schedule(){clearTimeout(timer);if(currentGame===C.id&&!document.hidden&&!busy&&auto)timer=setTimeout(spin,state.fastGame?450:850);}
 function tone(){if(!state.sound)return;try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(330,a.currentTime);o.frequency.exponentialRampToValueAtTime(660,a.currentTime+.12);g.gain.setValueAtTime(.012,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.16);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.16);o.onended=()=>a.close();}catch{}}
 function makeWildRunner(multiplier,label='Running Wild'){
  const runner=document.createElement('div');runner.className='critter-runner';runner.setAttribute('aria-label',label+' x'+(multiplier||1));runner.innerHTML=art('wild',multiplier||1);return runner;
 }
 async function runBonusWilds(step,g,fast,reduced){
  $('critterStatus').textContent='RUNNING WILDS · '+step.movements.length;$('critterMessage').textContent='BONUS RACCOON RUN · MULTIPLIERS TRAVEL WITH THE WILDS';
  const paths=[],animations=[],runners=[],width=gridEl.clientWidth,height=gridEl.clientHeight,duration=reduced?60:fast?220:340;
  for(const move of step.movements){
   const wild=step.initialGrid[move.from],runner=makeWildRunner(wild.multiplier,'Bonus Running Wild');const origin=vortexReady?12:move.from;runner.style.left=(origin%5*20)+'%';runner.style.top=(Math.floor(origin/5)*20)+'%';gridEl.append(runner);runners.push(runner);
   cells[move.from].classList.add('running-source');cells[move.to].classList.add('destination');
   const dx=(move.to%5-origin%5)*width/5,dy=(Math.floor(move.to/5)-Math.floor(origin/5))*height/5,startY=Math.floor(origin/5)*height/5,midY=reduced?dy/2:Math.max(0,Math.min(height*.8,startY+dy/2-height*.06))-startY;
   const x=i=>i%5*100+50,y=i=>Math.floor(i/5)*100+50;paths.push(`<path d="M${x(origin)},${y(origin)} Q${(x(origin)+x(move.to))/2},${Math.max(50,(y(origin)+y(move.to))/2-50)} ${x(move.to)},${y(move.to)}"/>`);
   const a=runner.animate([{transform:'translate(0,0)'},{transform:`translate(${dx/2}px,${midY}px) scale(${reduced?1:.94})`,offset:.5},{transform:`translate(${dx}px,${dy}px)`}],{duration,fill:'forwards',easing:'ease-in-out'});animations.push(a);
  }
  $('critterPaths').innerHTML=paths.join('');await Promise.all(animations.map(a=>a.finished.catch(()=>{})));animations.forEach(a=>a.cancel());runners.forEach(n=>n.remove());if(g!==generation)return false;$('critterPaths').replaceChildren();vortexReady=false;draw(step.finalGrid);cells.forEach((n,i)=>{if(step.movements.some(m=>m.to===i))n.classList.add('destination');});return true;
 }
 async function gatherWilds(plan,g){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?0:state.fastGame?280:680,width=gridEl.clientWidth,height=gridEl.clientHeight,runners=[],animations=[];
  for(const w of plan.persistentWildsAfter){const n=makeWildRunner(w.multiplier);n.style.left=(w.cell%5*20)+'%';n.style.top=(Math.floor(w.cell/5)*20)+'%';gridEl.append(n);runners.push(n);cells[w.cell].classList.add('running-source');const dx=(2-w.cell%5)*width/5,dy=(2-Math.floor(w.cell/5))*height/5;animations.push(n.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(180deg) scale(.35)`,opacity:.8,offset:.72},{transform:`translate(${dx}px,${dy}px) rotate(360deg) scale(.08)`,opacity:0}],{duration,fill:'forwards',easing:'ease-in-out'}));}
  await Promise.all(animations.map(a=>a.finished.catch(()=>{})));animations.forEach(a=>a.cancel());runners.forEach(n=>n.remove());if(g===generation)vortexReady=true;
 }
 function checkpoint(p){progress=M.progress(round,p);return VaultCritterBridge.saveProgress(progress);}
 async function countWin(from,to,g){
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:state.fastGame?160:300,start=performance.now();
  await new Promise(resolve=>{function frame(now){if(g!==generation){resolve();return;}const t=duration?Math.min(1,(now-start)/duration):1,value=from+(to-from)*(1-(1-t)**3);$('critterWin').textContent=fmt(value*(round?.bet||BETS[betIndex]));$('critterStatus').textContent='WIN · '+fmt(value-from)+'×';if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
 }
 async function showPlan(plan,g,{bonus=false}={}){
  const fast=state.fastGame,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  draw(plan.initialGrid);$('critterStatus').textContent=bonus?'FREE SPIN · PERSISTENT WILDS':'REELS STOPPING';
  const persistentPositions=plan.persistentWildsBefore.map(w=>w.cell);
  persistentPositions.forEach(i=>cells[i].classList.add('persistent-wild'));
  const drop=VaultSymbolDrop.play(C.id,{root:gridEl,cells:plan.initialGrid.flatMap((t,i)=>persistentPositions.includes(i)?[]:[{node:cells[i],column:i%5,row:Math.floor(i/5),symbol:t.symbol}]),rows:5,roundId:round.roundId,hasWin:!!plan.wins.length,feature:bonus,speedProfile:fast?'quick':'normal'});
  const running=bonus&&plan.movements.length?runBonusWilds(plan,g,fast,reduced):Promise.resolve(true);
  const [,moved]=await Promise.all([drop,running]);if(g!==generation||!moved)return false;
  // Exactly one reveal/evaluation: every payout and multiplier is already in the immutable plan.
  draw(plan.finalGrid,{wins:plan.wins,activeWilds:bonus?plan.activeWilds:[]});
  $('critterCascade').textContent='ONE RESULT PER SPIN';
  $('critterStatus').textContent=plan.wins.length?'WIN · '+fmt(plan.winX)+'×':'NO WIN THIS SPIN';
  $('critterMessage').textContent=plan.wins.length?plan.wins.map(w=>name(w.symbol)+' · '+(w.length?w.length+' REELS · '+w.ways+' WAYS':w.size+' CONNECTED')+(w.multiplier>1?' · x'+w.multiplier:'')).join(' / '):'FIELD SETTLED · NEXT SPIN';
  const from=shownX;shownX=M.round(Math.min(C.maxWinX,shownX+plan.winX));render();if(plan.wins.length){tone();await countWin(from,shownX,g);if(g!==generation)return false;}
  await sleep(fast?250:650);if(g!==generation)return false;
  if(bonus){
   draw(plan.updatedGrid,{wins:plan.wins});
   for(const update of plan.multiplierUpdates){const w=plan.persistentWildsAfter.find(w=>w.id===update.wildId),badge=cells[w.cell].querySelector('.critter-label');badge?.classList.add('upgraded');}
   if(plan.multiplierUpdates.length){await sleep(reduced?40:fast?100:200);if(g!==generation)return false;}
  }
  return true;
 }
 async function reveal(){
  const g=++generation;busy=true;clearFX();VaultCritterBridge.saveProgress(progress);shownX=M.round((progress?.baseDone?round.base.winX:0)+(progress?.bonusTotalX||0));render();
  $('critterMode').textContent='NEON BACKSTREET · 5×5';$('critterCascade').textContent='ONE RESULT PER SPIN';
  if(!progress.baseDone){
   if(!round.purchaseType&&!await showPlan(round.base,g))return;
   if(!checkpoint({baseDone:true,nextSpin:0})){busy=false;render();return;}
  }
  if(round.bonus){
   const b=round.bonus;
   if(progress.nextSpin===0){
    if(!await VaultBonusPopup.show(C.id,{title:b.kind==='super'?'SUPER BONUS':'FREE SPINS BONUS',value:b.spinCount+' FREE SPINS',detail:'PERSISTENT RUNNING WILDS · PERSONAL MULTIPLIERS'}))return;if(g!==generation)return;
   }
   for(let i=progress.nextSpin;i<b.spins.length;i++){
    $('critterMode').textContent=(b.kind==='super'?'SUPER · ':'')+'BONUS SPIN '+(i+1)+' / '+b.spinCount;
    if(!await showPlan(b.spins[i],g,{bonus:true}))return;
    if(!checkpoint({baseDone:true,nextSpin:i+1})){busy=false;render();return;}
    $('critterMessage').textContent=b.spins[i].persistentWildsAfter.length+' PERSISTENT WILDS · MULTIPLIERS SAVED FOR NEXT FREE SPIN';
    if(i<b.spins.length-1)await gatherWilds(b.spins[i],g);if(g!==generation)return;
   }
  }
  if(g!==generation)return;
  if(!checkpoint({baseDone:true,nextSpin:round.bonus?.spinCount||0,complete:true})){busy=false;render();return;}
  const amount=round.payout,stake=round.bet;
  if(!round.bonus&&amount&&typeof showWinMilestones==='function'&&round.winX>=WIN_LEVELS.find(l=>l.label==='BIG WIN').mult){await showWinMilestones(amount,stake);if(g!==generation)return;}
  if(round.bonus){
   if(!await VaultBonusPopup.show(C.id,{title:'BONUS COMPLETE',kicker:'TOTAL WIN',value:fmt(M.round(Math.max(0,round.winX-round.base.winX)*stake)),detail:fmt(Math.max(0,round.winX-round.base.winX))+'× TOTAL'}))return;if(g!==generation)return;if(!VaultBonusSession.complete(C.id)){busy=false;render();return;}
  }
  clearFX();shownX=round.winX;draw(round.base.finalGrid);VaultWalletService.releasePresentation(C.id);busy=false;render();$('critterMode').textContent='NEON BACKSTREET · 5×5';
  $('critterStatus').textContent=round.payout?'LAST WIN · '+fmt(round.winX)+'×':'NO WIN THIS ROUND';$('critterMessage').textContent=round.bonus?'BONUS COMPLETE · '+fmt(round.payout)+' TOTAL BANKED':'ROUND SETTLED · '+fmt(round.payout)+' BANKED';
  if(VaultStorage.inspect().conflict)VaultSync.flush();schedule();
 }
 function spin(purchaseType=null){if(!VaultReelLayout.isReady('critter'))return;
  if(![null,'bonus','super'].includes(purchaseType))purchaseType=null;
  if(!ready||busy||progress&&!progress.complete||!VaultRoundService.canPlay(C.id))return;
  clearTimeout(timer);const next=M.start({seed:crypto.getRandomValues(new Uint32Array(1))[0],bet:BETS[betIndex],roundId:crypto.randomUUID(),purchaseType,scatterBoost:!purchaseType&&!!boost});
  VaultWalletService.holdPresentation(C.id,{stake:M.cost(next)});
  if(!VaultCritterBridge.commit(next)){VaultWalletService.releasePresentation(C.id);auto=0;render();$('critterMessage').textContent='Progress is being restored. Try again shortly.';return;}
  round=next;progress=M.progress(round);if(auto>0)auto--;reveal();
 }
 function restore(value,savedProgress=null){
  generation++;busy=false;auto=0;shownX=0;clearTimeout(timer);clearFX();if(window.VaultWalletService)VaultWalletService.releasePresentation(C.id);
  round=M.validate(value);progress=round?.version>=4?(M.validateProgress(round,savedProgress)||M.progress(round,{baseDone:true,nextSpin:round.bonus?.spinCount||0,complete:true})):null;
  shownX=progress&&!progress.complete?M.round((progress.baseDone?round.base.winX:0)+progress.bonusTotalX):round?.winX||0;
  const stable=progress&&!progress.complete?(progress.nextSpin?round.bonus.spins[progress.nextSpin-1].updatedGrid:round.base.finalGrid):round?.version<4?finalGrid(round):round?.base?.finalGrid;
  draw(stable||M.spinPlan(1977).initialGrid);$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');
  $('critterMode').textContent=progress&&!progress.complete?'BONUS · '+progress.remainingFreeSpins+' FREE SPINS REMAINING':'NEON BACKSTREET · 5×5';$('critterCascade').textContent='ONE RESULT PER SPIN';
  $('critterStatus').textContent=round?'STABLE RESULT RESTORED':'READY FOR CHAOS';$('critterMessage').textContent=progress&&!progress.complete?'BONUS RESTORED · POSITIONS AND MULTIPLIERS PRESERVED':round?'ROUND SETTLED · '+fmt(round.payout)+' BANKED':'3+ REELS LEFT TO RIGHT · ONE RESULT PER SPIN';render();
 }
 function resumeFeature(){if(progress?.complete&&window.VaultBonusSession?.get(C.id)?.status==='active'){VaultBonusSession.resume(C.id);return true;}if(currentGame===C.id&&ready&&!busy&&progress&&!progress.complete){ready=VaultCritterBridge.ready;reveal();return true;}return false;}
 async function connect(){
  $('critterReconnect').hidden=true;$('critterMessage').textContent='Подключаем Critter Chaos…';
  ready=await VaultCritterBridge.connect();if(currentGame!==C.id)return;
  render();$('critterReconnect').hidden=ready;
  const messages={schema:'БД не видит функции Critter Chaos. Проверьте выполнение полного VAULT_RELEASE_SETUP.txt в подключённом проекте.',permission:'Нет доступа к функциям Critter Chaos. Проверьте права authenticated из VAULT_RELEASE_SETUP.txt.',version:'Версия функций Critter Chaos несовместима. Выполните актуальный VAULT_RELEASE_SETUP.txt.',connection:'Не удалось проверить Critter Chaos: сервер временно недоступен. Повторим подключение при восстановлении сети.'};
  $('critterMessage').textContent=ready?'3+ REELS LEFT TO RIGHT · ONE RESULT PER SPIN':messages[VaultCritterBridge.connectionError]||messages.connection;if(!resumeFeature())schedule();
 }
 async function open(){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame=C.id;document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active','table-active','swamp-active','mines-active','heist-active','magnet-active');document.body.classList.add('game-mode','critter-active');root.hidden=false;VaultStorage.schedule();syncMusic();ready=false;render();await VaultReelLayout.prepare(C.id);if(currentGame!==C.id)return;ready=VaultCritterBridge.ready;render();if(!ready)await connect();else if(!resumeFeature())schedule();}

 let shopChoice='boost';
 function renderShop(){
  const bet=BETS[betIndex];$('critterShopBet').textContent=fmt(bet);
  for(const mode of ['boost','bonus','super']){const factor=mode==='boost'?C.features.boostCost:C.features[mode+'Cost'];$('critterPrice'+mode).textContent=fmt(M.round(bet*factor))+' · '+factor+'× BET';}
  const price=M.cost({bet,purchaseType:shopChoice==='boost'?null:shopChoice,scatterBoost:shopChoice==='boost'});
  $('critterShopConfirm').disabled=busy||!!auto||!!(progress&&!progress.complete)||!ready||(shopChoice!=='boost'&&price>state.balance);
  $('critterShopConfirm').textContent=shopChoice==='boost'?(boost?'DISABLE CHANCE BOOST':'ENABLE CHANCE BOOST'):'BUY · '+fmt(price);
  $('critterShopNote').textContent=shopChoice==='boost'?'При включении деньги не списываются. Указанная полная стоимость оплачивается за каждый следующий SPIN.':(price>state.balance?'Недостаточно средств. ':'')+'Одна покупка за всю бонусную игру. Дополнительной ставки за бонусные спины нет.';
 }
 $('critterBuy').onclick=()=>{if(busy||auto||!ready)return;renderShop();$('critterBonusShop').showModal();};
 root.querySelectorAll('[name="critter-feature"]').forEach(n=>n.onchange=()=>{shopChoice=n.value;renderShop();});
 $('critterShopMinus').onclick=()=>{if(!busy&&!auto){betIndex=Math.max(0,betIndex-1);render();VaultStorage.schedule();}};
 $('critterShopPlus').onclick=()=>{if(!busy&&!auto){betIndex=Math.min(BETS.length-1,betIndex+1);render();VaultStorage.schedule();}};
 $('critterShopCancel').onclick=()=>$('critterBonusShop').close();
 $('critterShopConfirm').onclick=()=>{if(busy||auto||!ready)return;if(shopChoice==='boost'){boost=!boost;render();VaultStorage.schedule();$('critterBonusShop').close();}else{const mode=shopChoice,price=M.cost({bet:BETS[betIndex],purchaseType:mode});if(price>state.balance)return;$('critterBonusShop').close();spin(mode);}};
 $('critterReconnect').onclick=connect;
 window.addEventListener('online',()=>{if(currentGame===C.id&&!ready)connect();});
 $('openCritterGame').onclick=open;$('critterSpin').onclick=()=>spin();
 for(const [id,d] of [['critterMinus',-1],['critterPlus',1],['critterMax',999]])$(id).onclick=()=>{if(busy||auto)return;betIndex=d===999?BETS.length-1:Math.max(0,Math.min(BETS.length-1,betIndex+d));render();VaultStorage.schedule();};
 $('critterAuto').onclick=()=>{if(auto){auto=0;clearTimeout(timer);$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');render();return;}$('critterAutoMenu').hidden=!$('critterAutoMenu').hidden;$('critterAuto').setAttribute('aria-expanded',String(!$('critterAutoMenu').hidden));};root.querySelectorAll('[data-critter-auto]').forEach(n=>n.onclick=()=>{auto=Number(n.dataset.critterAuto);$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');spin();});
 document.addEventListener('click',e=>{if(!e.target.closest('.critter-auto-wrap')){$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');}});
 for(const [openId,id,closeId] of [['critterSettingsOpen','critterSettings','critterSettingsClose'],['critterHelpOpen','critterHelp','critterHelpClose']]){$(openId).onclick=()=>$(id).showModal();$(closeId).onclick=()=>$(id).close();}
 $('critterSound').onclick=()=>{toggleSetting('sound');render();};$('critterFast').onclick=()=>{toggleSetting('fastGame');render();};
 $('critterPaytable').innerHTML=['base','normal','super'].map(mode=>'<h3>'+({base:'BASE GAME',normal:'BONUS',super:'SUPER BONUS'}[mode])+'</h3><div class="critter-pay-row"><b>SYMBOL · × BET</b>'+C.sizes.map(n=>'<b>'+n+'+</b>').join('')+'</div>'+C.symbols.map(s=>'<div class="critter-pay-row"><span>'+art(s.id)+s.name+'</span>'+s.waysPays.map(p=>'<b>'+fmt(M.round(p*C.payScales[mode]))+'×</b>').join('')+'</div>').join('')).join('')+'<p>Each mode uses its displayed paytable. Base Wild is x1; bonus Wild multipliers add together and double after a win for subsequent Free Spins. Maximum whole-round win10,000× bet.</p>';
 $('critterLogo').src=A.logo;$('critterDashRunner').src=A.wild;root.querySelector('.critter-scene').style.backgroundImage=`linear-gradient(#060b1833,#09091a55),url('${A.background}')`;
 // Shared decoded asset cache is prepared before the first spin.
 new MutationObserver(()=>{if(currentGame!==C.id&&!root.hidden){root.hidden=true;restore(round,progress);for(const id of ['critterHelp','critterSettings','critterBonusShop'])if($(id).open)$(id).close();document.body.classList.remove('critter-active');}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(currentGame===C.id)schedule();});
 restore(null);return {getHudState:()=>({spinCost:spinCost(),scatterBoost:!!boost,round:round?{status:round.status,payout:round.payout,bonus:!!round.bonus}:null}),open,restore,resume(){if(currentGame===C.id&&!busy){ready=VaultCritterBridge.ready;render();if(!resumeFeature())schedule();}},getCheckpoint:()=>round?structuredClone(round):null,get isBusy(){return busy;},get scatterBoost(){return boost;},set scatterBoost(v){boost=v===true;render();},get betIndex(){return betIndex;},set betIndex(v){if(Number.isInteger(v)&&v>=0&&v<BETS.length)betIndex=v;render();},inspect:()=>({round:round?structuredClone(round):null,progress:progress?structuredClone(progress):null,busy,ready,auto})};
})();
