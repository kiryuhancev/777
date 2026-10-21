/* All feature gates are children of the actual, stationary symbol viewport. */
window.VaultBonusPopup=(()=>{
 const hosts={slot:'grid',swamp:'swampReels',vault_heist:'heistReels',magnet:'magnetField',critter:'critterGrid',big_top:'bigTopReels',upside_paws:'upsidePawsReels'},pending=new Map();let held=false;
 const refresh=()=>window.VaultSlotHud?.refresh();
 function cancel(game){pending.get(game)?.finish(false);}
 function show(game,{title='BONUS',kicker='',value='',detail='',type='bonus',actions=null,dismissible=false}={}){
  if(pending.has(game))return pending.get(game).promise;
  const host=document.getElementById(hosts[game]);if(!host)return Promise.resolve(false);
  let resolve,observer;const promise=new Promise(r=>resolve=r),previous=document.activeElement;
  const overlay=document.createElement('div'),card=document.createElement('section');
  overlay.className='vault-feature-gate';overlay.dataset.skin=game;overlay.dataset.type=type;
  card.className='vault-feature-card';card.setAttribute('role','dialog');card.setAttribute('aria-label',title);card.tabIndex=-1;
  const ornament=document.createElement('span');ornament.className='feature-ornament';ornament.setAttribute('aria-hidden','true');ornament.textContent=game==='critter'?'🐾':game==='swamp'?'⚓':'✦';card.append(ornament);
  for(const [tag,cls,text] of [['h2','',title],['p','feature-kicker',kicker],['strong','feature-value',String(value)],['p','feature-detail',detail],['button','feature-continue','TAP / SPACE TO CONTINUE']]){
   const n=document.createElement(tag);n.className=cls;n.textContent=text;if(tag==='button')n.type='button';if(!text||actions&&tag==='button')n.hidden=true;card.append(n);
  }
  if(actions){const group=document.createElement('div');group.className='feature-actions';for(const action of actions){const button=document.createElement('button');button.type='button';button.dataset.popupAction=action.id;button.textContent=action.label;group.append(button);}card.append(group);if(dismissible){const close=document.createElement('button');close.type='button';close.className='feature-close';close.dataset.popupAction='cancel';close.setAttribute('aria-label','Close');close.textContent='×';card.append(close);}}
  overlay.append(card);host.classList.add('vault-feature-host');host.append(overlay);
  const root=host.closest('[data-slot-skin]'),buttons=[...root?.querySelectorAll('.slot-bottom-controls button:not([data-action="settings"])')||[]];
  const nativeIds={slot:['autoBtn','betMinus','betPlus','maxBetBtn','spinBtn','buyBtn'],swamp:['swampAuto','swampBetMinus','swampBetPlus','swampMaxBet','swampSpin','swampBuy'],vault_heist:['heistAuto','heistMinus','heistPlus','heistMax','heistSpin','heistBuy'],magnet:['magnetAuto','magnetMinus','magnetPlus','magnetMax','magnetSpin'],big_top:['bigTopAuto','bigTopMinus','bigTopPlus','bigTopMax','bigTopSpin','bigTopBuy'],upside_paws:['upsidePawsAuto','upsidePawsMinus','upsidePawsPlus','upsidePawsMax','upsidePawsSpin','upsidePawsBuy'],critter:['critterAuto','critterMinus','critterPlus','critterMax','critterSpin','critterBuy']};
  const controls=[...new Set([...buttons,...nativeIds[game].map(id=>document.getElementById(id)).filter(Boolean)])].map(node=>({node,disabled:node.disabled}));
  const armed=performance.now()+180,releaseLayout=window.VaultReelLayout?.lock(host)||(()=>{});
  const entry={promise,dismissible,finish(ok){
   if(pending.get(game)!==entry)return;pending.delete(game);observer?.disconnect();overlay.remove();releaseLayout();
   for(const {node,disabled} of controls)if(node.isConnected)node.disabled=disabled;
   if(previous?.isConnected)previous.focus({preventScroll:true});refresh();resolve(ok);
  }};
  pending.set(game,entry);for(const {node} of controls)node.disabled=true;refresh();
  observer=new MutationObserver(()=>{if(!overlay.isConnected)entry.finish(false);});observer.observe(host,{childList:true});
  overlay.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(performance.now()<armed)return;if(actions){const button=e.target.closest('[data-popup-action]');if(button)entry.finish(button.dataset.popupAction);else if(dismissible&&e.target===overlay)entry.finish('cancel');}else entry.finish(true);});card.focus({preventScroll:true});return promise;
 }
 document.addEventListener('keydown',e=>{
  if(!pending.size)return;e.stopImmediatePropagation();
  if(e.code==='Escape'){const entry=pending.get(currentGame);if(entry?.dismissible){e.preventDefault();entry.finish('cancel');}return;}
  if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!held){held=true;const host=document.getElementById(hosts[currentGame]);host?.querySelector('.vault-feature-gate .feature-continue')?.click();}}
 },true);
 document.addEventListener('keyup',e=>{if(e.code==='Space'){held=false;if(pending.size){e.preventDefault();e.stopImmediatePropagation();}}},true);
 new MutationObserver(()=>{for(const game of pending.keys())if(currentGame!==game)cancel(game);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 return {show,cancel,isOpen:game=>pending.has(game)};
})();
