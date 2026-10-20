const VaultCritter=window.VaultCritter=(()=>{
 const C=CRITTER_CONFIG,M=CRITTER_MODEL,A=CRITTER_ASSETS,$=id=>document.getElementById(id),root=$('critterApp'),gridEl=$('critterGrid');
 let round=null,betIndex=2,busy=false,ready=false,auto=0,timer=null,generation=0,shownX=0;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:6});
 const name=id=>C.symbols.find(s=>s.id===id)?.name||{wild:'Running Wild',scatter:'Scatter'}[id];
 const atlas=document.createElementNS('http://www.w3.org/2000/svg','svg');atlas.setAttribute('width','0');atlas.setAttribute('height','0');atlas.style.position='absolute';atlas.setAttribute('aria-hidden','true');atlas.innerHTML=`<defs><image id="critterAtlasImage" href="${A.sheet}" width="1200" height="900"/>${Object.entries(CRITTER_SPRITES).map(([id,[x,y,w,h]])=>`<clipPath id="critterClip${id}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`).join('')}</defs>`;root.prepend(atlas);
 const cells=Array.from({length:25},(_,i)=>{const n=document.createElement('div');n.className='critter-cell';n.style.setProperty('--column',i%5);gridEl.append(n);return n;});
 function art(id){return ['wild','scatter'].includes(id)?`<img src="${A[id]}" alt="">`:`<svg viewBox="${CRITTER_SPRITES[id].join(' ')}" aria-hidden="true"><use href="#critterAtlasImage" clip-path="url(#critterClip${id})"/></svg>`;}
 function draw(grid,{wins=[],activeWilds=[]}={}){const winning=new Set(wins.flatMap(w=>w.positions)),active=new Set(activeWilds);for(let i=0;i<25;i++){const t=grid[i],n=cells[i];n.className='critter-cell'+(winning.has(i)?' winning':'')+(active.has(t.uid)?' active-wild':'');n.dataset.uid=t.uid;n.setAttribute('aria-label',`${name(t.symbol)}, row ${Math.floor(i/5)+1}, column ${i%5+1}`);if(n.dataset.symbol!==t.symbol){n.innerHTML=art(t.symbol);n.dataset.symbol=t.symbol;}}}
 function clearFX(){root.classList.remove('critter-reeling');$('critterPaths').replaceChildren();$('critterBonusOverlay').hidden=true;gridEl.querySelectorAll('.critter-runner').forEach(n=>n.remove());cells.forEach(n=>n.classList.remove('winning','active-wild','removing','falling','destination'));}
 function render(){
  root.classList.toggle('critter-fast',state.fastGame);
  $('critterBet').textContent=fmt(BETS[betIndex]);$('critterWin').textContent=fmt(Math.min(C.maxWinX,shownX)*(round?.bet||BETS[betIndex]));$('critterBalance').textContent=window.VaultWalletService?VaultWalletService.formatBalance():'—';
  for(const id of ['critterMinus','critterPlus','critterMax'])$(id).disabled=busy||!!auto;
  $('critterSpin').disabled=busy||!ready||BETS[betIndex]>state.balance||!!auto;$('critterSpin').textContent=busy?'…':'SPIN';
  $('critterAuto').disabled=!ready||busy&&!auto;$('critterAuto').textContent=auto?`STOP ${auto===-1?'∞':auto}`:'AUTO';
  $('critterSound').textContent=state.sound?'SOUND ON':'SOUND OFF';$('critterFast').textContent=state.fastGame?'FAST ON':'FAST OFF';
 }
 function schedule(){clearTimeout(timer);if(currentGame===C.id&&!document.hidden&&!busy&&auto)timer=setTimeout(spin,state.fastGame?450:850);}
 function tone(){if(!state.sound)return;try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(330,a.currentTime);o.frequency.exponentialRampToValueAtTime(660,a.currentTime+.12);g.gain.setValueAtTime(.012,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.16);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.16);o.onended=()=>a.close();}catch{}}
 async function showPlan(plan,g,{bonus=false,multiplier=1}={}){
  const fast=state.fastGame,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  draw(plan.initialGrid);$('critterStatus').textContent=bonus?'BONUS DROP · EXTRA WILDS':'REELS STOPPING';await VaultSymbolDrop.play(C.id,{root:gridEl,cells:plan.initialGrid.map((t,i)=>({node:cells[i],column:i%5,row:Math.floor(i/5),symbol:t.symbol})),rows:5,roundId:round.roundId,hasWin:!!plan.steps.length,feature:bonus,speedProfile:fast?'quick':'normal'});if(g!==generation)return false;
  for(const step of plan.steps){
   draw(step.grid,{wins:step.wins,activeWilds:step.activeWilds});$('critterCascade').textContent='CASCADE '+(step.index+1);$('critterStatus').textContent='CLUSTER WIN · '+fmt(step.winX*multiplier)+'×';$('critterMessage').textContent=step.wins.map(w=>name(w.symbol)+' · '+w.size+' CONNECTED').join(' / ');shownX=M.round(Math.min(C.maxWinX,shownX+step.winX*multiplier));render();tone();await sleep(fast?230:550);if(g!==generation)return false;
   if(!step.gravityGrid)break;
   const removed=new Set(step.removed);cells.forEach(n=>{if(removed.has(Number(n.dataset.uid)))n.classList.add('removing');});await sleep(fast?100:200);if(g!==generation)return false;
   draw(step.gravityGrid);$('critterStatus').textContent='REFILL';const refill=step.gravityGrid.flatMap((t,i)=>{const previous=step.grid.findIndex(x=>x.uid===t.uid);return previous===i?[]:[{node:cells[i],column:i%5,row:Math.floor(i/5),symbol:t.symbol,fromRows:previous<0?undefined:Math.max(1,Math.floor(i/5)-Math.floor(previous/5))}];});await VaultSymbolDrop.play(C.id,{root:gridEl,cells:refill,rows:5,roundId:round.roundId,phase:'cascade',settle:false,speedProfile:fast?'quick':'normal'});if(g!==generation)return false;
   const visible=structuredClone(step.gravityGrid);
   for(const move of step.moves){
    $('critterStatus').textContent='RUNNING WILD';$('critterMessage').textContent='RACCOON RUN · '+(move.from+1)+' → '+(move.to+1);cells[move.from].classList.add('active-wild','running-source');cells[move.to].classList.add('destination');
    const x=i=>i%5*100+50,y=i=>Math.floor(i/5)*100+50,bend=Math.min(Math.floor(move.from/5),Math.floor(move.to/5))===0?1:-1;$('critterPaths').innerHTML=`<path d="M${x(move.from)},${y(move.from)} Q${(x(move.from)+x(move.to))/2},${Math.max(50,Math.min(450,(y(move.from)+y(move.to))/2+bend*80))} ${x(move.to)},${y(move.to)}"/>`;
    const runner=document.createElement('img');runner.src=A.wild;runner.className='critter-runner';runner.alt='Running Wild';runner.style.left=(move.from%5*20)+'%';runner.style.top=(Math.floor(move.from/5)*20)+'%';gridEl.append(runner);
    const dx=(move.to%5-move.from%5)*gridEl.clientWidth/5,dy=(Math.floor(move.to/5)-Math.floor(move.from/5))*gridEl.clientHeight/5,startY=Math.floor(move.from/5)*gridEl.clientHeight/5,midY=Math.max(0,Math.min(gridEl.clientHeight*.8,startY+dy/2+bend*gridEl.clientHeight*.08))-startY,duration=reduced?50:fast?190:350;
    if(!reduced)runner.animate([{transform:'translate(0,0) rotate(0)'},{transform:`translate(${dx/2}px,${midY}px) rotate(${dx<0?-8:8}deg) scale(.88)`,offset:.5},{transform:`translate(${dx}px,${dy}px) rotate(0)`}],{duration,fill:'forwards',easing:'ease-in-out'});
    await sleep(duration);if(g!==generation)return false;runner.remove();$('critterPaths').replaceChildren();[visible[move.from],visible[move.to]]=[visible[move.to],visible[move.from]];draw(visible);
   }
   draw(step.nextGrid);
  }
  draw(plan.finalGrid);$('critterStatus').textContent=plan.limitReached?'CASCADE LIMIT · LAST WIN PAID':'FIELD SETTLED';return true;
 }
 async function reveal(){const g=++generation;busy=true;shownX=0;clearFX();render();$('critterMode').textContent='NEON BACKSTREET · 5×5';$('critterCascade').textContent='CASCADE 0';if(!await showPlan(round.base,g))return;
  if(round.bonus){
   const b=round.bonus,fast=state.fastGame,awards=[{label:'CASH',text:'+'+b.cashX+'×'},{label:'WILD DROP',text:'+'+b.extraWilds+' WILDS'},{label:'MULTIPLIER',text:'×'+b.multiplier}];
   $('critterBonusOverlay').hidden=false;$('critterBonusMessage').textContent='ALL THREE DUMPSTERS · ALL THREE REWARDS';$('critterBonusBins').innerHTML=awards.map(a=>`<div class="critter-bonus-bin"><img src="${A.scatter}" alt="Dumpster"><small>${a.label}</small><strong>?</strong></div>`).join('');$('critterDashRunner').style.left='0';await sleep(fast?350:700);if(g!==generation)return;
   for(let i=0;i<3;i++){$('critterDashRunner').style.left=`calc(${i*40}% - ${i*10}px)`;await sleep(fast?250:500);if(g!==generation)return;const bin=$('critterBonusBins').children[i];bin.classList.add('revealed');bin.querySelector('strong').textContent=awards[i].text;tone();}
   $('critterBonusMessage').textContent=`(+${b.cashX}× + BONUS FIELD WINS) ×${b.multiplier}`;await sleep(fast?450:800);if(g!==generation)return;$('critterBonusOverlay').hidden=true;
   shownX=M.round(shownX+b.cashX*b.multiplier);render();$('critterMode').textContent='DUMPSTER DASH · ×'+b.multiplier;$('critterCascade').textContent='BONUS CASCADE 0';if(!await showPlan(b.plan,g,{bonus:true,multiplier:b.multiplier}))return;
  }
  if(g!==generation)return;clearFX();shownX=round.winX;VaultWalletService.releasePresentation('critter');busy=false;render();$('critterStatus').textContent=round.payout?'ROUND WIN · '+fmt(round.winX)+'×':'NO WIN THIS ROUND';$('critterMessage').textContent=round.bonus?`DUMPSTER DASH: (${fmt(round.bonus.cashX)}× + ${fmt(round.bonus.plan.winX)}×) ×${round.bonus.multiplier} · ${fmt(round.payout)} TOTAL BANKED`:`ROUND SETTLED · ${fmt(round.payout)} BANKED`;if(VaultStorage.inspect().conflict)VaultSync.flush();schedule();
 }
 function spin(){if(!ready||busy||!VaultRoundService.canPlay(C.id))return;clearTimeout(timer);const next=M.start({seed:crypto.getRandomValues(new Uint32Array(1))[0],bet:BETS[betIndex],roundId:crypto.randomUUID()});VaultWalletService.holdPresentation(C.id,{stake:next.bet});if(!VaultCritterBridge.commit(next)){VaultWalletService.releasePresentation(C.id);auto=0;render();$('critterMessage').textContent='Progress is being restored. Try again shortly.';return;}round=next;if(auto>0)auto--;reveal();}
 function restore(value){generation++;busy=false;auto=0;shownX=0;clearTimeout(timer);clearFX();if(window.VaultWalletService)VaultWalletService.releasePresentation(C.id);round=M.validate(value);shownX=round?.winX||0;draw(round?(round.bonus?.plan.finalGrid||round.base.finalGrid):M.cascade(1977).initialGrid);$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');$('critterMode').textContent=round?.bonus?'DUMPSTER DASH · FINAL RESULT':'NEON BACKSTREET · 5×5';$('critterStatus').textContent=round?'STABLE RESULT RESTORED':'READY FOR CHAOS';$('critterMessage').textContent=round?`ROUND SETTLED · ${fmt(round.payout)} BANKED`:'MATCH CLUSTERS · WATCH THE RACCOONS RUN';render();}
 async function connect(){
  $('critterReconnect').hidden=true;$('critterMessage').textContent='Подключаем Critter Chaos…';
  ready=await VaultCritterBridge.connect();if(currentGame!==C.id)return;
  render();$('critterReconnect').hidden=ready;
  const messages={schema:'БД не видит функции Critter Chaos. Проверьте выполнение полного supabase_critter.txt в подключённом проекте.',permission:'Нет доступа к функциям Critter Chaos. Проверьте права authenticated из supabase_critter.txt.',version:'Версия функций Critter Chaos несовместима. Выполните актуальный supabase_critter.txt.',connection:'Не удалось проверить Critter Chaos: сервер временно недоступен. Повторим подключение при восстановлении сети.'};
  $('critterMessage').textContent=ready?'MATCH CLUSTERS · WATCH THE RACCOONS RUN':messages[VaultCritterBridge.connectionError]||messages.connection;schedule();
 }
 async function open(){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame=C.id;document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active','table-active','swamp-active','mines-active','heist-active','magnet-active');document.body.classList.add('game-mode','critter-active');root.hidden=false;VaultStorage.schedule();syncMusic();ready=VaultCritterBridge.ready;render();if(!ready)await connect();else schedule();}
 $('critterReconnect').onclick=connect;
 window.addEventListener('online',()=>{if(currentGame===C.id&&!ready)connect();});
 $('openCritterGame').onclick=open;$('critterSpin').onclick=spin;
 for(const [id,d] of [['critterMinus',-1],['critterPlus',1],['critterMax',999]])$(id).onclick=()=>{if(busy||auto)return;betIndex=d===999?BETS.length-1:Math.max(0,Math.min(BETS.length-1,betIndex+d));render();VaultStorage.schedule();};
 $('critterAuto').onclick=()=>{if(auto){auto=0;clearTimeout(timer);$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');render();return;}$('critterAutoMenu').hidden=!$('critterAutoMenu').hidden;$('critterAuto').setAttribute('aria-expanded',String(!$('critterAutoMenu').hidden));};root.querySelectorAll('[data-critter-auto]').forEach(n=>n.onclick=()=>{auto=Number(n.dataset.critterAuto);$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');spin();});
 document.addEventListener('click',e=>{if(!e.target.closest('.critter-auto-wrap')){$('critterAutoMenu').hidden=true;$('critterAuto').setAttribute('aria-expanded','false');}});
 for(const [openId,id,closeId] of [['critterSettingsOpen','critterSettings','critterSettingsClose'],['critterHelpOpen','critterHelp','critterHelpClose']]){$(openId).onclick=()=>$(id).showModal();$(closeId).onclick=()=>$(id).close();}
 $('critterSound').onclick=()=>{toggleSetting('sound');render();};$('critterFast').onclick=()=>{toggleSetting('fastGame');render();};
 $('critterPaytable').innerHTML='<div class="critter-pay-row"><b>SYMBOL · × BET</b>'+C.sizes.map(n=>'<b>'+n+'+</b>').join('')+'</div>'+C.symbols.map(s=>'<div class="critter-pay-row"><span>'+art(s.id)+s.name+'</span>'+s.pays.map(p=>'<b>'+fmt(M.round(p*C.payScale))+'×</b>').join('')+'</div>').join('')+'<p class="critter-pay-specials">'+art('wild')+' Wild заменяет обычные символы и бегает только после выигрыша. '+art('scatter')+' 3+ Scatter → Dumpster Dash.</p>';
 $('critterLogo').src=A.logo;$('critterDashRunner').src=A.wild;root.querySelector('.critter-scene').style.backgroundImage=`linear-gradient(#060b1833,#09091a55),url('${A.background}')`;
 for(const src of Object.values(A)){const img=new Image();img.src=src;img.decode?.().catch(()=>{});}
 new MutationObserver(()=>{if(currentGame!==C.id&&!root.hidden){root.hidden=true;restore(round);for(const id of ['critterHelp','critterSettings'])if($(id).open)$(id).close();document.body.classList.remove('critter-active');}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(currentGame===C.id)schedule();});
 restore(null);return {open,restore,resume(){if(currentGame===C.id&&!busy){ready=VaultCritterBridge.ready;render();schedule();}},getCheckpoint:()=>round?structuredClone(round):null,get isBusy(){return busy;},get betIndex(){return betIndex;},set betIndex(v){if(Number.isInteger(v)&&v>=0&&v<BETS.length)betIndex=v;render();},inspect:()=>({round:round?structuredClone(round):null,busy,ready,auto})};
})();
