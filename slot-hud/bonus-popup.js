/* Reel-local feature gates. Presentation cannot choose game outcomes or settle money. */
window.VaultBonusPopup=(()=>{
 const hosts={slot:'grid',swamp:'swampReels',vault_heist:'heistReels',magnet:'magnetField',critter:'critterGrid'},pending=new Map();let held=false;
 function cancel(game){pending.get(game)?.finish(false);}
 function show(game,{title='BONUS',kicker='',value='',detail=''}={}){
  if(pending.has(game))return pending.get(game).promise;
  const host=document.getElementById(hosts[game]);if(!host)return Promise.resolve(false);
  let resolve;const promise=new Promise(r=>resolve=r),previous=document.activeElement,overlay=document.createElement('div'),card=document.createElement('section');overlay.className='vault-feature-gate';overlay.dataset.skin=game;card.className='vault-feature-card';card.setAttribute('role','dialog');card.setAttribute('aria-label',title);card.tabIndex=-1;
  for(const [tag,cls,text] of [['h2','',title],['p','feature-kicker',kicker],['strong','feature-value',String(value)],['p','feature-detail',detail],['button','feature-continue','TAP / SPACE TO CONTINUE']]){const n=document.createElement(tag);n.className=cls;n.textContent=text;if(tag==='button')n.type='button';card.append(n);}overlay.append(card);host.classList.add('vault-feature-host');host.append(overlay);
  let observer;const armed=performance.now()+180;const entry={promise,finish(ok){if(pending.get(game)!==entry)return;pending.delete(game);observer?.disconnect();overlay.remove();if(previous?.isConnected)previous.focus({preventScroll:true});resolve(ok);}};pending.set(game,entry);observer=new MutationObserver(()=>{if(!overlay.isConnected)entry.finish(false);});observer.observe(host,{childList:true});
  overlay.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(performance.now()>=armed)entry.finish(true);});card.focus({preventScroll:true});return promise;
 }
 document.addEventListener('keydown',e=>{if(!pending.size)return;e.stopImmediatePropagation();if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!held){held=true;const entry=[...pending.values()].at(-1);const button=document.querySelector('.vault-feature-gate .feature-continue');button?.click();}}},true);
 document.addEventListener('keyup',e=>{if(e.code==='Space'){held=false;if(pending.size){e.preventDefault();e.stopImmediatePropagation();}}},true);
 return {show,cancel,isOpen:game=>pending.has(game)};
})();
