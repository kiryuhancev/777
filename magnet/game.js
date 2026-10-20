const VaultMagnet=window.VaultMagnet=(()=>{
 const C=MAGNET_CONFIG,M=MAGNET_MODEL,V=MAGNET_V2_MODEL,D=MAGNET_ROUNDS,A=MAGNET_ASSETS,$=id=>document.getElementById(id),root=$('magnetApp'),field=$('magnetField');
 let round=null,betIndex=2,busy=false,ready=false,generation=0,timer=null,auto=0,revealed=true,previousTotal=0,previousBonus=null;
 const fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:6}),active=()=>D.active(round),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const label=id=>C.symbols.find(s=>s.id===id)?.name||{wild:'Magnet Wild',flip:'Polarity Flip',gravity:'Gravity Core',repulsor:'Repulsor',chain:'Chain Magnet',scatter:'Overload Scatter'}[id];
 const atlas=document.createElementNS('http://www.w3.org/2000/svg','svg');atlas.setAttribute('width','0');atlas.setAttribute('height','0');atlas.setAttribute('aria-hidden','true');atlas.style.position='absolute';atlas.innerHTML=`<defs><image id="magnetAtlasImage" href="${A.symbolSheet}" width="1448" height="1086"/>${Object.entries(MAGNET_ART).map(([id,[x,y,w,h]])=>`<clipPath id="magnetSpriteClip${id}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`).join('')}</defs>`;root.prepend(atlas);
 const nodes=Array.from({length:25},()=>{const el=document.createElement('div');el.className='magnet-token';field.append(el);return el;});
 function art(id){if(id==='wheel'||id==='scatter'&&round?.version!==1)return `<img class="magnet-symbol-art magnet-new-special" src="${id==='wheel'?A.wheel:A.scatterV2}" alt="">`;
  if(['value','charge','magnet','super','empty','overload'].includes(id))return id==='empty'?'<span class="magnet-empty">·</span>':art({value:'crystal',charge:'gravity',magnet:'wild',super:'wild',overload:'gravity'}[id]);
  return `<svg class="magnet-symbol-art" viewBox="${MAGNET_ART[id].join(' ')}" aria-hidden="true"><use href="#magnetAtlasImage" clip-path="url(#magnetSpriteClip${id})"/></svg>`;}
 function draw(grid,{winning=[]}={}){
  const win=new Set(winning);for(let i=0;i<25;i++){const t=grid[i],n=nodes[t.uid];n.style.transform=`translate(${i%5*100}%,${Math.floor(i/5)*100}%)`;n.dataset.uid=t.uid;n.dataset.cell=i;n.dataset.symbol=t.symbol;n.dataset.polarity=t.polarity;n.className=`magnet-token ${t.polarity===1?'positive':t.polarity===-1?'negative':'neutral'}${win.has(i)?' winning':''}${i<5||i>=20?' buffer':''}`;
   const sign=t.polarity===1?'+':t.polarity===-1?'−':'○';n.setAttribute('aria-label',`${label(t.symbol)||t.symbol}${t.valueX?' '+t.valueX+'×':''}, ${sign}, row ${Math.floor(i/5)+1}, column ${i%5+1}`);
   const artKey=t.symbol+':'+(round?.version||2);if(n.dataset.art!==artKey){n.innerHTML=art(t.symbol)+'<b class="magnet-sign"></b><small></small><span class="magnet-effect-label"></span>';n.dataset.art=artKey;}
   n.querySelector('b').textContent=t.symbol==='value'?t.valueX+'×':sign;n.querySelector('small').textContent=C.symbols.some(s=>s.id===t.symbol)||t.symbol==='empty'?'':{wild:'WILD',flip:'FLIP',gravity:'GRAVITY',repulsor:'REPULSOR',chain:'CHAIN',scatter:'SCATTER',wheel:'WHEEL',value:'VALUE',charge:'CHARGE',magnet:'MAGNET',super:'SUPER MAGNET',overload:'OVERLOAD'}[t.symbol];
  }
 }
 function renderModern(){
  const chamber=round?.version===2&&!!round?.bonus.triggered&&(active()||busy&&round.step>0),b=!revealed&&previousBonus?previousBonus:round?.bonus,p=round?.magneticPlan;
  root.classList.remove('overdrive');$('magnetMode').textContent=chamber?'MAGNET CHAMBER BONUS':'MAGNET · 243 WAYS';$('magnetPower').textContent=chamber?'×'+b.power:'—';
  $('magnetCounterLabel').textContent=chamber?'BONUS SPINS':'GRID';$('magnetCounter').textContent=chamber?b.remaining+' REMAIN':'5 × 5';$('magnetPowerTrack').hidden=true;
  $('magnetChamberHud').hidden=!chamber;$('magnetCollected').textContent=fmt(b?.collectedX||0)+'×';$('magnetCharge').textContent=(b?.charge||0)+' / 9';$('magnetMultiplier').textContent='×'+(b?.power||1);
  $('magnetBalance').textContent=window.VaultWalletService?VaultWalletService.formatBalance():'—';$('magnetBet').textContent=fmt(active()?round.bet:BETS[betIndex]);
  $('magnetWin').textContent=fmt(revealed?(round?.status==='SETTLED'?round.payout:(p?.winX||0)*(round?.bet||BETS[betIndex])):0);
  $('magnetTotal').textContent=fmt((revealed?round?.totalWinX||0:previousTotal)*(round?.bet||BETS[betIndex]));
  for(const id of ['magnetMinus','magnetPlus','magnetMax'])$(id).disabled=busy||active()||!!auto;
  $('magnetSpin').disabled=busy||!ready||!window.VaultMagnetBridge?.featuresReady||(!active()&&BETS[betIndex]>state.balance)||!!auto&&!active();$('magnetSpin').textContent=busy?'…':active()?'CHAMBER':'SPIN';
  $('magnetAuto').disabled=!ready||!window.VaultMagnetBridge?.featuresReady||busy&&!auto;$('magnetAuto').textContent=auto?`STOP ${auto===-1?'∞':auto}`:'AUTO';
  $('magnetPrice').textContent=active()?'CHAMBER · NO NEW BET':'243 WAYS · '+fmt(BETS[betIndex])+' PER ROUND';
  $('magnetSound').textContent=state.sound?'SOUND ON':'SOUND OFF';$('magnetFast').textContent=state.fastGame?'FAST ON':'FAST OFF';
  $('magnetDebug').hidden=!MAGNET_DEBUG;if(MAGNET_DEBUG)$('magnetDebug').textContent=JSON.stringify(round,null,2);
 }
 function render(){
  const modern=round?.version!==1||!active()&&!busy;root.classList.toggle('magnet-v2',modern);root.classList.toggle('chamber-mode',round?.version===2&&(active()||busy&&round.step>0));
  if(modern){renderModern();return;}
  const p=round?.magneticPlan,over=active()&&(revealed||round.step>0)||busy&&!revealed&&p?.bonus,power=over?C.overdrive.fieldPower[round.step]||p?.fieldPower||1:p?.fieldPower||1;
  root.classList.toggle('overdrive',over);root.dataset.status=round?.status||'IDLE';
  $('magnetMode').textContent=over?'OVERDRIVE MODE':'REACTOR STABLE';$('magnetPower').textContent=`×${power}`;
  $('magnetCounterLabel').textContent=over?'OVERDRIVE SPINS':'GRID';$('magnetCounter').textContent=over?`${round.bonus.remaining} REMAIN`:'5 × 5';
  $('magnetPowerTrack').hidden=!over;$('magnetPowerTrack').innerHTML=C.overdrive.fieldPower.map((n,i)=>`<span class="${i===round?.step?'current':i<(round?.step||0)?'done':''}"><small>${i+1}</small>×${n}</span>`).join('');
  $('magnetBet').textContent=fmt(active()?round.bet:BETS[betIndex]);$('magnetWin').textContent=fmt((revealed?p?.winX||0:0)*(round?.bet||BETS[betIndex]));$('magnetTotal').textContent=fmt((revealed?round?.totalWinX||0:previousTotal)*(round?.bet||BETS[betIndex]));
  for(const id of ['magnetMinus','magnetPlus','magnetMax'])$(id).disabled=busy||over||!!auto;
  $('magnetSpin').disabled=busy||!ready||(!over&&BETS[betIndex]>state.balance)||!!auto&&!over;$('magnetSpin').textContent=busy?'…':over?'OVERDRIVE':'SPIN';
  $('magnetAuto').disabled=!ready||busy&&!auto;$('magnetAuto').textContent=auto?`STOP ${auto===-1?'∞':auto}`:'AUTO';
  $('magnetPrice').textContent=over?'OVERDRIVE · NO NEW BET':`243 WAYS · ${fmt(BETS[betIndex])} PER ROUND`;
  $('magnetSound').textContent=state.sound?'SOUND ON':'SOUND OFF';$('magnetFast').textContent=state.fastGame?'FAST ON':'FAST OFF';
  $('magnetDebug').hidden=!MAGNET_DEBUG;if(MAGNET_DEBUG)$('magnetDebug').textContent=JSON.stringify(round,null,2);
 }
 function schedule(){clearTimeout(timer);if(currentGame===C.id&&!document.hidden&&!busy&&(active()||auto))timer=setTimeout(spin,C.timing.next);}
 const effectsInFlight=new Map(),fxClasses=['potential-target','force-source','interacting','moved','flipping'];
 function clearFX(){effectsInFlight.clear();root.classList.remove('field-active','reeling','chain-active');delete root.dataset.force;delete root.dataset.effect;delete field.dataset.playback;$('magnetForces').replaceChildren();$('magnetFeatureOverlay').hidden=true;$('magnetChamberHud').classList.remove('charged');field.querySelectorAll('.magnet-ghost,.magnet-value-flight').forEach(n=>n.remove());nodes.forEach(n=>{n.classList.remove(...fxClasses,'feature-target');delete n.dataset.effect;const caption=n.querySelector('.magnet-effect-label');if(caption)caption.textContent='';});}
 const effectName=e=>({attract:'ATTRACT',wild:'ATTRACT',repel:'REPEL',repulsor:'REPEL',gravity:'GRAVITY',flip:'POLARITY FLIP',chain:'FIELD RECHARGED'}[e.kind]);
 function focusEffects(){
  nodes.forEach(n=>{n.classList.remove(...fxClasses);delete n.dataset.effect;n.querySelector('.magnet-effect-label').textContent='';});
  for(const {e,stage} of effectsInFlight.values()){
   const source=nodes[e.source];source.classList.add('force-source');source.dataset.effect=e.kind;
   source.querySelector('.magnet-effect-label').textContent=C.symbols.some(s=>s.id===source.dataset.symbol)?'SOURCE':label(source.dataset.symbol);
   const targets=e.changes?.map(c=>c.uid)??(e.target===undefined?[]:[e.target,e.swap]);
   for(const uid of targets){nodes[uid].classList.add(stage==='source'?'potential-target':stage==='settle'?'moved':'interacting');if(e.kind==='flip'&&stage==='move')nodes[uid].classList.add('flipping');}
  }
 }
 function connection(e,key,polarity){
  const a=e.sourceCell,b=e.from,x=i=>i%5*100+50,y=i=>Math.floor(i/5)*100+50;
  const color=e.kind==='gravity'?'#f7ad45':polarity===-1?'#ff5355':'#40e9ff';
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.event=key;group.dataset.kind=e.kind;
  if(Number.isInteger(b)){
   const dx=x(e.to)-x(b),dy=y(e.to)-y(b),endX=x(e.to)-dx*.22,endY=y(e.to)-dy*.22;
   group.innerHTML=`<path class="magnet-link ${e.kind==='gravity'?'gravity':polarity===-1?'negative':'positive'}" d="M${x(a)},${y(a)} Q${x(b)},${y(a)} ${x(b)},${y(b)}"/><path class="magnet-arrow" style="stroke:${color}" d="M${x(b)},${y(b)} L${endX},${endY} m${-dx*.14-dy*.12},${-dy*.14+dx*.12} L${endX},${endY} l${-dx*.14+dy*.12},${-dy*.14-dx*.12}"/><path class="magnet-swap-arrow" d="M${x(e.to)},${y(e.to)+15} L${x(b)},${y(b)+15}"/><circle class="magnet-energy" r="4" fill="${color}"><animateMotion dur=".3s" repeatCount="indefinite" path="M${x(a)},${y(a)} Q${x(b)},${y(a)} ${x(b)},${y(b)}"/></circle>`;
  }
  $('magnetForces').append(group);return group;
 }
 // Presentation-only replay. Consume recorded swaps/sign changes, never resolve forces or draw RNG.
 async function playPhase(phase,g,fast,phaseCount){
  const grid=structuredClone(phase.beforeGrid),count=phase.effects.length;
  const duration=fast?170:300,budget=(fast?1400:2400)/phaseCount;
  const gap=count>1?Math.min(duration+90,Math.max(22,(budget-duration)/(count-1))):0;
  field.style.setProperty('--magnet-motion',(fast?75:130)+'ms');
  await Promise.all(phase.effects.map(async(e,index)=>{
   await sleep(index*gap);if(g!==generation)return;
   const key=`${phase.index}-${index}`,source=grid.find(t=>t.uid===e.source),entry={e,stage:'source'};
   effectsInFlight.set(key,entry);root.dataset.effect=e.kind;root.dataset.force=source.polarity===-1?'negative':source.polarity===1?'positive':'core';field.dataset.playback=key;
   $('magnetPhaseLabel').textContent=effectName(e);focusEffects();
   if(MAGNET_DEBUG)$('magnetDebug').textContent=JSON.stringify({phase:phase.index+1,effect:e.kind,sourceCell:e.sourceCell,targetCell:e.from??e.changes?.map(c=>c.cell),destination:e.to??null},null,2);
   await sleep(duration*.2);if(g!==generation)return;entry.stage='target';focusEffects();const line=connection(e,key,source.polarity);
   await sleep(duration*.2);if(g!==generation)return;
   const ghosts=[];
   if(Number.isInteger(e.from)){
    for(const cell of [e.from,e.to]){const ghost=document.createElement('div');ghost.className='magnet-ghost';ghost.style.left=`${cell%5*20}%`;ghost.style.top=`${Math.floor(cell/5)*20}%`;ghost.innerHTML=art(grid[cell].symbol);field.append(ghost);ghosts.push(ghost);}
    [grid[e.from],grid[e.to]]=[grid[e.to],grid[e.from]];
   }
   if(e.kind==='flip')for(const c of e.changes)grid.find(t=>t.uid===c.uid).polarity=c.to;
   draw(grid);entry.stage='move';focusEffects();tone();
   await sleep(duration*.45);if(g!==generation)return;entry.stage='settle';focusEffects();line.remove();
   await sleep(duration*.15);if(g!==generation)return;ghosts.forEach(n=>n.remove());effectsInFlight.delete(key);focusEffects();
  }));
  if(g!==generation)return;
  // A render assertion guards presentation drift without touching the precomputed business checkpoint.
  if(JSON.stringify(grid)!==JSON.stringify(phase.finalGrid))throw Error('MAGNET presentation replay mismatch');
  draw(phase.finalGrid);delete field.dataset.playback;
 }
 function tone(){if(!state.sound)return;try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(140,a.currentTime);o.frequency.exponentialRampToValueAtTime(380,a.currentTime+.15);g.gain.setValueAtTime(.012,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.2);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.2);o.onended=()=>a.close();}catch{}}
 async function reveal(previous){const g=++generation,p=round.magneticPlan,fast=state.fastGame;busy=true;render();clearFX();draw(p.initialGrid);$('magnetPhaseLabel').textContent='REELS STOPPING';$('magnetMessage').textContent='SOURCE → TARGET → MOVE → FINAL GRID';await VaultSymbolDrop.play(C.id,{root:field,cells:p.initialGrid.map((t,i)=>({node:nodes[t.uid],column:i%5,row:Math.floor(i/5),symbol:t.symbol})),rows:5,roundId:round.roundId,hasWin:p.winX>0,speedProfile:fast?'quick':'normal'});if(g!==generation)return;
  for(const phase of p.phases){
   root.classList.add('field-active');$('magnetPhaseLabel').textContent=phase.index?'CHAIN PHASE · '+(phase.index+1):'FIELD ACTIVE · MAGNETIC PHASE';
   if(phase.index){root.classList.add('chain-active');$('magnetPhaseLabel').textContent='CHAIN PHASE '+(phase.index+1);await sleep(fast?80:140);if(g!==generation)return;root.classList.remove('chain-active');}
   await playPhase(phase,g,fast,p.phases.length);if(g!==generation)return;
  }
  clearFX();revealed=true;VaultWalletService.releasePresentation('magnet');render();const winning=p.wins.flatMap(w=>w.positions);draw(p.finalGrid,{winning});$('magnetPhaseLabel').textContent=p.winX?`${p.winX}× · FINAL GRID WIN`:'FIELD SETTLED';
  const winSummary=p.wins.map(w=>`${label(w.symbol)} · ${w.length} COLS · ${w.ways} WAYS`).join(' / ');
  $('magnetMessage').textContent=p.winX?`${winSummary} · ${fmt(p.winX*round.bet)}`:'No winning ways on the final grid.';
  if(p.winX)await sleep(fast?C.timing.fastWin:C.timing.win);if(g!==generation)return;
  if(!previous&&active()){$('magnetPhaseLabel').textContent='OVERDRIVE ONLINE · 5 SPINS';await sleep(650);if(g!==generation)return;}
  if(round.status==='SETTLED')$('magnetMessage').textContent=`ROUND SETTLED · ${fmt(round.payout)} BANKED${p.winX?' · '+winSummary:''}`;
  busy=false;render();if(VaultStorage.inspect().conflict)VaultSync.flush();schedule();
 }
 async function revealModern(previous){
  const g=++generation,p=round.magneticPlan,fast=state.fastGame;busy=true;render();clearFX();draw(p.initialGrid);$('magnetPhaseLabel').textContent=p.bonus?'CHAMBER SPIN':'REELS STOPPING';$('magnetMessage').textContent=p.bonus?'COLLECT VALUES · BUILD REACTOR CHARGE':'WHEEL = FEATURE · 3 SCATTERS = CHAMBER';
  await VaultSymbolDrop.play(C.id,{root:field,cells:p.initialGrid.map((t,i)=>({node:nodes[t.uid],column:i%5,row:Math.floor(i/5),symbol:t.symbol})),rows:5,roundId:round.roundId,hasWin:p.winX>0,feature:!!p.bonus||!!p.wheel,speedProfile:fast?'quick':'normal'});if(g!==generation)return;
  if(p.wheel){
   for(const n of nodes.filter(n=>n.dataset.symbol==='wheel'))n.classList.add('feature-landing');await sleep(fast?120:320);if(g!==generation)return;
   const overlay=$('magnetFeatureOverlay');overlay.hidden=false;overlay.dataset.mode='wheel';$('magnetFeatureTitle').textContent='MAGNET WHEEL';$('magnetFeatureResult').textContent='ONE SECTOR · ONE EFFECT';
   const disc=$('magnetWheelDisc');disc.style.transition='none';disc.style.transform='rotate(0deg)';void disc.offsetWidth;disc.style.transition=`transform ${fast?.7:1.6}s cubic-bezier(.12,.65,.14,1)`;disc.style.transform=`rotate(${2160-p.wheel.sector*60}deg)`;
   await sleep(fast?750:1650);if(g!==generation)return;$('magnetFeatureTitle').textContent=p.wheel.title;$('magnetFeatureResult').textContent=p.wheel.description;await sleep(fast?450:850);if(g!==generation)return;overlay.hidden=true;
   draw(p.finalGrid);if(p.wheel.id==='respin'){await VaultSymbolDrop.play(C.id,{root:field,cells:p.finalGrid.map((t,i)=>({node:nodes[t.uid],column:i%5,row:Math.floor(i/5),symbol:t.symbol})),rows:5,roundId:round.roundId,phase:'respin',hasWin:p.winX>0,speedProfile:fast?'quick':'normal'});if(g!==generation)return;}for(const c of p.wheel.changes)nodes[p.finalGrid[c.cell].uid].classList.add('feature-target');for(const s of p.wheel.swaps||[])nodes[p.finalGrid[s.to].uid].classList.add('feature-target');
   $('magnetMessage').textContent=p.wheel.title+' · '+p.wheel.description;await sleep(fast?250:600);if(g!==generation)return;root.classList.remove('reeling');
  }
  if(p.bonus){const visual=structuredClone(p.initialGrid);
   for(const e of p.events){
    if(e.kind==='double'){$('magnetPhaseLabel').textContent='POLARITY FLIP · VISIBLE VALUES ×2';for(const t of visual)if(t.symbol==='value')t.valueX=Math.min(10000,t.valueX*2**e.sources.length);draw(visual);for(const n of nodes.filter(n=>n.dataset.symbol==='value'))n.classList.add('feature-target');}
    if(e.kind==='charge'){$('magnetPhaseLabel').textContent='REACTOR CHARGED · ×'+e.power+(e.extension?' · +1 SPIN':'');$('magnetChamberHud').classList.add('charged');}
    if(e.kind==='collect'||e.kind==='sweep'){
     $('magnetPhaseLabel').textContent=e.kind==='sweep'?'FINAL MAGNET SWEEP':e.super?'SUPER MAGNET · COLLECT ALL':'MAGNET · NEARBY VALUES';
     $('magnetForces').innerHTML=e.targets.map(i=>`<path class="gravity" d="M${i%5*100+50},${Math.floor(i/5)*100+50} Q250,250 250,0"/>`).join('');for(const i of e.targets){nodes[i].classList.add('feature-target');const fly=document.createElement('span');fly.className='magnet-value-flight';fly.textContent=visual[i].valueX+'×';fly.style.left=(i%5*20+10)+'%';fly.style.top=(Math.floor(i/5)*20+10)+'%';fly.style.setProperty('--fly-x',((50-(i%5*20+10))/100*field.clientWidth)+'px');fly.style.setProperty('--fly-y',(-(Math.floor(i/5)*20+10)/100*field.clientHeight)+'px');field.append(fly);}
    }
    await sleep(fast?150:320);if(g!==generation)return;$('magnetForces').replaceChildren();field.querySelectorAll('.magnet-value-flight').forEach(n=>n.remove());if(e.targets){for(const i of e.targets)visual[i]={uid:i,symbol:'empty',polarity:0};draw(visual);}
   }
   draw(p.finalGrid);$('magnetChamberHud').classList.remove('charged');
  }
  clearFX();revealed=true;VaultWalletService.releasePresentation('magnet');render();draw(p.finalGrid,{winning:p.wins.flatMap(w=>w.positions)});
  $('magnetPhaseLabel').textContent=p.winX?'FINAL GRID WIN · '+fmt(p.winX)+'×':p.bonus?'CHAMBER CHARGED':'FIELD SETTLED';
  $('magnetMessage').textContent=p.winX?p.wins.map(w=>label(w.symbol)+' · '+w.length+' COLS · '+w.ways+' WAYS').join(' / '):p.bonus?`COLLECTED ${fmt(round.bonus.collectedX)}× · REACTOR ×${round.bonus.power}`:'No winning ways on the final grid.';
  if(!previous&&active()){
   $('magnetFeatureOverlay').hidden=false;$('magnetFeatureOverlay').dataset.mode='intro';$('magnetFeatureTitle').textContent='MAGNET CHAMBER BONUS';$('magnetFeatureResult').textContent='6 FREE SPINS · COLLECT VALUES · CHARGE ×1 → ×2 → ×5 → ×10';await sleep(fast?600:1300);if(g!==generation)return;$('magnetFeatureOverlay').hidden=true;
  }
  if(round.status==='SETTLED'&&round.bonus.triggered){
   $('magnetFeatureOverlay').hidden=false;$('magnetFeatureOverlay').dataset.mode='summary';$('magnetFeatureTitle').textContent='TOTAL BONUS WIN';$('magnetFeatureResult').textContent=`${fmt(round.bonus.collectedX)}× × ${round.bonus.power} = ${fmt(Math.min(Math.max(0,V.config.maxWinX-round.spins[0].winX),round.bonus.collectedX*round.bonus.power))}× · ${fmt(round.payout)} TOTAL BANKED`;await sleep(fast?800:1600);if(g!==generation)return;$('magnetFeatureOverlay').hidden=true;$('magnetPhaseLabel').textContent='BONUS SETTLED';$('magnetMessage').textContent=$('magnetFeatureResult').textContent;
  }else if(p.winX){await sleep(fast?400:750);if(g!==generation)return;}
  busy=false;render();schedule();
 }
 function spin(){if(!ready||busy||!VaultRoundService.canPlay(C.id)||!active()&&!window.VaultMagnetBridge?.featuresReady)return;clearTimeout(timer);const previous=active()?round:null,next=previous?(previous.version===2?V:M).advance(previous):V.start({seed:crypto.getRandomValues(new Uint32Array(1))[0],bet:BETS[betIndex],roundId:crypto.randomUUID()});
  VaultWalletService.holdPresentation('magnet',{stake:previous?0:next.bet});
  if(!VaultMagnetBridge.commit(next)){VaultWalletService.releasePresentation('magnet');auto=0;render();$('magnetMessage').textContent='Progress is being restored. Try again shortly.';return;}previousTotal=previous?.totalWinX||0;previousBonus=previous?.bonus||null;revealed=false;round=next;if(!previous&&auto>0)auto--;if(next.version===2)revealModern(previous);else reveal(previous);
 }
 function restore(value){generation++;busy=false;auto=0;revealed=true;previousTotal=0;clearTimeout(timer);clearFX();if(window.VaultWalletService)VaultWalletService.releasePresentation('magnet');round=D.validate(value);$('magnetAutoMenu').hidden=true;draw(round?.magneticPlan.finalGrid||V.basePlan(1977).initialGrid);render();$('magnetPhaseLabel').textContent=round?'STABLE FIELD RESTORED':'READY';$('magnetMessage').textContent=active()?(round.version===2?'CHAMBER SAVED':'OVERDRIVE SAVED')+' · remaining spins restored':round?`ROUND SETTLED · ${fmt(round.payout)} BANKED`:'WHEEL · 3 SCATTERS → MAGNET CHAMBER';}
 async function open(){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame=C.id;document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active','table-active','swamp-active','mines-active','heist-active');document.body.classList.add('game-mode','magnet-active');root.hidden=false;VaultStorage.schedule();syncMusic();ready=VaultMagnetBridge.ready;render();if(!ready){$('magnetMessage').textContent='Connecting to the reactor…';ready=await VaultMagnetBridge.connect();if(currentGame!==C.id)return;render();$('magnetMessage').textContent=ready?(active()?(round.version===2?'CHAMBER SAVED · remaining spins restored':'OVERDRIVE SAVED · remaining spins restored'):'WHEEL · 3 SCATTERS → MAGNET CHAMBER'):'MAGNET: выполните supabase_magnet.txt для подключения кошелька.';}if(!VaultMagnetBridge.featuresReady&&!(round?.version===1&&active()))$('magnetMessage').textContent='MAGNET v2: выполните supabase_magnet_v2.txt, затем F5.';schedule();}
 $('openMagnetGame').onclick=open;$('magnetSpin').onclick=spin;
 for(const [id,d] of [['magnetMinus',-1],['magnetPlus',1],['magnetMax',999]])$(id).onclick=()=>{if(busy||active()||auto)return;betIndex=d===999?BETS.length-1:Math.max(0,Math.min(BETS.length-1,betIndex+d));render();VaultStorage.schedule();};
 $('magnetAuto').onclick=()=>{if(auto){auto=0;clearTimeout(timer);$('magnetAutoMenu').hidden=true;render();schedule();return;}$('magnetAutoMenu').hidden=!$('magnetAutoMenu').hidden;$('magnetAuto').setAttribute('aria-expanded',String(!$('magnetAutoMenu').hidden));};
 root.querySelectorAll('[data-magnet-auto]').forEach(b=>b.onclick=()=>{auto=Number(b.dataset.magnetAuto);$('magnetAutoMenu').hidden=true;$('magnetAuto').setAttribute('aria-expanded','false');spin();});
 document.addEventListener('click',e=>{if(!e.target.closest('.magnet-auto-wrap')){$('magnetAutoMenu').hidden=true;$('magnetAuto').setAttribute('aria-expanded','false');}});
 for(const [openId,dialog,closeId] of [['magnetSettingsOpen','magnetSettings','magnetSettingsClose'],['magnetHelpOpen','magnetHelp','magnetHelpClose']]){$(openId).onclick=()=>$(dialog).showModal();$(closeId).onclick=()=>$(dialog).close();}
 $('magnetSound').onclick=()=>{toggleSetting('sound');render();};$('magnetFast').onclick=()=>{toggleSetting('fastGame');render();};
 root.querySelector('.magnet-wheel-hub').innerHTML=`<img src="${A.wheel}" alt="">`;root.querySelector('.magnet-bonus-core').innerHTML=art('gravity');$('magnetCharge').insertAdjacentHTML('beforebegin',art('gravity'));
 $('magnetModernManual').innerHTML=`<h3>Обычный спин → результат</h3><p>Поле 5×5. Платят три средние строки: 243 ways. Совпадения нужны в 3–5 соседних колонках от левой, на любых из трёх средних строк. Wild заменяет обычные символы. Верхняя и нижняя строки — буферы; Scatter учитываются во всех 25 позициях. В новой основной игре нет постоянных магнитных фаз.</p><h3>WHEEL: один символ в центре → один эффект</h3><p>Колесо выбирает: ×2/×3 к выигрышу основного спина; Copper → Energy; 2 Wild; перенос премиальных символов из буферов; один бесплатный респин обычных символов; превращение 4 символов в Plasma/Crystal. Результат и позиции рассчитаны до анимации. Pull без подходящих премиальных фишек не меняет поле. Scatter сохраняются. Новое колесо из респина не появляется.</p><h3>3+ SCATTER → MAGNET CHAMBER BONUS</h3><p>6 бесплатных спинов. Значения 2×, 5×, 10×, 15×, 25×, 50× удерживаются до сбора. MAGNET собирает значения в радиусе 2 клеток по горизонтали/вертикали; SUPER MAGNET — все. Одна фишка собирается только раз. FLIP удваивает видимые значения; несколько Flip применяются последовательно. Значение ограничено 10 000×.</p><p>CHARGE даёт 1 заряд, OVERLOAD — 2. Наличие зарядки добавляет один спин, максимум 12 спинов за бонус. Реактор: 0/2/5/9 зарядов → ×1/×2/×5/×10.</p><p>В конце FINAL MAGNET SWEEP собирает оставшиеся значения. <b>Bonus win = collected values × final multiplier × bet.</b> Выигрыш основного спина прибавляется отдельно, Wheel Boost на бонус не действует. Общий лимит раунда 10 000× ставки.</p><p>Одна ставка за весь раунд. Выплата/статистика — один раз после завершения. F5 восстанавливает стабильную точку без повторного колеса, ставки или сбора. Старый заработанный Overdrive завершается по старым правилам. Демонстрационные кредиты, RNG в браузере.</p><h3>За один путь · × ставки · 3 / 4 / 5 колонок</h3>`+C.symbols.map(s=>`<p>${s.name}: ${s.pays.map(p=>fmt(M.round(p*V.config.waysPayScale))+'×').join(' / ')}</p>`).join('');
 $('magnetPaytable').innerHTML='<div><b>SYMBOL</b><b>3</b><b>4</b><b>5</b></div>'+C.symbols.map(s=>`<div><span>${art(s.id)}${s.name}</span>${s.pays.map(p=>`<b>${M.round(p*C.waysPayScale)}×</b>`).join('')}</div>`).join('');
 $('magnetSpecialHelp').innerHTML=Object.entries({wild:'Заменяет обычные символы при выплате. Если заряжен — притягивает противоположный знак.',flip:'Меняет + ↔ − рядом с собой. Значок и цвет меняются после импульса.',gravity:'Золотые кольца стягивают обычные фишки к ядру независимо от знака.',repulsor:'Расходящаяся волна выталкивает обычные фишки наружу.',chain:'Перезаряжает поле: перед дополнительной фазой показывается CHAIN PHASE.',scatter:'Overload: три и более Scatter запускают 5 спинов Overdrive.'}).map(([id,description])=>`<div>${art(id)}<span><b>${label(id)}</b>${description}</span></div>`).join('');
 root.querySelector('.magnet-scene').style.backgroundImage=`linear-gradient(#03090f22,#03090f55),url('${A.environment}')`;
 for(const src of new Set(Object.values(A))){const image=new Image();image.src=src;image.decode?.().catch(()=>{});}
 new MutationObserver(()=>{if(currentGame!==C.id&&!root.hidden){root.hidden=true;restore(round);for(const id of ['magnetHelp','magnetSettings'])if($(id).open)$(id).close();document.body.classList.remove('magnet-active');}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(currentGame===C.id)schedule();});
 restore(null);return {open,restore,resume(){if(currentGame===C.id&&!busy){ready=VaultMagnetBridge.ready;render();schedule();}},getCheckpoint:()=>round?structuredClone(round):null,get isBusy(){return busy;},get betIndex(){return betIndex;},set betIndex(v){if(Number.isInteger(v)&&v>=0&&v<BETS.length)betIndex=v;render();},inspect:()=>({round:round?structuredClone(round):null,busy,ready,auto})};
})();
