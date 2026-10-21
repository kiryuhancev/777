/* Deterministic visual strip. The supplied finalGrid is never generated or edited here. */
(()=>{
 'use strict';
 const DEFAULTS=Object.freeze({accelerationDuration:150,fullSpeedDuration:490,decelerationDuration:360,reelStagger:165,stopDuration:110,stopBounce:5,reelSpeed:15,blurStrength:0,perspectiveAmount:.05});
 const overrides={},history=[],hooks=new Map();let session=null;
 function emit(hook,detail){const event=Object.freeze({hook,...detail,time:performance.now()});history.push(event);if(history.length>250)history.shift();window.dispatchEvent(new CustomEvent('vault-analog-reels:'+hook,{detail:event}));for(const fn of hooks.get(hook)||[])try{fn(event);}catch(error){console.error('Analog reel hook failed',error);}}
 function cancel(){if(!session)return;session.cancelled=true;for(const a of session.animations)a.cancel();}
 function configure(values){for(const [key,value] of Object.entries(values)){if(!Object.hasOwn(DEFAULTS,key)||!Number.isFinite(Number(value)))continue;const ranges={accelerationDuration:[60,350],fullSpeedDuration:[100,2000],decelerationDuration:[150,1100],reelStagger:[70,300],stopDuration:[70,180],stopBounce:[0,8],reelSpeed:[8,28],blurStrength:[0,.5],perspectiveAmount:[0,.08]};const [lo,hi]=ranges[key];overrides[key]=Math.max(lo,Math.min(hi,Number(value)));}}
 const ease=t=>1-(1-t)**2;
 async function play(options){
  cancel();
  const releaseLayout=window.VaultReelLayout?.lock(options.root)||(()=>{});
  const cfg={...DEFAULTS,...overrides},profile=VaultSymbolDrop.getConfig('swamp',options),reduced=profile.reducedMotion;
  const scale=({normal:1,quick:.65,turbo:.4}[profile.speedProfile]||1)*(reduced?.45:1);
  const s={roundId:options.roundId||null,cancelled:false,animations:new Set(),reels:[],started:performance.now(),raf:0,settled:false};session=s;
  const root=options.root,base={game:'swamp',roundId:s.roundId,phase:options.feature?'free-spin':'initial',renderer:'analog',speedProfile:profile.speedProfile,reducedMotion:reduced};
  const notify=(hook,detail={})=>VaultSymbolDrop.notify(hook,{...base,...detail});
  const make=value=>{const template=document.createElement('template');template.innerHTML=options.renderCell(value);const node=template.content.firstElementChild;if(!node)throw Error('Missing reel symbol');return node;};
  // Read all viewport geometry before reparenting any cells.
  const geometry=options.reels.map(node=>({node,height:node.getBoundingClientRect().height,gap:parseFloat(getComputedStyle(node).rowGap)||3,old:[...node.children]}));
  const early=options.finalGrid.slice(0,-1).flatMap((col,i)=>col.some(t=>t.id==='scatter')?[i]:[]);
  const suspense=options.anticipation!==false&&early.length>=2;
  const accel=Math.max(40,cfg.accelerationDuration*scale),decel=Math.max(90,cfg.decelerationDuration*scale),lock=reduced?0:cfg.stopDuration*scale;
  const firstMotion=accel+cfg.fullSpeedDuration*scale+decel;
  try{
   for(let c=0;c<geometry.length;c++){
    const {node,height,gap,old}=geometry[c],cellHeight=(height-gap*2)/3,pitch=cellHeight+gap;
    const isSuspense=suspense&&c===geometry.length-1;
    let motion=firstMotion+cfg.reelStagger*c*scale,slow=decel;
    if(isSuspense){slow=Math.max(180,(reduced?400:900)*scale);const secondStop=firstMotion+cfg.reelStagger*early[1]*scale+lock;motion=Math.max(motion-decel,secondStop+120*scale)+slow;}
    const full=motion-accel-slow,bounce=reduced?0:cfg.stopBounce*Math.min(1,scale/.65);
    const turns=Math.max(reduced?5:8,Math.round((motion-(accel+slow)/2)/1000*cfg.reelSpeed));
    const oldStart=turns+1,yStart=-oldStart*pitch,yTarget=-pitch,distance=turns*pitch+bounce,velocity=distance/(accel/2+full+slow/2);
    const yAccel=yStart+velocity*accel/2,yFull=yAccel+velocity*full,total=motion+lock;
    const strip=document.createElement('div');strip.className='swamp-analog-strip';strip.style.setProperty('--analog-cell-height',cellHeight+'px');strip.style.setProperty('--analog-gap',gap+'px');
    const target=options.finalGrid[c].map(make),sequence=[];
    for(let i=0;i<oldStart+4;i++){
     const child=i>=1&&i<=3?target[i-1]:i>=oldStart&&i<oldStart+3&&old[i-oldStart]?old[i-oldStart]:make(options.decorativeSymbols[(i+c*3)%options.decorativeSymbols.length]);
     child.classList.remove('win','collecting','landed');sequence.push({node:child,img:child.querySelector('img'),index:i,scale:1});strip.append(child);
    }
    const reel={column:c,node,strip,target,sequence,cellHeight,pitch,height,yStart,yTarget,velocity,yAccel,yFull,accel,full,slow,motion,total,lock,bounce,isSuspense,entered:new Set(),stage:'START',stageIndex:0,animation:null};s.reels.push(reel);
    node.dataset.swampAnalog='';node.dataset.reelPhase='START';node.replaceChildren(strip);strip.style.transform=`translate3d(0,${yStart}px,0)`;
    const t=y=>`translate3d(0,${y}px,0)`;
    const frames=[{offset:0,transform:t(yStart),easing:'cubic-bezier(.333333,0,.666667,.333333)'},{offset:accel/total,transform:t(yAccel),easing:'linear'},{offset:(accel+full)/total,transform:t(yFull),easing:'cubic-bezier(.333333,.666667,.666667,1)'},{offset:motion/total,transform:t(yTarget+bounce)}];
    if(lock)frames.push({offset:(motion+lock*.4)/total,transform:t(yTarget-2*Math.min(1,scale/.65)),easing:'ease-out'},{offset:1,transform:t(yTarget)});
    reel.animation=strip.animate(frames,{duration:total,easing:'linear',fill:'both'});s.animations.add(reel.animation);
    emit('onReelStart',{...base,reelIndex:c,accelerationDuration:accel,fullSpeedDuration:full,decelerationDuration:slow,duration:total,anticipation:isSuspense});node.dataset.reelPhase='ACCELERATION';
   }
   function state(reel,time){
    const stages=[{at:reel.accel,name:'FULL_SPEED',hook:'onReelFullSpeed'},{at:reel.accel+reel.full,name:'DECELERATION',hook:'onReelDecelerate'},{at:reel.motion,name:'FINAL_ALIGNMENT'}];
    while(reel.stageIndex<stages.length&&time>=stages[reel.stageIndex].at){const stage=stages[reel.stageIndex++];reel.stage=stage.name;reel.node.dataset.reelPhase=stage.name;if(stage.name==='FULL_SPEED'&&cfg.blurStrength>0&&!reduced&&innerWidth>600)reel.strip.style.filter=`blur(${cfg.blurStrength}px)`;else reel.strip.style.removeProperty('filter');if(stage.hook)emit(stage.hook,{...base,reelIndex:reel.column,anticipation:reel.isSuspense});}
   }
   function position(reel,t){
    if(t<reel.accel)return reel.yStart+reel.velocity*t*t/(2*reel.accel);
    if(t<reel.accel+reel.full)return reel.yAccel+reel.velocity*(t-reel.accel);
    if(t<reel.motion){const u=(t-reel.accel-reel.full)/reel.slow;return reel.yFull+reel.velocity*reel.slow*(u-u*u/2);}
    if(!reel.lock)return reel.yTarget;
    const u=Math.min(1,(t-reel.motion)/reel.lock),back=2*Math.min(1,scale/.65);
    return reel.yTarget+(u<.4?reel.bounce-(reel.bounce+back)*ease(u/.4):-back*(1-ease((u-.4)/.6)));
   }
   function frame(){
    if(s.cancelled)return;
    for(const reel of s.reels){
     if(reel.stage==='SETTLED')continue;
     const time=Math.min(reel.total,Number(reel.animation.currentTime)||0);state(reel,time);
     const y=position(reel,time),first=Math.max(0,Math.floor(-y/reel.pitch)-1),last=Math.min(reel.sequence.length-1,first+5);
     for(let i=first;i<=last;i++){
      const cell=reel.sequence[i],center=y+i*reel.pitch+reel.cellHeight/2,edge=Math.min(1,Math.abs(center-reel.height/2)/(reel.height/2));
      const strength=reduced?0:cfg.perspectiveAmount*(time<reel.motion?1:Math.max(0,1-(time-reel.motion)/Math.max(1,reel.lock))),stretch=1-strength*edge*edge;
      if(cell.img&&Math.abs(stretch-cell.scale)>.001){cell.img.style.transform=`scaleY(${stretch.toFixed(3)})`;cell.scale=stretch;}
      if(i>=1&&i<=3&&!reel.entered.has(i)&&center+reel.cellHeight/2>0&&center-reel.cellHeight/2<reel.height){reel.entered.add(i);notify('onSymbolEnter',{column:reel.column,row:i-1,symbol:options.finalGrid[reel.column][i-1].id,anticipation:reel.isSuspense});}
     }
    }
    s.raf=requestAnimationFrame(frame);
   }
   frame();
   await Promise.all(s.reels.map(async reel=>{
    await reel.animation.finished.catch(()=>{});if(reel.lockMotion){await reel.lockMotion.finished.catch(()=>{});reel.lockMotion.cancel();s.animations.delete(reel.lockMotion);}if(s.cancelled)return;
    state(reel,reel.total);
    // Commit the SAME target nodes that have physically scrolled into the viewport.
    for(const node of reel.target)node.querySelector('img')?.style.removeProperty('transform');
    if(reel.strip.parentNode===reel.node){reel.node.replaceChildren(...reel.target);delete reel.node.dataset.swampAnalog;}
    reel.animation.cancel();s.animations.delete(reel.animation);reel.stage='SETTLED';reel.node.dataset.reelPhase='SETTLED';
    for(let r=0;r<3;r++){
     const symbol=options.finalGrid[reel.column][r].id;
     if(!reel.entered.has(r+1))notify('onSymbolEnter',{column:reel.column,row:r,symbol,anticipation:reel.isSuspense});
     notify('onSymbolLand',{column:reel.column,row:r,symbol});
     if(/scatter|collector|wild/.test(symbol)){notify('onSpecialSymbolLand',{column:reel.column,row:r,symbol});reel.target[r].dataset.slotLanding=reduced?'reduced':'special';reel.target[r].style.setProperty('--slot-landing-duration','200ms');}
    }
    notify('onColumnLand',{column:reel.column});emit('onReelStop',{...base,reelIndex:reel.column,anticipation:reel.isSuspense});
   }));
   if(!s.cancelled){
    s.settled=true;emit('onAllReelsStopped',{...base,elapsed:performance.now()-s.started});notify('onGridSettled',{cells:15,elapsed:performance.now()-s.started});
    const special=options.finalGrid.flat().some(t=>/scatter|collector|wild/.test(t.id));
    const pause=(options.feature||special?profile.featureSettleDelay:options.hasWin?profile.winSettleDelay:profile.noWinSettleDelay)*({normal:1,quick:.65,turbo:.4}[profile.speedProfile]||1);
    if(pause>0){const a=root.animate([{},{}],{duration:reduced?Math.min(120,pause):pause});s.animations.add(a);await a.finished.catch(()=>{});a.cancel();s.animations.delete(a);}
   }
   return {cancelled:s.cancelled,gridSettled:s.settled,elapsed:performance.now()-s.started};
  }finally{
   releaseLayout();
   cancelAnimationFrame(s.raf);
   for(const a of s.animations)a.cancel();
   for(const reel of s.reels){
    for(const cell of reel.sequence)cell.img?.style.removeProperty('transform');
    if(reel.strip.parentNode===reel.node){reel.node.replaceChildren(...reel.target);delete reel.node.dataset.swampAnalog;}
    for(const node of reel.target){delete node.dataset.slotLanding;node.style.removeProperty('--slot-landing-duration');}
    delete reel.node.dataset.reelPhase;
   }
   if(session===s)session=null;
  }
 }
 const api=window.VaultAnalogReels={play,cancel,configure,reset:()=>Object.keys(overrides).forEach(k=>delete overrides[k]),defaults:DEFAULTS,
  isBusy:()=>!!session,
  getConfig:()=>({...DEFAULTS,...overrides}),
  inspect:()=>({active:session?{game:'swamp',roundId:session.roundId,elapsed:performance.now()-session.started,gridSettled:session.settled,reels:session.reels.map(r=>({column:r.column,stage:r.stage,position:Number(r.animation?.currentTime)||0,duration:r.total,acceleration:r.accel,fullSpeed:r.full,deceleration:r.slow}))}:null,events:history.slice()}),
  on(hook,fn){if(!hooks.has(hook))hooks.set(hook,new Set());hooks.get(hook).add(fn);return ()=>hooks.get(hook).delete(fn);}
 };
 VaultSymbolDrop.registerRenderer('swamp',api);
 if(window.SLOT_ANIMATION_DEBUG===true){
  const panel=document.createElement('details');panel.className='swamp-analog-debug';const title=document.createElement('summary');title.textContent='SWAMP REEL DEBUG';panel.append(title);
  for(const [key,value] of Object.entries(DEFAULTS)){const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.type='number';input.step=key.includes('Amount')||key.includes('Strength')?'.01':'1';input.value=value;input.onchange=()=>configure({[key]:input.value});label.append(input);panel.append(label);}document.body.append(panel);
 }
})();
