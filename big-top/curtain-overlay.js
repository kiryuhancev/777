/* Presentation only: supplied V5 full-height scenes and closing leaves; no RNG or financial writes. */
const CurtainOverlay=window.VaultBigTopCurtainOverlay=(()=>{
 // Responsive sources are whole supplied compositions. Horizontal clipping is intentional in V5.
 function scene(url,key,cls){return `<picture class="${cls}">${BIG_TOP_ASSETS.mobile[key]?`<source media="(max-width:760px)" srcset="${BIG_TOP_ASSETS.mobile[key]}">`:''}<img class="bigtop-stage-art" src="${url}" alt="${key==='duo'?'BOMBO and SKINNY':key==='empty'?'':key.toUpperCase()}"></picture>`;}
 class Overlay{
  static result(f,sessionId=null,isPersistent=!!f.carried){return Object.freeze({curtainId:f.id,reelIndex:f.reel,winnerType:f.winner,rewardType:f.multiplier===1?'WILD':'MULTIPLIER',rewardValue:f.multiplier,isPersistent:!!isPersistent,bonusSessionId:sessionId});}
  static create(f,{resolved=false,sessionId=null}={}){const A=BIG_TOP_ASSETS,n=document.createElement('div');n.className='bigtop-curtain full-reel'+(resolved?' resolved':'');n.dataset.clown=resolved?f.winner:'';n.dataset.feature=f.id;n.dataset.phase=resolved?'FINAL_OPEN':'CLOSED';n.curtainResult=this.result(f,sessionId);
   n.innerHTML=`<div class="bigtop-stage" data-layer="stageContent" aria-hidden="true"><img class="bigtop-stage-background" src="${A.stageBackground}" alt="">${resolved?'':scene(A.empty,'empty','bigtop-stage-empty')}${resolved?`<span class="bigtop-clown ${f.winner}" data-clown="${f.winner}">${scene(A.finals[f.winner],f.winner,'bigtop-winner-scene')}</span>`:''}</div>`+['left','right'].map(side=>`<span class="bigtop-drape ${side}" data-layer="curtain${side==='left'?'Left':'Right'}"><img src="${A.closing[side]}" alt=""></span>`).join('')+`<span class="bigtop-label" data-layer="bottomBadge"><img src="${A.badges[f.multiplier]}" alt="${f.multiplier===1?'WILD':'x'+f.multiplier}"></span>`;
   return n;
  }
  static showDuo(n){const stage=n.querySelector('[data-layer=stageContent]');stage.querySelector('.bigtop-stage-empty')?.remove();if(!n.querySelector('.bigtop-duo-scene'))stage.insertAdjacentHTML('beforeend',scene(BIG_TOP_ASSETS.duo,'duo','bigtop-duo-scene'));return n.querySelector('.bigtop-duo-scene');}
  static refresh(){} // Geometry is CSS-only; no resize handlers or frame-dependent texture scaling.
 }
 return Overlay;
})();
