/* Transient layout/asset guards only; no game state, randomness or financial data. */
window.VaultReelLayout=(()=>{
 const locks=new WeakMap(),active=new Set(),images=new Map(),prepared=new Map();
 const properties=['width','height','min-width','max-width','min-height','max-height','box-sizing'];
 function restore(node,record){for(const [key,value,priority] of record.saved){if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);}}
 function freeze(node){const box=node.getBoundingClientRect();if(!box.width||!box.height)return;node.style.setProperty('box-sizing','border-box');for(const key of ['width','min-width','max-width'])node.style.setProperty(key,box.width+'px');for(const key of ['height','min-height','max-height'])node.style.setProperty(key,box.height+'px');}
 function unlock(node){const record=locks.get(node);if(!record)return;locks.delete(node);active.delete(node);restore(node,record);delete node.dataset.reelGeometryLocked;}
 function lock(node){if(!node?.isConnected)return()=>{};unlock(node);const box=node.getBoundingClientRect();if(!box.width||!box.height)return()=>{};const record={saved:properties.map(key=>[key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)])};locks.set(node,record);active.add(node);node.dataset.reelGeometryLocked='';freeze(node);return()=>{if(locks.get(node)===record)unlock(node);};}
 // A responsive breakpoint changes the intended geometry. Keep each lock's owner token,
 // but remeasure against original CSS so closing an open popup cannot cause a late resize.
 window.addEventListener('resize',()=>{const nodes=[...active].filter(n=>n.isConnected);for(const node of nodes)restore(node,locks.get(node));for(const node of nodes)freeze(node);});
 function preload(urls){return Promise.all([...new Set(urls.filter(u=>typeof u==='string'&&u))].map(url=>{if(!images.has(url)){images.set(url,new Promise(resolve=>{const image=new Image();image.onload=()=>{const decoded=image.decode?.();if(decoded)decoded.catch(()=>{}).then(resolve);else resolve();};image.onerror=()=>{images.delete(url);resolve();};image.src=url;}));}return images.get(url);}));}
 function urls(game){const assets={slot:Object.values(SYMBOLS).map(s=>s.img),swamp:SWAMP_SLOT_ASSETS,vault_heist:VAULT_HEIST_ASSETS,magnet:MAGNET_ASSETS,critter:CRITTER_ASSETS,big_top:BIG_TOP_ASSETS,upside_paws:UPSIDE_PAWS_ASSETS}[game];const flatten=v=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(flatten):[];return flatten(assets);}
 function prepare(game){if(!prepared.has(game)){const entry={ready:false};entry.promise=preload(urls(game)).then(()=>{entry.ready=true;});prepared.set(game,entry);}return prepared.get(game).promise;}
 document.addEventListener('DOMContentLoaded',()=>{for(const game of ['slot','swamp','vault_heist','magnet','critter'])prepare(game);},{once:true});
 return {lock,unlock,preload,prepare,isReady:game=>prepared.get(game)?.ready===true};
})();
