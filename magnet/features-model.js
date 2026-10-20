/* MAGNET v2: ordinary ways, one preplanned Wheel event, separate value-collect Chamber.
   Legacy model stays intact for earned v1 Overdrive and queued checkpoints. */
const MAGNET_FEATURE_CONFIG=Object.freeze({version:2,wheelChance:.11,scatterChance:.016,wildChance:.008,
 waysPayScale:.202,maxWinX:10000,bonusSpins:6,maxBonusSpins:12,
 chargeLadder:[1,2,5,10],chargeThresholds:[0,2,5,9],
 bonusChances:{value:.055,charge:.004,magnet:.025,super:.003,flip:.002,overload:.001},
 values:[{x:2,w:60},{x:5,w:25},{x:10,w:10},{x:15,w:3},{x:25,w:1.5},{x:50,w:.5}],
 wheel:[{id:'boost',title:'MULTIPLIER BOOST',w:30},{id:'upgrade',title:'SYMBOL UPGRADE',w:20},{id:'wilds',title:'EXTRA WILDS',w:15},{id:'pull',title:'MAGNET PULL',w:15},{id:'respin',title:'RESPIN',w:10},{id:'mystery',title:'MYSTERY TRANSFORM',w:10}]
});
const MAGNET_V2_MODEL=(()=>{
 const L=typeof module!=='undefined'&&module.exports?require('./model.js'):MAGNET_MODEL;
 const C=MAGNET_FEATURE_CONFIG,B=L.config,copy=x=>JSON.parse(JSON.stringify(x)),rnd=L.round;
 const regular=id=>B.symbols.some(s=>s.id===id),pick=(a,rng)=>{let n=rng()*a.reduce((s,t)=>s+t.w,0);return a.find(t=>(n-=t.w)<0)||a.at(-1);};
 const shuffle=(a,rng)=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
 const normal=rng=>pick(B.symbols.map(s=>({...s,w:s.weight})),rng).id;
 const piece=(symbol,uid,extra={})=>({uid,symbol,polarity:0,...extra});
 function generate(rng){const g=Array.from({length:25},(_,uid)=>{const n=rng();return piece(n<C.scatterChance?'scatter':n<C.scatterChance+C.wildChance?'wild':normal(rng),uid);});if(rng()<C.wheelChance)g[12]=piece('wheel',12);return g;}
 function evaluate(g,multiplier=1){
  // Reuse established 243-ways rules; regular identity and Wild alone determine wins.
  const plain=g.map(t=>({...t,symbol:['wheel','scatter'].includes(t.symbol)?'scatter':t.symbol}));
  const e=L.evaluate(plain),scale=C.waysPayScale/B.waysPayScale*multiplier;
  const wins=e.wins.map(w=>({...w,winX:rnd(w.winX*scale)}));return {wins,winX:rnd(wins.reduce((s,w)=>s+w.winX,0)),scatters:g.filter(t=>t.symbol==='scatter').length};
 }
 function basePlan(seed){
  const rng=L.seeded(L.seedFor(seed,200)),initialGrid=generate(rng),g=copy(initialGrid),events=[];let wheel=null,multiplier=1;
  if(g.some(t=>t.symbol==='wheel')){
   const outcome=pick(C.wheel,rng),changes=[];wheel={...outcome,sector:C.wheel.findIndex(t=>t.id===outcome.id),multiplier:1,changes};
   const eligible=()=>g.flatMap((t,i)=>regular(t.symbol)?[i]:[]);
   const replace=(i,symbol)=>{changes.push({cell:i,from:g[i].symbol,to:symbol});g[i].symbol=symbol;};
   if(outcome.id==='boost'){multiplier=rng()<.85?2:3;wheel.multiplier=multiplier;wheel.description=`BASE SPIN WIN ×${multiplier}`;}
   if(outcome.id==='upgrade'){for(const i of eligible().filter(i=>g[i].symbol==='copper'))replace(i,'energy');wheel.description=`${changes.length} COPPER → ENERGY`;}
   if(outcome.id==='wilds'){for(const i of shuffle(eligible(),rng).slice(0,2))replace(i,'wild');wheel.description=`${changes.length} EXTRA WILDS`;}
   if(outcome.id==='mystery'){const symbol=rng()<.5?'plasma':'crystal';for(const i of shuffle(eligible(),rng).slice(0,4))replace(i,symbol);wheel.description=`${changes.length} SYMBOLS → ${symbol.toUpperCase()}`;}
   if(outcome.id==='respin'){for(const i of eligible())replace(i,normal(rng));wheel.description='ONE FREE RESPIN · SPECIAL SYMBOLS HELD';}
   if(outcome.id==='pull'){
    const swaps=[];for(const col of [0,1,2]){const from=[col,20+col].find(i=>['reactor','crystal','plasma'].includes(g[i].symbol)),to=[5+col,10+col,15+col].find(i=>regular(g[i].symbol));if(from!==undefined&&to!==undefined){[g[from],g[to]]=[g[to],g[from]];swaps.push({from,to});}}
    wheel.swaps=swaps;wheel.description=swaps.length?`${swaps.length} PREMIUM SYMBOLS PULLED INTO PAYING ROWS`:'NO PREMIUM SYMBOLS IN BUFFERS · FIELD UNCHANGED';
   }
   events.push({kind:'wheel',...wheel});
  }
  return {index:0,bonus:false,initialGrid,finalGrid:g,wheel,events,phaseCount:0,phases:[],orderedEffects:[],fieldPower:1,...evaluate(g,multiplier)};
 }
 const power=charge=>C.chargeLadder[C.chargeThresholds.reduce((level,n,i)=>charge>=n?i:level,0)];
 function bonusPlan(seed,index,previous){
  const rng=L.seeded(L.seedFor(seed,200+index)),g=Array.from({length:25},(_,uid)=>{
   const held=previous.held.find(t=>t.cell===uid);if(held)return piece('value',uid,{valueX:held.valueX});
   let n=rng();for(const [id,chance] of Object.entries(C.bonusChances)){if(n<chance)return piece(id,uid,id==='value'?{valueX:pick(C.values,rng).x}:{});n-=chance;}return piece('empty',uid);
  }),initialGrid=copy(g),events=[];let charge=previous.charge,collect=0,extension=0;
  const flipCells=g.flatMap((t,i)=>t.symbol==='flip'?[i]:[]);
  if(flipCells.length){for(const t of g)if(t.symbol==='value')t.valueX=Math.min(10000,t.valueX*2**flipCells.length);events.push({kind:'double',sources:flipCells});}
  const chargeCells=g.flatMap((t,i)=>['charge','overload'].includes(t.symbol)?[i]:[]);
  charge=Math.min(9,charge+chargeCells.reduce((n,i)=>n+(g[i].symbol==='overload'?2:1),0));
  if(chargeCells.length&&C.bonusSpins+previous.extensions<C.maxBonusSpins)extension=1;
  if(chargeCells.length)events.push({kind:'charge',sources:chargeCells,power:power(charge),extension});
  for(const [cell,t] of g.entries())if(['magnet','super'].includes(t.symbol)){
   const targets=g.flatMap((v,i)=>v.symbol==='value'&&(t.symbol==='super'||Math.abs(i%5-cell%5)+Math.abs(Math.floor(i/5)-Math.floor(cell/5))<=2)?[i]:[]),valueX=rnd(targets.reduce((n,i)=>n+g[i].valueX,0));
   collect+=valueX;events.push({kind:'collect',source:cell,super:t.symbol==='super',targets,valueX});for(const i of targets)g[i]=piece('empty',i);
  }
  const remaining=previous.remaining-1+extension,held=g.flatMap((t,i)=>t.symbol==='value'?[{cell:i,valueX:t.valueX}]:[]);
  const sweepX=remaining===0?rnd(held.reduce((n,t)=>n+t.valueX,0)):0;if(remaining===0)events.push({kind:'sweep',targets:held.map(t=>t.cell),valueX:sweepX});
  const collectedX=rnd(Math.min(10000,previous.collectedX+collect+sweepX));
  if(remaining===0)for(let i=0;i<g.length;i++)if(g[i].symbol==='value')g[i]=piece('empty',i);
  return {index,bonus:true,initialGrid,finalGrid:copy(g),events,phaseCount:0,phases:[],orderedEffects:[],fieldPower:power(charge),wins:[],winX:0,scatters:0,
   chamber:{remaining,held:remaining?held:[],collectedX,charge,power:power(charge),extensions:previous.extensions+extension},collectedThisSpin:rnd(collect),sweepX};
 }
 const active=r=>r?.version===2&&r.status==='CHAMBER'&&r.bonus.remaining>0;
 function start({seed,bet,roundId}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(bet)||bet<=0||bet>1e9||typeof roundId!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid MAGNET v2 round');
  const p=basePlan(seed),triggered=p.scatters>=3,totalWinX=Math.min(C.maxWinX,p.winX);
  return {version:2,roundId,seed,bet,step:0,status:triggered?'CHAMBER':'SETTLED',bonus:{triggered,remaining:triggered?C.bonusSpins:0,index:0,power:1,collectedX:0,charge:0,held:[],extensions:0},spins:[p],magneticPlan:p,totalWinX,payout:triggered?0:rnd(totalWinX*bet),result:triggered?'chamber':'base'};
 }
 function advance(previous){if(!active(previous))return previous;const r=copy(previous);r.step++;const p=bonusPlan(r.seed,r.step,r.bonus);r.spins.push(p);r.magneticPlan=p;r.bonus={triggered:true,index:r.step,...p.chamber};
  if(!r.bonus.remaining){r.status='SETTLED';r.totalWinX=rnd(Math.min(C.maxWinX,r.spins[0].winX+r.bonus.collectedX*r.bonus.power));r.payout=rnd(r.totalWinX*r.bet);r.result='chamber-complete';}return r;
 }
 function validate(v){try{if(v?.version!==2||!Number.isInteger(v.step)||v.step<0||v.step>C.maxBonusSpins)return null;let r=start(v);for(let i=0;i<v.step;i++){if(!active(r))return null;r=advance(r);}return JSON.stringify(L.canonical(r))===JSON.stringify(L.canonical(v))?r:null;}catch{return null;}}
 return {config:C,generate,evaluate,basePlan,bonusPlan,start,advance,active,validate,power};
})();
const MAGNET_ROUNDS={validate:v=>v?.version===2?MAGNET_V2_MODEL.validate(v):MAGNET_MODEL.validate(v),active:r=>r?.version===2?MAGNET_V2_MODEL.active(r):MAGNET_MODEL.active(r)};
if(typeof module!=='undefined')module.exports=MAGNET_V2_MODEL;
