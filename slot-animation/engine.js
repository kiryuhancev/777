/* Symbols enter already resolved cells. No RNG, wallet, outcomes or persistence. */
(()=>{
 'use strict';
 const PRESETS=Object.freeze({
  classic:Object.freeze({fallDuration:280,symbolStagger:32,columnStagger:100,bounceDuration:100,overshoot:.025}),
  premium:Object.freeze({fallDuration:320,symbolStagger:42,columnStagger:110,bounceDuration:140,overshoot:0}),
  impact:Object.freeze({fallDuration:235,symbolStagger:26,columnStagger:80,bounceDuration:120,overshoot:.045})
 });
 const GAMES=Object.freeze({slot:'classic',swamp:'classic',vault_heist:'premium',magnet:'premium',critter:'impact'});
 const SPEED=Object.freeze({normal:1,quick:.7,turbo:.4});
 const renderers=new Map();
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
  return {mode,...PRESETS[mode],columnMode:'STAGGERED_COLUMNS',winSettleDelay:200,noWinSettleDelay:550,featureSettleDelay:270,cascadeSpeedMultiplier:.85,anticipation:true,...supplied,mode,speedProfile,reducedMotion:!!supplied.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('slot-reduced-motion')};
 }
 function special(symbol){return /scatter|wild|wheel|collector|magnet|super|overload|bonus/.test(symbol||'');}
 function cancel(game){renderers.get(game)?.cancel();const s=sessions.get(game);if(!s)return;s.cancelled=true;for(const timer of s.timers)clearTimeout(timer);for(const a of s.animations)a.cancel();}
 async function run(game,options){
  cancel(game);
  const cfg=config(game,options),scale=SPEED[cfg.speedProfile]*(options.phase==='cascade'?cfg.cascadeSpeedMultiplier:1);
  const s={game,roundId:options.roundId||null,cancelled:false,animations:new Set(),timers:new Set(),started:performance.now(),settled:false};sessions.set(game,s);
  const incoming=(options.cells||[]).filter(c=>c.node?.isConnected);
  for(const c of incoming)c.node.dataset.slotDropActive='';
  const list=incoming.map(c=>{const style=getComputedStyle(c.node);return {...c,symbol:String(c.symbol||''),height:c.node.getBoundingClientRect().height,base:c.node.style.transform||style.transform,opacity:Number(style.opacity)};});
  const columns=[...new Set(list.map(c=>c.column))].sort((a,b)=>a-b),plan=[];
  let previousEnd=0,seen=options.staticScatters||0;
  const base={game,roundId:s.roundId,phase:options.phase||'initial',mode:cfg.mode,speedProfile:cfg.speedProfile,reducedMotion:cfg.reducedMotion};
  for(let colIndex=0;colIndex<columns.length;colIndex++){
   const column=columns[colIndex],cells=list.filter(c=>c.column===column).sort((a,b)=>b.row-a.row);
   let start=cfg.columnMode==='SEQUENTIAL_COLUMNS'?previousEnd:(colIndex*cfg.columnStagger+Math.max(0,colIndex-2)*10)*scale;
   const suspense=!!cfg.anticipation&&seen>=2&&colIndex===columns.length-1&&!options.staticScatterColumns?.includes(column);
   if(suspense)start=Math.max(start,previousEnd)+(cfg.reducedMotion?100:720)*scale;
   let end=start;
   for(let index=0;index<cells.length;index++){
    const c=cells[index],isSpecial=special(c.symbol),fall=cfg.reducedMotion?90:Math.max(cfg.speedProfile==='turbo'?100:145,cfg.fallDuration*scale);
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
  const columnRemaining=new Map(columns.map(column=>[column,plan.filter(c=>c.column===column).length]));
  try{
   const jobs=plan.map(c=>{
    const node=c.node,identity={...base,column:c.column,row:c.row,symbol:c.symbol,anticipation:c.suspense,delay:c.delay,duration:c.duration};owners.set(node,s);
    const baseTransform=c.base==='none'?'':c.base,offset=cfg.reducedMotion?8:Math.max(c.height,1)*(c.fromRows||(c.row+1));
    const transform=(dy,sx=1,sy=1,dx=0)=>`${baseTransform} translate(${dx}px,${dy}px) scale(${sx},${sy})`;
    const ratio=c.fall/c.duration,overshoot=c.height*cfg.overshoot*(cfg.speedProfile==='turbo'?.45:1);
    let frames;
    if(cfg.reducedMotion)frames=[{opacity:0,transform:transform(-offset)},{opacity:1,transform:transform(0)}];
    else if(cfg.mode==='premium')frames=[{offset:0,opacity:0,transform:transform(-offset),easing:'cubic-bezier(.18,.62,.25,1)'},{offset:ratio,opacity:1,transform:transform(0)},{offset:1,opacity:1,transform:transform(0)}];
    else frames=[{offset:0,opacity:0,transform:transform(-offset),easing:'cubic-bezier(.22,.55,.36,1)'},{offset:ratio,opacity:1,transform:transform(overshoot),easing:'cubic-bezier(.2,.65,.3,1)'},{offset:1,opacity:1,transform:transform(0)}];
    for(const frame of frames)if(frame.opacity!==undefined)frame.opacity*=c.opacity;
    node.dataset.slotLanding=cfg.reducedMotion?'reduced':c.isSpecial?(c.symbol==='wheel'||game==='magnet'?'magnetic':game==='critter'&&c.symbol.includes('wild')?'hop':'special'):cfg.mode;
    node.style.setProperty('--slot-landing-delay',(c.delay+c.fall)+'ms');node.style.setProperty('--slot-landing-duration',(cfg.speedProfile==='turbo'?65:120)+'ms');
    let entered=false,landed=false;
    const enter=()=>{if(!entered&&!s.cancelled){entered=true;emit('onSymbolEnter',identity);}};
    const land=()=>{if(!landed&&!s.cancelled){enter();landed=true;emit('onSymbolLand',identity);if(c.isSpecial)emit('onSpecialSymbolLand',identity);const remaining=columnRemaining.get(c.column)-1;columnRemaining.set(c.column,remaining);if(!remaining)emit('onColumnLand',{...base,column:c.column});}};
    for(const [delay,notify] of [[c.delay,enter],[c.delay+c.fall,land]]){const timer=setTimeout(()=>{s.timers.delete(timer);notify();},delay);s.timers.add(timer);}
    // Notification timers never drive progression; completion comes from WAAPI.
    return animate(node,frames,{duration:c.duration,delay:c.delay,fill:'backwards',easing:'linear'}).then(land).finally(()=>{if(owners.get(node)===s){owners.delete(node);delete node.dataset.slotLanding;delete node.dataset.slotDropActive;node.style.removeProperty('--slot-landing-delay');node.style.removeProperty('--slot-landing-duration');}});
   });
   await Promise.all(jobs);
   if(!s.cancelled){s.settled=true;emit('onGridSettled',{...base,cells:plan.length,elapsed:performance.now()-s.started});if(options.settle!==false)await clock((options.feature||plan.some(c=>c.isSpecial)?cfg.featureSettleDelay:options.hasWin?cfg.winSettleDelay:cfg.noWinSettleDelay)*scale);}
   return {cancelled:s.cancelled,gridSettled:s.settled,elapsed:performance.now()-s.started};
  }finally{for(const timer of s.timers)clearTimeout(timer);if(sessions.get(game)===s){sessions.delete(game);if(options.root?.dataset.slotDropMask===game)delete options.root.dataset.slotDropMask;}}
 }
 const api=window.VaultSymbolDrop={presets:PRESETS,games:GAMES,speeds:SPEED,
  play(game,options){const promise=options.reels&&renderers.has(game)?renderers.get(game).play(options):run(game,options);pending.set(game,promise);return promise;},
  wait:game=>pending.get(game)||Promise.resolve(),cancel,isBusy:game=>sessions.has(game)||!!renderers.get(game)?.isBusy(),
  registerRenderer(game,renderer){renderers.set(game,renderer);},notify(hook,detail){if(!hooks.includes(hook))throw Error('Unknown animation hook');emit(hook,detail);},
  configure(game,value){settings.set(game,{...settings.get(game),...value});},reset:game=>settings.delete(game),getConfig:config,
  on(hook,fn){if(!hooks.includes(hook))throw Error('Unknown animation hook');if(!listeners.has(hook))listeners.set(hook,new Set());listeners.get(hook).add(fn);return ()=>listeners.get(hook).delete(fn);},
  inspect:()=>({active:[...sessions.values()].map(s=>({game:s.game,roundId:s.roundId,elapsed:performance.now()-s.started,gridSettled:s.settled})).concat([...renderers.values()].flatMap(r=>r.inspect?.().active?[r.inspect().active]:[])),events:history.slice()})
 };
 window.addEventListener('pagehide',()=>{for(const game of new Set([...sessions.keys(),...renderers.keys()]))cancel(game);});
 new MutationObserver(()=>{for(const game of new Set([...sessions.keys(),...renderers.keys()]))if(typeof currentGame!=='undefined'&&currentGame!==game)cancel(game);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 if(window.SLOT_ANIMATION_DEBUG===true){
  const panel=document.createElement('aside');panel.className='slot-animation-debug';panel.innerHTML='<b>SLOT ANIMATION DEBUG</b><label>DROP MODE<select data-key="mode"><option value="classic">Classic</option><option value="premium">Premium</option><option value="impact">Impact</option></select></label><label>SPEED<select data-key="speedProfile"><option value="normal">Normal</option><option value="quick">Quick</option><option value="turbo">Turbo</option></select></label><label>COLUMNS<select data-key="columnMode"><option>STAGGERED_COLUMNS</option><option>SEQUENTIAL_COLUMNS</option></select></label><output></output>';document.body.append(panel);
  panel.querySelectorAll('select').forEach(n=>n.onchange=()=>api.configure(currentGame,{[n.dataset.key]:n.value}));
  const tick=()=>{panel.querySelector('output').textContent=JSON.stringify(api.inspect().active);requestAnimationFrame(tick);};tick();
 }
})();
