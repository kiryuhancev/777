/* Pure seeded cluster cascade plan. No DOM, wallet, account inputs or animation RNG. */
const CRITTER_MODEL_V3=(()=>{
 const legacy=typeof module!=='undefined'&&module.exports?require('./model-v1.js'):CRITTER_MODEL_V1;
 const previous=typeof module!=='undefined'&&module.exports?require('./model-v2.js'):CRITTER_MODEL_V2;
 const C=typeof module!=='undefined'&&module.exports?require('./config-v3.js'):CRITTER_CONFIG_V3;
 const copy=v=>JSON.parse(JSON.stringify(v)),round=n=>Math.round(n*1e6)/1e6;
 const regular=id=>C.symbols.some(s=>s.id===id);
 function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 const channel=(seed,n)=>(seed^Math.imul(n+1,0x9e3779b9))>>>0;
 function pick(a,rng){let n=rng()*a.reduce((s,t)=>s+t.w,0);return a.find(t=>(n-=t.w)<0)||a.at(-1);}
 function shuffle(a,rng){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
 const neighbours=i=>[i%5?i-1:null,i%5<4?i+1:null,i>=5?i-5:null,i<20?i+5:null].filter(n=>n!==null);
 function validGrid(g){return Array.isArray(g)&&g.length===25&&new Set(g.map(t=>t?.uid)).size===25&&g.every(t=>Number.isInteger(t.uid)&&t.uid>=0&&t.uid<10000&&(regular(t.symbol)||['wild','scatter'].includes(t.symbol)));}
 function components(grid,allowed){const seen=new Set(),out=[];for(let i=0;i<25;i++)if(!seen.has(i)&&allowed(grid[i])){const q=[i],group=[];seen.add(i);while(q.length){const j=q.pop();group.push(j);for(const k of neighbours(j))if(!seen.has(k)&&allowed(grid[k])){seen.add(k);q.push(k);}}out.push(group.sort((a,b)=>a-b));}return out;}
 function evaluate(grid){
  if(!validGrid(grid))throw Error('Invalid Critter grid');const wins=[];
  const payout=(s,n)=>s.pays[C.sizes.reduce((v,size,i)=>n>=size?i:v,0)];
  for(const s of C.symbols)for(const positions of components(grid,t=>t.symbol===s.id||t.symbol==='wild'))if(positions.length>=C.minCluster&&positions.some(i=>grid[i].symbol===s.id))wins.push({symbol:s.id,size:positions.length,positions,rawWinX:payout(s,positions.length),winX:round(payout(s,positions.length)*C.payScale)});
  for(const positions of components(grid,t=>t.symbol==='wild'))if(positions.length>=C.minCluster&&!wins.some(w=>positions.some(i=>w.positions.includes(i))))wins.push({symbol:'wild',size:positions.length,positions,rawWinX:payout(C.symbols.at(-1),positions.length),winX:round(payout(C.symbols.at(-1),positions.length)*C.payScale)});
  for(const w of wins){w.multiplier=Math.max(1,...w.positions.filter(i=>grid[i].symbol==='wild').map(i=>grid[i].multiplier||1));w.winX=round(w.winX*w.multiplier);}
  const positions=[...new Set(wins.flatMap(w=>w.positions))];return {wins,winX:round(wins.reduce((n,w)=>n+w.winX,0)),rawWinX:round(wins.reduce((n,w)=>n+w.rawWinX,0)),activeWilds:positions.filter(i=>grid[i].symbol==='wild').map(i=>grid[i].uid)};
 }
 function cascade(seed,{bonus=false,persistentWilds=[],scatterBoost=false}={}){
  const rng=seeded(seed);let uid=0;
  const scatterChance=bonus?0:C.scatterChance*(scatterBoost?C.features.scatterMultiplier:1);
  const draw=()=>{const n=rng(),symbol=n<scatterChance?'scatter':n<scatterChance+C.wildChance?'wild':pick(C.symbols.map(s=>({id:s.id,w:s.weight})),rng).id;return {uid:uid++,symbol,...(symbol==='wild'?{multiplier:1}:{})};};
  let grid=Array.from({length:25},draw);shuffle(grid.flatMap((t,i)=>regular(t.symbol)?[i]:[]),rng);for(const i of persistentWilds)grid[i].symbol='wild';for(const t of grid)if(t.symbol==='wild')t.multiplier=1;const drops=[];
  const initialGrid=copy(grid),steps=[];let rawWinX=0,winX=0,limitReached=false;
  for(let index=0;index<C.maxCascades;index++){
   const result=evaluate(grid);if(!result.wins.length)break;rawWinX=round(rawWinX+result.rawWinX);winX=round(winX+result.winX);
   const step={index,grid:copy(grid),...result,removed:[],gravityGrid:null,moves:[],nextGrid:null};
   if(index===C.maxCascades-1){limitReached=true;steps.push(step);break;}
   const remove=new Set(result.wins.flatMap(w=>w.positions).filter(i=>regular(grid[i].symbol)).map(i=>grid[i].uid));step.removed=[...remove];
   const next=copy(grid).map(t=>remove.has(t.uid)?null:t);
   for(const t of next)if(t&&result.activeWilds.includes(t.uid))t.multiplier=(t.multiplier||1)*2;
   // Wilds remain anchors during gravity. Scatter identities survive and may fall.
   for(let col=0;col<5;col++){
    let bottom=4;while(bottom>=0){if(next[bottom*5+col]?.symbol==='wild'){bottom--;continue;}let top=bottom;while(top>=0&&next[top*5+col]?.symbol!=='wild')top--;const cells=[];for(let row=top+1;row<=bottom;row++)cells.push(row*5+col);const pieces=cells.map(i=>next[i]).filter(Boolean);const missing=cells.length-pieces.length;const filled=[...Array.from({length:missing},draw),...pieces];cells.forEach((i,n)=>next[i]=filled[n]);bottom=top;}
   }
   step.gravityGrid=copy(next);const destinations=new Set();
   for(const wild of result.activeWilds.sort((a,b)=>a-b)){
    const from=next.findIndex(t=>t.uid===wild),eligible=next.flatMap((t,i)=>regular(t.symbol)&&!destinations.has(i)?[i]:[]);
    if(!eligible.length)continue;const to=eligible[Math.floor(rng()*eligible.length)];[next[from],next[to]]=[next[to],next[from]];destinations.add(to);step.moves.push({uid:wild,from,to});
   }
   step.nextGrid=copy(next);steps.push(step);grid=next;
  }
  return {initialGrid,steps,finalGrid:copy(grid),rawWinX,winX,scatters:grid.filter(t=>t.symbol==='scatter').length,limitReached,drops};
 }
 function start({seed,bet,roundId,purchaseType=null,scatterBoost=false}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(bet)||bet<=0||bet>1e9||typeof roundId!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid Critter round');
  if(![null,'bonus','super'].includes(purchaseType)||typeof scatterBoost!=='boolean'||purchaseType&&scatterBoost)throw Error('Invalid Critter feature');
  const base=purchaseType?emptyBase():cascade(channel(seed,0),{scatterBoost}),triggered=!!purchaseType||base.scatters>=3;let bonus=null;
  if(triggered){
   const spins=[],kind=purchaseType==='super'||!purchaseType&&base.scatters>=4?'super':'normal',spinCount=kind==='super'?C.bonus.superSpins:C.bonus.spins;let persistentWilds=[],bonusWin=0;
   for(let i=0;i<spinCount;i++){
    const plan=cascade(channel(seed,i+2),{bonus:true,persistentWilds});spins.push(plan);bonusWin=round(bonusWin+plan.winX);
    persistentWilds=plan.finalGrid.flatMap((t,pos)=>t.symbol==='wild'?[pos]:[]);
   }
   bonus={kind,spins,spinCount,persistentWilds,winX:bonusWin};
  }
  const winX=round(Math.min(C.maxWinX,base.winX+(bonus?.winX||0)));
  return {version:3,purchaseType,scatterBoost,cost:cost({bet,purchaseType,scatterBoost}),roundId,gameId:'critter',seed,bet,status:'SETTLED',base,bonus,winX,payout:round(winX*bet),result:bonus?'persistent-wilds':'base'};
 }
 function emptyBase(){const grid=Array.from({length:25},(_,uid)=>({uid,symbol:C.symbols[uid%C.symbols.length].id}));return {initialGrid:copy(grid),steps:[],finalGrid:copy(grid),rawWinX:0,winX:0,scatters:0,limitReached:false,drops:[]};}
 function cost(r){return r.version&&r.version<3?r.bet:round(r.bet*(r.purchaseType?C.features[r.purchaseType+'Cost']:r.scatterBoost?C.features.boostCost:1));}
 function canonical(v){return v&&typeof v==='object'?Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
 function validate(v){try{if(v?.version===1)return legacy.validate(v);if(v?.version===2)return previous.validate(v);if(v?.version!==3||v.gameId!=='critter'||v.status!=='SETTLED')return null;const r=start(v);return JSON.stringify(canonical(r))===JSON.stringify(canonical(v))?r:null;}catch{return null;}}
 return {legacy,previous,cost,config:C,seeded,channel,evaluate,cascade,start,validate,canonical,validGrid,round};
})();
if(typeof module!=='undefined')module.exports=CRITTER_MODEL_V3;
