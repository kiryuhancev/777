/* v4: one immutable evaluation per spin. Rendering never chooses destinations or money. */
const CRITTER_MODEL=(()=>{
 const legacy=typeof module!=='undefined'&&module.exports?require('./model-v1.js'):CRITTER_MODEL_V1;
 const previous=typeof module!=='undefined'&&module.exports?require('./model-v2.js'):CRITTER_MODEL_V2;
 const v3=typeof module!=='undefined'&&module.exports?require('./model-v3.js'):CRITTER_MODEL_V3;
 const C=typeof module!=='undefined'&&module.exports?require('./config.js'):CRITTER_CONFIG;
 const copy=v=>JSON.parse(JSON.stringify(v)),round=n=>Math.round(n*1e6)/1e6;
 const regular=id=>C.symbols.some(s=>s.id===id);
 function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 const channel=(seed,n)=>(seed^Math.imul(n+1,0x9e3779b9))>>>0;
 function pick(a,rng){let n=rng()*a.reduce((s,t)=>s+t.w,0);return a.find(t=>(n-=t.w)<0)||a.at(-1);}

 const neighbours=i=>[i%5?i-1:null,i%5<4?i+1:null,i>=5?i-5:null,i<20?i+5:null].filter(n=>n!==null);
 function validGrid(g){return Array.isArray(g)&&g.length===25&&new Set(g.map(t=>t?.uid)).size===25&&g.every(t=>Number.isInteger(t.uid)&&t.uid>=0&&t.uid<10000&&(regular(t.symbol)||['wild','scatter'].includes(t.symbol)));}
 function components(grid,allowed){const seen=new Set(),out=[];for(let i=0;i<25;i++)if(!seen.has(i)&&allowed(grid[i])){const q=[i],group=[];seen.add(i);while(q.length){const j=q.pop();group.push(j);for(const k of neighbours(j))if(!seen.has(k)&&allowed(grid[k])){seen.add(k);q.push(k);}}out.push(group.sort((a,b)=>a-b));}return out;}
 function evaluate(grid,{bonus=false}={}){
  if(!validGrid(grid))throw Error('Invalid Critter grid');const wins=[];
  const payout=(s,n)=>s.pays[C.sizes.reduce((v,size,i)=>n>=size?i:v,0)];
  for(const s of C.symbols)for(const positions of components(grid,t=>t.symbol===s.id||t.symbol==='wild'))if(positions.length>=C.minCluster&&positions.some(i=>grid[i].symbol===s.id))wins.push({symbol:s.id,size:positions.length,positions,rawWinX:payout(s,positions.length),winX:round(payout(s,positions.length)*C.payScale)});
  for(const positions of components(grid,t=>t.symbol==='wild'))if(positions.length>=C.minCluster&&!wins.some(w=>positions.some(i=>w.positions.includes(i))))wins.push({symbol:'wild',size:positions.length,positions,rawWinX:payout(C.symbols.at(-1),positions.length),winX:round(payout(C.symbols.at(-1),positions.length)*C.payScale)});
  for(const w of wins){w.multiplier=bonus?Math.max(1,w.positions.filter(i=>grid[i].symbol==='wild').reduce((n,i)=>n+(grid[i].multiplier||1),0)):1;w.winX=round(w.winX*w.multiplier);}
  const positions=[...new Set(wins.flatMap(w=>w.positions))];return {wins,winX:round(wins.reduce((n,w)=>n+w.winX,0)),rawWinX:round(wins.reduce((n,w)=>n+w.rawWinX,0)),activeWilds:positions.filter(i=>grid[i].symbol==='wild').map(i=>grid[i].uid)};
 }

 function spinPlan(seed,{bonus=false,persistentWilds=[],scatterBoost=false,spinIndex=0}={}){
  const rng=seeded(seed),chance=bonus?0:C.scatterChance*(scatterBoost?C.features.scatterMultiplier:1);
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
  const result=evaluate(finalGrid,{bonus}),winningIds=new Set(result.activeWilds.map(i=>finalGrid[i].wildId)),allWilds=[...after,...newWilds];
  const multiplierUpdates=allWilds.filter(w=>winningIds.has(w.id)).map(w=>({wildId:w.id,from:w.multiplier,to:w.multiplier*2}));
  const persistentWildsAfter=allWilds.map(w=>({...w,multiplier:winningIds.has(w.id)?w.multiplier*2:w.multiplier}));
  const updatedGrid=copy(finalGrid);for(const w of persistentWildsAfter)updatedGrid[w.cell]=tile(w,w.cell);
  return {initialGrid,persistentWildsBefore:before,movements,newWilds:copy(newWilds),finalGrid,updatedGrid,wins:result.wins,activeWilds:result.activeWilds,multiplierUpdates,persistentWildsAfter,rawWinX:result.rawWinX,winX:result.winX,scatters:finalGrid.filter(t=>t.symbol==='scatter').length};
 }
 function emptyBase(){const grid=Array.from({length:25},(_,uid)=>({uid,symbol:C.symbols[uid%C.symbols.length].id}));return {initialGrid:copy(grid),persistentWildsBefore:[],movements:[],newWilds:[],finalGrid:copy(grid),updatedGrid:copy(grid),wins:[],activeWilds:[],multiplierUpdates:[],persistentWildsAfter:[],rawWinX:0,winX:0,scatters:0};}
 function cost(r){return r.version&&r.version<3?r.bet:round(r.bet*(r.purchaseType?C.features[r.purchaseType+'Cost']:r.scatterBoost?C.features.boostCost:1));}
 function start({seed,bet,roundId,purchaseType=null,scatterBoost=false}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(bet)||bet<=0||bet>1e9||typeof roundId!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid Critter round');
  if(![null,'bonus','super'].includes(purchaseType)||typeof scatterBoost!=='boolean'||purchaseType&&scatterBoost)throw Error('Invalid Critter feature');
  const base=purchaseType?emptyBase():spinPlan(channel(seed,0),{scatterBoost}),triggered=!!purchaseType||base.scatters>=3;let bonus=null;
  if(triggered){
   const spins=[],kind=purchaseType==='super'||!purchaseType&&base.scatters>=4?'super':'normal',spinCount=kind==='super'?C.bonus.superSpins:C.bonus.spins;let persistentWilds=[],bonusWin=0;
   for(let i=0;i<spinCount;i++){
    const plan=spinPlan(channel(seed,i+2),{bonus:true,persistentWilds,spinIndex:i});spins.push(plan);bonusWin=round(bonusWin+plan.winX);persistentWilds=copy(plan.persistentWildsAfter);
   }
   bonus={kind,spins,spinCount,persistentWilds,winX:bonusWin};
  }
  const winX=round(Math.min(C.maxWinX,base.winX+(bonus?.winX||0)));
  return {version:4,purchaseType,scatterBoost,cost:cost({bet,purchaseType,scatterBoost}),roundId,gameId:'critter',seed,bet,status:'SETTLED',base,bonus,winX,payout:round(winX*bet),result:bonus?'persistent-running-wilds':'base'};
 }
 function canonical(v){return v&&typeof v==='object'?Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
 function validate(v){try{if(v?.version===1)return legacy.validate(v);if(v?.version===2)return previous.validate(v);if(v?.version===3)return v3.validate(v);if(v?.version!==4||v.gameId!=='critter'||v.status!=='SETTLED')return null;const r=start(v);return JSON.stringify(canonical(r))===JSON.stringify(canonical(v))?r:null;}catch{return null;}}
 // Only stable business boundaries are persisted. No animation/frame/timeout state.
 function progress(r,{nextSpin=0,baseDone=false,complete=false}={}){
  if(r?.version!==4)return null;
  const count=r.bonus?.spinCount||0;if(!Number.isInteger(nextSpin)||nextSpin<0||nextSpin>count||typeof baseDone!=='boolean'||typeof complete!=='boolean'||nextSpin>0&&!baseDone||complete&&(!baseDone||nextSpin!==count))return null;
  const p=nextSpin?r.bonus.spins[nextSpin-1]:null;
  return {version:4,roundId:r.roundId,nextSpin,baseDone,complete,remainingFreeSpins:count-nextSpin,persistentWilds:complete?[]:copy(p?.persistentWildsAfter||[]),bonusTotalX:round((r.bonus?.spins||[]).slice(0,nextSpin).reduce((n,s)=>n+s.winX,0))};
 }
 function validateProgress(r,v){try{if(!v||v.roundId!==r?.roundId)return null;const p=progress(r,v);return p&&JSON.stringify(canonical(p))===JSON.stringify(canonical(v))?p:null;}catch{return null;}}
 return {legacy,previous,v3,cost,config:C,seeded,channel,evaluate,spinPlan,start,validate,canonical,validGrid,round,progress,validateProgress};
})();
if(typeof module!=='undefined')module.exports=CRITTER_MODEL;
