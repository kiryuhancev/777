/* Presentation only. Uses approved art and existing stored results; no RNG, payout or wallet writes. */
const CurtainOverlay=window.VaultBigTopCurtainOverlay=(()=>{
 let serial=0;
 const source=(url,box,cls='')=>`<svg class="${cls}" viewBox="${box}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="${url}" width="533" height="1600"/></svg>`;
 function repeat(A,box,width,height,kind){const id='bigtop-fabric-'+(++serial);return `<svg class="bigtop-tiled-fabric" data-fabric="${kind}" aria-hidden="true"><defs><pattern id="${id}" width="${width}" height="${height}" patternUnits="userSpaceOnUse"><svg width="${width}" height="${height}" viewBox="${box}" preserveAspectRatio="xMidYMid meet"><image href="${A.frame}" width="600" height="1500"/></svg></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;}
 function frame(A){const xs=[0,120,480],ys=[0,210,1340],ws=[120,360,120],hs=[210,1130,160];return '<div class="bigtop-frame-art" data-layer="curtainFrame" aria-hidden="true">'+ys.flatMap((y,j)=>xs.map((x,i)=>j===1&&i!==1?repeat(A,`${x} ${y} 120 1130`,120,1130,'side'):`<svg data-layer="${j===0?'topValance':'frameTrim'}" viewBox="${x} ${y} ${ws[i]} ${hs[j]}" preserveAspectRatio="none"><image href="${A.frame}" width="600" height="1500"/></svg>`)).join('')+'</div>';}
 class Overlay{
  static result(f,sessionId=null,isPersistent=!!f.carried){return Object.freeze({curtainId:f.id,reelIndex:f.reel,winnerType:f.winner,rewardType:f.multiplier===1?'WILD':'MULTIPLIER',rewardValue:f.multiplier,isPersistent:!!isPersistent,bonusSessionId:sessionId});}
  static create(f,{resolved=false,sessionId=null}={}){const A=BIG_TOP_ASSETS,n=document.createElement('div');n.className='bigtop-curtain full-reel'+(resolved?' resolved':'');n.dataset.clown=resolved?f.winner:'';n.dataset.feature=f.id;n.dataset.phase=resolved?'FINAL_OPEN':'CLOSED';n.curtainResult=this.result(f,sessionId);
   n.innerHTML=`<div class="bigtop-stage" data-layer="stageContent" aria-hidden="true">${source(A.duo,'0 120 533 220','bigtop-stage-lights')}${source(A.duo,'0 1330 533 270','bigtop-stage-floor')}</div>`+['left','right'].map(side=>`<span class="bigtop-drape ${side}" data-layer="curtain${side==='left'?'Left':'Right'}">${repeat(A,'60 275 20 100',20,100,'panel')}</span>`).join('')+frame(A)+`<span class="bigtop-label" data-layer="bottomBadge"><img src="${A.badges[f.multiplier]}" alt="${f.multiplier===1?'WILD':'x'+f.multiplier}"></span>`+(f.carried?'<small class="bigtop-encore">PERSISTENT</small>':'');
   if(resolved)n.querySelector('[data-layer=stageContent]').insertAdjacentHTML('beforeend',`<span class="bigtop-clown ${f.winner}" data-clown="${f.winner}"><img class="bigtop-winner-scene" src="${A.finals[f.winner]}" alt="${f.winner==='bombo'?'BOMBO':'SKINNY'}"></span>`);
   requestAnimationFrame(()=>this.refresh(n));return n;
  }
  static showDuo(n){if(!n.querySelector('.bigtop-duo-scene'))n.querySelector('[data-layer=stageContent]').insertAdjacentHTML('beforeend',`<img class="bigtop-duo-scene" src="${BIG_TOP_ASSETS.duo}" alt="BOMBO and SKINNY">`);return n.querySelector('.bigtop-duo-scene');}
  static refresh(n){if(!n.isConnected)return;for(const svg of n.querySelectorAll('.bigtop-tiled-fabric')){const width=svg.getBoundingClientRect().width,base=svg.dataset.fabric==='panel'?20:120;if(width)svg.querySelector('pattern').setAttribute('patternTransform',`scale(${width/base})`);}}
 }
 window.addEventListener('resize',()=>document.querySelectorAll('#bigTopReels .bigtop-curtain').forEach(n=>Overlay.refresh(n)));
 return Overlay;
})();
