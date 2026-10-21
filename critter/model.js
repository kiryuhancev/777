/* v6: same random draws/weights; deterministic Scatter column normalization. */
const CRITTER_MODEL=(()=>{
 const v5=typeof module!=='undefined'&&module.exports?require('./model-v5.js'):CRITTER_MODEL_V5;
 const C=typeof module!=='undefined'&&module.exports?require('./config.js'):CRITTER_CONFIG;
 const {round,canonical}=v5,copy=v=>JSON.parse(JSON.stringify(v));
 function pick(a,rng){let n=rng()*a.reduce((s,t)=>s+t.w,0);return a.find(t=>(n-=t.w)<0)||a.at(-1);}
 function generatePlan(seed,{bonus=false,persistentWilds=[],scatterBoost=false,spinIndex=0}={}){
  const rng=v5.seeded(seed),chance=bonus?0:C.scatterChance*(scatterBoost?C.features.scatterMultiplier:1);
  const draw=uid=>{const n=rng(),symbol=n<chance?'scatter':n<chance+C.wildChance?'wild':pick(C.symbols.map(s=>({id:s.id,w:s.weight})),rng).id;return {uid,symbol,...(symbol==='wild'?{multiplier:1}:{})};};
  const rawGrid=Array.from({length:25},(_,i)=>draw(i)),before=copy(persistentWilds);
  // Draw every cell using the original PRNG and weights, then apply persistent anchors.
  // New landed Wilds on unoccupied cells are reserved and are never overwritten by a runner.
  const oldCells=new Set(before.map(w=>w.cell)),newWilds=bonus?rawGrid.flatMap((t,cell)=>t.symbol==='wild'&&!oldCells.has(cell)?[{id:`wild_${spinIndex}_${cell}`,cell,multiplier:1}]:[]):[];
  const reserved=new Set(newWilds.map(w=>w.cell)),initialGrid=copy(rawGrid);
  const tile=(wild,cell)=>({uid:cell,symbol:'wild',wildId:wild.id,multiplier:wild.multiplier});
  for(const w of before)initialGrid[w.cell]=tile(w,w.cell);
  for(const w of newWilds)initialGrid[w.cell]=tile(w,w.cell);
  const finalGrid=copy(initialGrid),movements=[],after=copy(before),occupied=new Set(oldCells);
  // A cyclic permutation is the deterministic fallback if there are no free landing cells.
  // Simultaneous vacating avoids overlap even on a completely Wild field.
  let free=Array.from({length:25},(_,i)=>i).filter(i=>!occupied.has(i)&&!reserved.has(i));
  if(before.length&&free.length===0){
   const all=after.length>1?after:[...after,newWilds[0]],shift=1+Math.floor(rng()*(all.length-1)),positions=all.map(w=>w.cell);
   all.forEach((w,i)=>{const from=w.cell;w.cell=positions[(i+shift)%all.length];if(i<before.length)movements.push({wildId:w.id,uid:from,from,to:w.cell});else w.landedCell=from;});
   for(const w of [...after,...newWilds])finalGrid[w.cell]=tile(w,w.cell);
  }else{
   for(const w of after){
    free=Array.from({length:25},(_,i)=>i).filter(i=>!occupied.has(i)&&!reserved.has(i));
    const from=w.cell,to=free[Math.floor(rng()*free.length)];
    [finalGrid[from],finalGrid[to]]=[finalGrid[to],finalGrid[from]];
    occupied.delete(from);occupied.add(to);w.cell=to;
    movements.push({wildId:w.id,uid:from,from,to});
   }
  }
  // Cell identity is per spin; stable Wild identity is independent of the underlying symbol tile.
  finalGrid.forEach((t,i)=>t.uid=i);
  return {initialGrid,persistentWildsBefore:before,movements,newWilds:copy(newWilds),finalGrid};
 }
 function normalizeScatters(grid,seed){
  const out=copy(grid),used=new Set(),extra=[];
  out.forEach((t,i)=>{if(t.symbol==='scatter'){if(used.has(i%5))extra.push(i);else used.add(i%5);}});
  for(const from of extra){const columns=Array.from({length:5},(_,i)=>i).filter(i=>!used.has(i));if(columns.length){const col=columns[v5.channel(seed,from+50)%columns.length],to=col+5*(v5.channel(seed,from+80)%5);[out[from],out[to]]=[out[to],out[from]];used.add(col);}else{const regular=out.find(t=>C.symbols.some(s=>s.id===t.symbol));out[from]={uid:from,symbol:regular?.symbol||C.symbols[0].id};}}
  out.forEach((t,i)=>t.uid=i);return out;
 }
 // Sum the multiplier of each selected Wild within each way; never multiply Wilds.
 function evaluate(grid,{bonus=false,kind='normal'}={}){
  if(!v5.v4.validGrid(grid))throw Error('Invalid Critter grid');
  const wins=[],scale=C.payScales[bonus?kind:'base'];
  const metrics=columns=>{
   const counts=columns.map(a=>a.length),ways=counts.reduce((a,b)=>a*b,1);
   const weighted=bonus?columns.reduce((sum,a,c)=>sum+a.reduce((n,i)=>n+(grid[i].symbol==='wild'?(grid[i].multiplier||1):0),0)*counts.reduce((n,v,k)=>k===c?n:n*v,1),0)+columns.reduce((n,a)=>n*a.filter(i=>grid[i].symbol!=='wild').length,1):ways;
   return {ways,weighted};
  };
  for(const symbol of C.symbols){
   const columns=[];
   for(let c=0;c<5;c++){const matches=Array.from({length:5},(_,r)=>r*5+c).filter(i=>grid[i].symbol===symbol.id||grid[i].symbol==='wild');if(!matches.length)break;columns.push(matches);}
   const length=columns.length;if(length<3)continue;
   const all=metrics(columns),pure=metrics(columns.map(a=>a.filter(i=>grid[i].symbol==='wild')));
   // Exclude all-Wild ways from ordinary symbols. They pay once as the best symbol below.
   const ways=all.ways-pure.ways,weightedWays=all.weighted-pure.weighted;if(!ways)continue;
   const positions=columns.flatMap((a,c)=>a.filter(i=>grid[i].symbol!=='wild'||columns.some((other,k)=>k!==c&&other.some(j=>grid[j].symbol===symbol.id))));
   const rawWinX=round(symbol.waysPays[length-3]*weightedWays);
   wins.push({symbol:symbol.id,length,ways,weightedWays,positions,rawWinX,winX:round(rawWinX*scale),multiplier:round(weightedWays/ways)});
  }
  const pure=[];for(let c=0;c<5;c++){const a=Array.from({length:5},(_,r)=>r*5+c).filter(i=>grid[i].symbol==='wild');if(!a.length)break;pure.push(a);}
  if(pure.length>=3){const m=metrics(pure),rawWinX=round(C.symbols.at(-1).waysPays[pure.length-3]*m.weighted);wins.push({symbol:'wild',length:pure.length,ways:m.ways,weightedWays:m.weighted,positions:pure.flat(),rawWinX,winX:round(rawWinX*scale),multiplier:round(m.weighted/m.ways)});}
  return {wins,winX:round(wins.reduce((n,w)=>n+w.winX,0)),rawWinX:round(wins.reduce((n,w)=>n+w.rawWinX,0)),activeWilds:[...new Set(wins.flatMap(w=>w.positions))].filter(i=>grid[i].symbol==='wild').map(i=>grid[i].uid)};
 }
 function spinPlan(seed,options={}){
  const p=generatePlan(seed,options);p.newWilds=p.newWilds||[];p.multiplierUpdates=[];p.persistentWildsAfter=[];p.scatters=p.finalGrid.filter(t=>t.symbol==='scatter').length;
  if(!options.bonus){p.initialGrid=normalizeScatters(p.initialGrid,seed);p.finalGrid=copy(p.initialGrid);p.scatters=p.finalGrid.filter(t=>t.symbol==='scatter').length;}
  Object.assign(p,evaluate(p.finalGrid,options));p.updatedGrid=copy(p.finalGrid);
  if(options.bonus){
   const active=new Set(p.activeWilds.map(i=>p.finalGrid[i].wildId));
   const wilds=[...p.persistentWildsBefore,...p.newWilds].map(w=>{const cell=p.finalGrid.findIndex(t=>t.wildId===w.id),t=p.finalGrid[cell];return {...w,cell,multiplier:t.multiplier||1};});
   p.multiplierUpdates=wilds.filter(w=>active.has(w.id)).map(w=>({wildId:w.id,from:w.multiplier,to:Math.min(C.wildMultiplierCap,w.multiplier*2)}));
   p.persistentWildsAfter=wilds.map(w=>({...w,multiplier:active.has(w.id)?Math.min(C.wildMultiplierCap,w.multiplier*2):w.multiplier}));
   for(const w of p.persistentWildsAfter)p.updatedGrid[w.cell].multiplier=w.multiplier;
  }
  return p;
 }
 function cost(r){return r.version&&r.version<6?v5.cost(r):round(r.bet*(r.purchaseType?C.features[r.purchaseType+'Cost']:r.scatterBoost?C.features.boostCost:1));}
 function emptyBase(){const grid=Array.from({length:25},(_,uid)=>({uid,symbol:C.symbols[uid%C.symbols.length].id}));return {initialGrid:copy(grid),persistentWildsBefore:[],movements:[],newWilds:[],finalGrid:copy(grid),updatedGrid:copy(grid),wins:[],activeWilds:[],multiplierUpdates:[],persistentWildsAfter:[],rawWinX:0,winX:0,scatters:0};}
 function start({seed,bet,roundId,purchaseType=null,scatterBoost=false}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(bet)||bet<=0||bet>1e9||typeof roundId!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId)||![null,'bonus','super'].includes(purchaseType)||typeof scatterBoost!=='boolean'||purchaseType&&scatterBoost)throw Error('Invalid Critter round');
  const base=purchaseType?emptyBase():spinPlan(v5.channel(seed,0),{scatterBoost});let bonus=null;
  if(purchaseType||base.scatters>=3){const kind=purchaseType==='super'||!purchaseType&&base.scatters>=4?'super':'normal',spinCount=kind==='super'?C.bonus.superSpins:C.bonus.spins,spins=[];let persistentWilds=[];
   for(let i=0;i<spinCount;i++){const p=spinPlan(v5.channel(seed,i+2),{bonus:true,persistentWilds,spinIndex:i,kind});spins.push(p);persistentWilds=copy(p.persistentWildsAfter);}
   bonus={kind,spins,spinCount,persistentWilds,winX:round(spins.reduce((n,p)=>n+p.winX,0))};
  }
  const winX=round(Math.min(C.maxWinX,base.winX+(bonus?.winX||0))),r={version:6,wildMultiplierCap:C.wildMultiplierCap,purchaseType,scatterBoost,roundId,gameId:C.id,seed,bet,status:'SETTLED',base,bonus,winX,payout:round(winX*bet),result:bonus?'persistent-running-wilds':'base'};r.cost=cost(r);return r;
 }
 function validate(r){try{if(r?.version<6)return v5.validate(r);if(r?.version!==6)return null;const expected=start(r);return JSON.stringify(canonical(expected))===JSON.stringify(canonical(r))?expected:null;}catch{return null;}}
 function progress(r,options){if(r?.version!==6)return v5.progress(r,options);const p=v5.v4.progress({...r,version:4},options);return p?{...p,version:6}:null;}
 function validateProgress(r,p){if(r?.version!==6)return v5.validateProgress(r,p);try{const e=progress(r,p);return e&&JSON.stringify(canonical(e))===JSON.stringify(canonical(p))?e:null;}catch{return null;}}
 return {...v5,v5,config:C,normalizeScatters,evaluate,spinPlan,cost,start,validate,progress,validateProgress};
})();
if(typeof module!=='undefined')module.exports=CRITTER_MODEL;
