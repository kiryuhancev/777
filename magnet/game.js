const VaultMagnet=window.VaultMagnet=(()=>{
 const C=MAGNET_CONFIG,M=MAGNET_MODEL,A=MAGNET_ASSETS,$=id=>document.getElementById(id),root=$('magnetApp'),field=$('magnetField');
 let round=null,betIndex=2,busy=false,ready=false,generation=0,timer=null,auto=0,revealed=true,previousTotal=0;
 const fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:6}),active=()=>M.active(round),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const label=id=>C.symbols.find(s=>s.id===id)?.name||{wild:'Magnet Wild',flip:'Polarity Flip',gravity:'Gravity Core',repulsor:'Repulsor',chain:'Chain Magnet',scatter:'Overload Scatter'}[id];
 const atlas=document.createElementNS('http://www.w3.org/2000/svg','svg');atlas.setAttribute('width','0');atlas.setAttribute('height','0');atlas.setAttribute('aria-hidden','true');atlas.style.position='absolute';atlas.innerHTML=`<defs><image id="magnetAtlasImage" href="${A.symbolSheet}" width="1448" height="1086"/>${Object.entries(MAGNET_ART).map(([id,[x,y,w,h]])=>`<clipPath id="magnetSpriteClip${id}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`).join('')}</defs>`;root.prepend(atlas);
 const nodes=Array.from({length:25},()=>{const el=document.createElement('div');el.className='magnet-token';field.append(el);return el;});
 function art(id){return `<svg class="magnet-symbol-art" viewBox="${MAGNET_ART[id].join(' ')}" aria-hidden="true"><use href="#magnetAtlasImage" clip-path="url(#magnetSpriteClip${id})"/></svg>`;}
 function draw(grid,{winning=[]}={}){
  const win=new Set(winning);for(let i=0;i<25;i++){const t=grid[i],n=nodes[t.uid];n.style.transform=`translate(${i%5*100}%,${Math.floor(i/5)*100}%)`;n.dataset.uid=t.uid;n.dataset.cell=i;n.dataset.symbol=t.symbol;n.dataset.polarity=t.polarity;n.className=`magnet-token ${t.polarity===1?'positive':t.polarity===-1?'negative':'neutral'}${win.has(i)?' winning':''}${i<5||i>=20?' buffer':''}`;
   const sign=t.polarity===1?'+':t.polarity===-1?'−':'○';n.setAttribute('aria-label',`${label(t.symbol)}, ${sign}, row ${Math.floor(i/5)+1}, column ${i%5+1}`);
   if(n.dataset.art!==t.symbol){n.innerHTML=art(t.symbol)+'<b class="magnet-sign"></b><small></small>';n.dataset.art=t.symbol;}
   n.querySelector('b').textContent=sign;n.querySelector('small').textContent=C.symbols.some(s=>s.id===t.symbol)?'':{wild:'WILD',flip:'FLIP',gravity:'GRAVITY',repulsor:'REPULSOR',chain:'CHAIN',scatter:'OVERLOAD'}[t.symbol];
  }
 }
 function render(){
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
 function clearFX(){root.classList.remove('field-active','reeling');$('magnetForces').replaceChildren();nodes.forEach(n=>n.classList.remove('force-source','interacting'));}
 function tone(){if(!state.sound)return;try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(140,a.currentTime);o.frequency.exponentialRampToValueAtTime(380,a.currentTime+.15);g.gain.setValueAtTime(.012,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.2);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.2);o.onended=()=>a.close();}catch{}}
 async function reveal(previous){const g=++generation,p=round.magneticPlan,fast=state.fastGame,duration=fast?C.timing.fastPhase:C.timing.phase;busy=true;render();field.style.setProperty('--magnet-motion',duration+'ms');clearFX();root.classList.add('reeling');draw(p.initialGrid);$('magnetPhaseLabel').textContent='REELS STOPPING';await sleep(fast?250:650);if(g!==generation)return;root.classList.remove('reeling');await sleep(C.timing.pause);if(g!==generation)return;
  for(const phase of p.phases){
   root.classList.add('field-active');$('magnetPhaseLabel').textContent=phase.index?'CHAIN PHASE · '+(phase.index+1):'FIELD ACTIVE · MAGNETIC PHASE';
   const lines=phase.effects.filter(e=>Number.isInteger(e.from)).map(e=>{const a=e.sourceCell,b=e.from;return `<path class="${e.kind==='gravity'?'gravity':phase.beforeGrid.find(t=>t.uid===e.target)?.polarity===-1?'negative':'positive'}" d="M${a%5*100+50},${Math.floor(a/5)*100+50} Q${b%5*100+50},${Math.floor(a/5)*100+50} ${b%5*100+50},${Math.floor(b/5)*100+50}"/>`;}).join('');$('magnetForces').innerHTML=lines;
   const highlight=()=>{for(const e of phase.effects){nodes[e.source]?.classList.add('force-source');if(nodes[e.source])nodes[e.source].dataset.effect=e.kind;if(e.target!==undefined)nodes[e.target].classList.add('interacting');if(e.kind==='flip')nodes[e.source]?.classList.add('flipping');}};
   highlight();tone();await sleep(fast?70:130);if(g!==generation)return;draw(phase.finalGrid);highlight();await sleep(duration);if(g!==generation)return;
   nodes.forEach(n=>n.classList.remove('force-source','interacting','flipping'));$('magnetForces').replaceChildren();
   if(phase.effects.some(e=>e.kind==='chain'))$('magnetPhaseLabel').textContent='FIELD RECHARGED';
  }
  clearFX();revealed=true;VaultWalletService.releasePresentation('magnet');render();const winning=p.wins.flatMap(w=>w.positions);draw(p.finalGrid,{winning});$('magnetPhaseLabel').textContent=p.winX?`${p.winX}× · FINAL GRID WIN`:'FIELD SETTLED';
  $('magnetMessage').textContent=p.winX?`${p.wins.map(w=>`${label(w.symbol)} · ${w.ways} WAYS`).join(' / ')} · ${fmt(p.winX*round.bet)}`:'No winning ways on the final grid.';
  if(p.winX)await sleep(fast?C.timing.fastWin:C.timing.win);if(g!==generation)return;
  if(!previous&&active()){$('magnetPhaseLabel').textContent='OVERDRIVE ONLINE · 5 SPINS';await sleep(650);if(g!==generation)return;}
  if(round.status==='SETTLED')$('magnetMessage').textContent=`ROUND SETTLED · ${fmt(round.payout)} BANKED`;
  busy=false;render();if(VaultStorage.inspect().conflict)VaultSync.flush();schedule();
 }
 function spin(){if(!ready||busy||!VaultRoundService.canPlay(C.id))return;clearTimeout(timer);const previous=active()?round:null,next=previous?M.advance(previous):M.start({seed:crypto.getRandomValues(new Uint32Array(1))[0],bet:BETS[betIndex],roundId:crypto.randomUUID()});
  VaultWalletService.holdPresentation('magnet',{stake:previous?0:next.bet});
  if(!VaultMagnetBridge.commit(next)){VaultWalletService.releasePresentation('magnet');auto=0;render();$('magnetMessage').textContent='Progress is being restored. Try again shortly.';return;}previousTotal=previous?.totalWinX||0;revealed=false;round=next;if(!previous&&auto>0)auto--;reveal(previous);
 }
 function restore(value){generation++;busy=false;auto=0;revealed=true;previousTotal=0;clearTimeout(timer);clearFX();if(window.VaultWalletService)VaultWalletService.releasePresentation('magnet');round=M.validate(value);$('magnetAutoMenu').hidden=true;draw(round?.magneticPlan.finalGrid||M.plan(1977).initialGrid);render();$('magnetPhaseLabel').textContent=round?'STABLE FIELD RESTORED':'READY';$('magnetMessage').textContent=active()?'OVERDRIVE SAVED · remaining spins restored':round?`ROUND SETTLED · ${fmt(round.payout)} BANKED`:'The reels stop. The field starts.';}
 async function open(){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame=C.id;document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active','table-active','swamp-active','mines-active','heist-active');document.body.classList.add('game-mode','magnet-active');root.hidden=false;VaultStorage.schedule();syncMusic();ready=VaultMagnetBridge.ready;render();if(!ready){$('magnetMessage').textContent='Connecting to the reactor…';ready=await VaultMagnetBridge.connect();if(currentGame!==C.id)return;render();$('magnetMessage').textContent=ready?(active()?'OVERDRIVE SAVED · remaining spins restored':'The reels stop. The field starts.'):'MAGNET: выполните supabase_magnet.txt для подключения кошелька.';}schedule();}
 $('openMagnetGame').onclick=open;$('magnetSpin').onclick=spin;
 for(const [id,d] of [['magnetMinus',-1],['magnetPlus',1],['magnetMax',999]])$(id).onclick=()=>{if(busy||active()||auto)return;betIndex=d===999?BETS.length-1:Math.max(0,Math.min(BETS.length-1,betIndex+d));render();VaultStorage.schedule();};
 $('magnetAuto').onclick=()=>{if(auto){auto=0;clearTimeout(timer);$('magnetAutoMenu').hidden=true;render();schedule();return;}$('magnetAutoMenu').hidden=!$('magnetAutoMenu').hidden;$('magnetAuto').setAttribute('aria-expanded',String(!$('magnetAutoMenu').hidden));};
 root.querySelectorAll('[data-magnet-auto]').forEach(b=>b.onclick=()=>{auto=Number(b.dataset.magnetAuto);$('magnetAutoMenu').hidden=true;$('magnetAuto').setAttribute('aria-expanded','false');spin();});
 document.addEventListener('click',e=>{if(!e.target.closest('.magnet-auto-wrap')){$('magnetAutoMenu').hidden=true;$('magnetAuto').setAttribute('aria-expanded','false');}});
 for(const [openId,dialog,closeId] of [['magnetSettingsOpen','magnetSettings','magnetSettingsClose'],['magnetHelpOpen','magnetHelp','magnetHelpClose']]){$(openId).onclick=()=>$(dialog).showModal();$(closeId).onclick=()=>$(dialog).close();}
 $('magnetSound').onclick=()=>{toggleSetting('sound');render();};$('magnetFast').onclick=()=>{toggleSetting('fastGame');render();};
 $('magnetPaytable').innerHTML='<div><b>SYMBOL</b><b>3</b><b>4</b><b>5</b></div>'+C.symbols.map(s=>`<div><span>${art(s.id)}${s.name}</span>${s.pays.map(p=>`<b>${M.round(p*C.waysPayScale)}×</b>`).join('')}</div>`).join('');
 root.querySelector('.magnet-scene').style.backgroundImage=`linear-gradient(#03090f22,#03090f55),url('${A.environment}')`;
 for(const src of new Set(Object.values(A))){const image=new Image();image.src=src;image.decode?.().catch(()=>{});}
 new MutationObserver(()=>{if(currentGame!==C.id&&!root.hidden){root.hidden=true;restore(round);for(const id of ['magnetHelp','magnetSettings'])if($(id).open)$(id).close();document.body.classList.remove('magnet-active');}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else if(currentGame===C.id)schedule();});
 restore(null);return {open,restore,resume(){if(currentGame===C.id&&!busy){ready=VaultMagnetBridge.ready;render();schedule();}},getCheckpoint:()=>round?structuredClone(round):null,get isBusy(){return busy;},get betIndex(){return betIndex;},set betIndex(v){if(Number.isInteger(v)&&v>=0&&v<BETS.length)betIndex=v;render();},inspect:()=>({round:round?structuredClone(round):null,busy,ready,auto})};
})();
