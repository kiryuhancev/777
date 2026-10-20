/* Symbols enter already resolved cells. No RNG, wallet, outcomes or persistence. */
(()=>{
 'use strict';
 const PRESETS=Object.freeze({
  classic:Object.freeze({fallDuration:120,symbolStagger:18,columnStagger:45,bounceDuration:60,overshoot:.04}),
  premium:Object.freeze({fallDuration:185,symbolStagger:25,columnStagger:60,bounceDuration:100,overshoot:.01}),
  impact:Object.freeze({fallDuration:95,symbolStagger:12,columnStagger:35,bounceDuration:85,overshoot:.08})
 });
 const GAMES=Object.freeze({slot:'classic',swamp:'classic',vault_heist:'premium',magnet:'premium',critter:'impact'});
 const SPEED=Object.freeze({normal:1,quick:.65,turbo:.4});
 const sessions=new Map(),pending=new Map(),settings=new Map(),listeners=new Map(),history=[],owners=new WeakMap();
 const hooks=['onSymbolEnter','onSymbolLand','onColumnLand','onGridSettled','onSpecialSymbolLand'];
 function emit(hook,detail){
  const event=Object.freeze({hook,...detail,time:performance.now()});history.push(event);if(history.length>500)history.shift();
  window.dispatchEvent(new CustomEvent('vault-symbol-drop:'+hook,{detail:event}));
  for(const fn of listeners.get(hook)||[])try{fn(event);}catch(error){console.error('Slot animation hook failed',error);}
 }
 function config(game,options={}){
  const supplied={...options,...settings.get(game)},mode=Object.hasOwn(PRESETS,supplied.mode)?supplied.mode:GAMES[game]||'classic';
  const speedProfile=Object.hasOwn(SPEED,supplied.speedProfile)?supplied.speedProfile:'normal';
  return {mode,...PRESETS[mode],columnMode:'STAGGERED_COLUMNS',winSettleDelay:100,noWinSettleDelay:450,featureSettleDelay:170,cascadeSpeedMultiplier:.85,anticipation:true,...supplied,mode,speedProfile,reducedMotion:!!supplied.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('slot-reduced-motion')};
 }
 function special(symbol){return /scatter|wild|wheel|collector|magnet|super|overload|bonus/.test(symbol||'');}
 function cancel(game){const s=sessions.get(game);if(!s)return;s.cancelled=true;for(const timer of s.timers)clearTimeout(timer);for(const a of s.animations)a.cancel();}
 async function run(game,options){
  cancel(game);
  const cfg=config(game,options),scale=SPEED[cfg.speedProfile]*(options.phase==='cascade'?cfg.cascadeSpeedMultiplier:1);
  const s={game,roundId:options.roundId||null,cancelled:false,animations:new Set(),timers:new Set(),started:performance.now(),settled:false};sessions.set(game,s);
  const list=(options.cells||[]).filter(c=>c.node?.isConnected).map(c=>({...c,symbol:String(c.symbol||''),height:c.node.getBoundingClientRect().height,base:getComputedStyle(c.node).transform}));
  const columns=[...new Set(list.map(c=>c.column))].sort((a,b)=>a-b),plan=[];
  let previousEnd=0,seen=options.staticScatters||0;
  const base={game,roundId:s.roundId,phase:options.phase||'initial',mode:cfg.mode,speedProfile:cfg.speedProfile,reducedMotion:cfg.reducedMotion};
  for(let colIndex=0;colIndex<columns.length;colIndex++){
   const column=columns[colIndex],cells=list.filter(c=>c.column===column).sort((a,b)=>b.row-a.row);
   let start=cfg.columnMode==='SEQUENTIAL_COLUMNS'?previousEnd:colIndex*cfg.columnStagger*scale;
   const suspense=!!cfg.anticipation&&seen>=2&&colIndex===columns.length-1&&!options.staticScatterColumns?.includes(column);
   if(suspense)start=Math.max(start,previousEnd)+(cfg.reducedMotion?100:420)*scale;
   let end=start;
   for(let index=0;index<cells.length;index++){
    const c=cells[index],isSpecial=special(c.symbol),fall=cfg.reducedMotion?90:cfg.fallDuration*scale;
    const landing=cfg.reducedMotion?0:(isSpecial?160:cfg.bounceDuration)*scale;
    const delay=start+index*(cfg.reducedMotion?4:cfg.symbolStagger*scale),duration=fall+landing;
    plan.push({...c,delay,duration,fall,isSpecial,suspense});end=Math.max(end,delay+duration);
   }
   previousEnd=Math.max(previousEnd,end);seen+=cells.filter(c=>c.symbol==='scatter').length;
  }
  // All geometry is read above before the first animation/write.
  if(options.root)options.root.dataset.slotDropMask=game;
  function animate(node,frames,timing){
   if(!node.animate)return Promise.resolve();
   const a=node.animate(frames,timing);s.animations.add(a);
   return a.finished.catch(()=>{}).finally(()=>{s.animations.delete(a);a.cancel();});
  }
  function clock(ms){const node=options.root||list[0]?.node;return node&&ms>0?animate(node,[{},{}],{duration:ms}):Promise.resolve();}
  const columnPromises=new Map();
  try{
   const jobs=plan.map(c=>{
    const node=c.node,identity={...base,column:c.column,row:c.row,symbol:c.symbol,anticipation:c.suspense,delay:c.delay,duration:c.duration};owners.set(node,s);
    const baseTransform=c.base==='none'?'':c.base,offset=cfg.reducedMotion?8:Math.max(c.height,1)*(c.fromRows||((options.rows||3)+1));
    const transform=(dy,sx=1,sy=1,dx=0)=>`${baseTransform} translate(${dx}px,${dy}px) scale(${sx},${sy})`;
    const ratio=c.fall/c.duration,overshoot=c.height*cfg.overshoot*(cfg.speedProfile==='turbo'?.45:1);
    let frames;
    if(cfg.reducedMotion)frames=[{opacity:0,transform:transform(-offset)},{opacity:1,transform:transform(0)}];
    else if(cfg.mode==='premium')frames=[{offset:0,opacity:0,transform:transform(-offset)},{offset:ratio*.75,opacity:1,transform:transform(-offset*.08)},{offset:ratio,opacity:1,transform:transform(0)},{offset:Math.min(1,ratio+.1),transform:transform(overshoot)},{offset:1,transform:transform(0)}];
    else frames=[{offset:0,opacity:0,transform:transform(-offset)},{offset:ratio*.75,opacity:1,transform:transform(-offset*.1)},{offset:ratio,opacity:1,transform:transform(overshoot,c.isSpecial?1.04:1, cfg.mode==='impact'?.94:1)},{offset:ratio+(1-ratio)*.4,transform:transform(-overshoot*.45,1,1,cfg.mode==='impact'&&cfg.speedProfile!=='turbo'?1.5:0)},{offset:1,transform:transform(0)}];
    if(!cfg.reducedMotion&&cfg.mode==='premium'&&c.isSpecial&&game==='magnet')frames.splice(frames.length-1,0,{offset:ratio+(1-ratio)*.55,transform:transform(0,1.025,1.025,cfg.speedProfile==='turbo'?0:1)});
    if(!cfg.reducedMotion&&game==='critter'&&c.symbol.includes('wild')&&cfg.mode==='impact')frames[3].transform=transform(-c.height*.06,.96,1.06);
    for(const frame of frames)frame.easing=cfg.mode==='premium'?'cubic-bezier(.16,.6,.2,1)':'cubic-bezier(.3,.65,.5,1)';
    node.dataset.slotLanding=cfg.reducedMotion?'reduced':c.isSpecial?(c.symbol==='wheel'||game==='magnet'?'magnetic':game==='critter'&&c.symbol.includes('wild')?'hop':'special'):cfg.mode;
    node.style.setProperty('--slot-landing-delay',(c.delay+c.fall)+'ms');node.style.setProperty('--slot-landing-duration',(cfg.speedProfile==='turbo'?65:120)+'ms');
    const timer=setTimeout(()=>{s.timers.delete(timer);if(!s.cancelled)emit('onSymbolEnter',identity);},c.delay);s.timers.add(timer);
    const contact=clock(c.delay+c.fall).then(()=>{if(!s.cancelled){emit('onSymbolLand',identity);if(c.isSpecial)emit('onSpecialSymbolLand',identity);}});
    const job=Promise.all([animate(node,frames,{duration:c.duration,delay:c.delay,fill:'backwards',easing:'linear'}),contact]).finally(()=>{if(owners.get(node)===s){owners.delete(node);delete node.dataset.slotLanding;node.style.removeProperty('--slot-landing-delay');node.style.removeProperty('--slot-landing-duration');}});
    if(!columnPromises.has(c.column))columnPromises.set(c.column,[]);columnPromises.get(c.column).push(contact);return job;
   });
   await Promise.all([...columnPromises].map(async([column,jobs])=>{await Promise.all(jobs);if(!s.cancelled)emit('onColumnLand',{...base,column});}));
   await Promise.all(jobs);
   if(!s.cancelled){s.settled=true;emit('onGridSettled',{...base,cells:plan.length,elapsed:performance.now()-s.started});if(options.settle!==false)await clock((options.feature?cfg.featureSettleDelay:options.hasWin?cfg.winSettleDelay:cfg.noWinSettleDelay)*scale);}
   return {cancelled:s.cancelled,gridSettled:s.settled,elapsed:performance.now()-s.started};
  }finally{for(const timer of s.timers)clearTimeout(timer);if(sessions.get(game)===s){sessions.delete(game);if(options.root?.dataset.slotDropMask===game)delete options.root.dataset.slotDropMask;}}
 }
 const api=window.VaultSymbolDrop={presets:PRESETS,games:GAMES,speeds:SPEED,
  play(game,options){const promise=run(game,options);pending.set(game,promise);return promise;},
  wait:game=>pending.get(game)||Promise.resolve(),cancel,isBusy:game=>sessions.has(game),
  configure(game,value){settings.set(game,{...settings.get(game),...value});},reset:game=>settings.delete(game),getConfig:config,
  on(hook,fn){if(!hooks.includes(hook))throw Error('Unknown animation hook');if(!listeners.has(hook))listeners.set(hook,new Set());listeners.get(hook).add(fn);return ()=>listeners.get(hook).delete(fn);},
  inspect:()=>({active:[...sessions.values()].map(s=>({game:s.game,roundId:s.roundId,elapsed:performance.now()-s.started,gridSettled:s.settled})),events:history.slice()})
 };
 window.addEventListener('pagehide',()=>{for(const game of sessions.keys())cancel(game);});
 new MutationObserver(()=>{for(const game of sessions.keys())if(typeof currentGame!=='undefined'&&currentGame!==game)cancel(game);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 if(window.SLOT_ANIMATION_DEBUG===true){
  const panel=document.createElement('aside');panel.className='slot-animation-debug';panel.innerHTML='<b>SLOT ANIMATION DEBUG</b><label>DROP MODE<select data-key="mode"><option value="classic">Classic</option><option value="premium">Premium</option><option value="impact">Impact</option></select></label><label>SPEED<select data-key="speedProfile"><option value="normal">Normal</option><option value="quick">Quick</option><option value="turbo">Turbo</option></select></label><label>COLUMNS<select data-key="columnMode"><option>STAGGERED_COLUMNS</option><option>SEQUENTIAL_COLUMNS</option></select></label><output></output>';document.body.append(panel);
  panel.querySelectorAll('select').forEach(n=>n.onchange=()=>api.configure(currentGame,{[n.dataset.key]:n.value}));
  const tick=()=>{panel.querySelector('output').textContent=JSON.stringify(api.inspect().active);requestAnimationFrame(tick);};tick();
 }
})();
