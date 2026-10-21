/* Pure seeded round plans. Presentation has no RNG, pay evaluation or financial writes. */
const BIG_TOP_MODEL=(()=>{
 const C=BIG_TOP_CONFIG,copy=x=>JSON.parse(JSON.stringify(x)),money=n=>Math.round(n*1e6)/1e6;
 function seeded(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function weighted(weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return weights.length-1;}
 const potential=heights=>heights.reduce((a,b)=>a*b,1);
 function evaluate(grid){const wins=[];let pure={length:0,ways:1,weighted:1,positions:[]};
  for(let r=0;r<6;r++){const hits=grid[r].map((s,i)=>({...s,i})).filter(s=>s.symbol==='wild');if(!hits.length)break;pure.length++;pure.ways*=hits.length;pure.weighted*=hits.reduce((n,s)=>n+(s.multiplier||1),0);pure.positions.push(...hits.map(s=>[r,s.i]));}
  for(const symbol of C.symbols){let length=0,ways=1,weightedWays=1,positions=[];for(let r=0;r<6;r++){const hits=grid[r].map((s,i)=>({...s,i})).filter(s=>s.symbol===symbol.id||s.symbol==='wild');if(!hits.length)break;length++;ways*=hits.length;weightedWays*=hits.reduce((n,s)=>n+(s.symbol==='wild'?(s.multiplier||1):1),0);positions.push(...hits.map(s=>[r,s.i]));}if(length<3)continue;
   // All-Wild paths have one owner (highest-paying fish), never eleven payouts.
   if(pure.length>=length){ways-=pure.ways;weightedWays-=pure.weighted;}if(ways>0)wins.push({symbol:symbol.id,length,ways,weightedWays,positions,winX:money(symbol.pay[length-3]*weightedWays*C.payoutScale)});
  }
  if(pure.length>=3){const symbol=C.symbols.at(-1);wins.push({symbol:'wild',length:pure.length,ways:pure.ways,weightedWays:pure.weighted,positions:pure.positions,winX:money(symbol.pay[pure.length-3]*pure.weighted*C.payoutScale)});}
  return {wins,winX:money(wins.reduce((n,w)=>n+w.winX,0))};
 }
 function makePlan(rng,{bonus=false,encore=[],meter=0,armed=false,purchase=false,heights=null}={}){
  const reelHeights=heights?[...heights]:Array.from({length:6},()=>2+weighted(C.rowWeights,rng));
  // Encore occupies a deterministic admissible cell when row geometry changes.
  for(let r=0;r<6;r++)reelHeights[r]=Math.max(reelHeights[r],encore.filter(e=>e.reel===r&&!e.full).length);
  const occupied=Array.from({length:6},()=>new Set()),carried=encore.map(e=>{let row=Math.min(e.row,reelHeights[e.reel]-1);if(occupied[e.reel].has(row))row=Array.from({length:reelHeights[e.reel]},(_,i)=>i).find(i=>!occupied[e.reel].has(i));occupied[e.reel].add(row);return {...e,row,encore:false,remaining:0,carried:true};});
  const initialGrid=reelHeights.map((height,reel)=>Array.from({length:height},(_,row)=>({symbol:C.symbols[weighted(C.symbols.map(s=>s.weight),rng)].id,uid:reel+':'+row})));
  const featurePlan=[];for(let reel=0;reel<6;reel++){
   const existing=carried.filter(e=>e.reel===reel);const full=existing.some(e=>e.full)||!existing.length&&rng()<(bonus?C.bonusFullReelChance:C.fullReelChance);
   if(full){const e=existing.find(e=>e.full);featurePlan.push(e||curtain(reel,0,true));initialGrid[reel].forEach(s=>s.symbol='curtain');continue;}
   for(let row=0;row<reelHeights[reel];row++){const e=existing.find(e=>e.row===row);if(e||rng()<(bonus?C.bonusCurtainChance:C.curtainChance)){featurePlan.push(e||curtain(reel,row,false));initialGrid[reel][row].symbol='curtain';}}
   const choices=initialGrid[reel].flatMap((s,row)=>s.symbol!=='curtain'?[row]:[]);if(choices.length&&(purchase&&reel<3||!purchase&&rng()<C.scatterChance)){initialGrid[reel][choices[Math.floor(rng()*choices.length)]].symbol='scatter';}
  }
  function curtain(reel,row,full){const multiplier=C.multiplierValues[weighted(bonus?C.bonusMultiplierWeights:C.multiplierWeights,rng)];return {id:'curtain:'+reel+':'+row,reel,row,full,winner:rng()<.5?'bombo':'skinny',multiplier,encore:bonus&&multiplier>1&&rng()<C.encoreChance,remaining:0};}
  if(bonus&&armed&&!featurePlan.length){const reel=Math.floor(rng()*6),row=initialGrid[reel].findIndex(s=>s.symbol!=='scatter');if(row>=0){featurePlan.push(curtain(reel,row,false));initialGrid[reel][row].symbol='curtain';}}
  // Purchase trigger is presentation only: guaranteed exactly three tent Scatters, no extra wager/win.
  if(purchase)for(let r=0;r<3;r++){const row=0;featurePlan.splice(0,featurePlan.length,...featurePlan.filter(f=>f.reel!==r));initialGrid[r].forEach(s=>{if(s.symbol==='curtain'||s.symbol==='scatter')s.symbol='ten';});initialGrid[r][row].symbol='scatter';}
  const finalGrid=copy(initialGrid);for(const f of featurePlan){for(let row=0;row<reelHeights[f.reel];row++)if(f.full||row===f.row)finalGrid[f.reel][row]={...finalGrid[f.reel][row],symbol:'wild',multiplier:f.multiplier,curtainId:f.id,clown:f.winner};}
  const scatters=finalGrid.filter(reel=>reel.some(s=>s.symbol==='scatter')).length;
  const paid=purchase?{wins:[],winX:0}:evaluate(finalGrid);
  const contribution=featurePlan.filter(f=>!f.carried).reduce((n,f)=>n+(f.full?C.applause.full:f.multiplier>1?C.applause.multiplier:C.applause.normal),0);
  const meterAfter=(armed?0:meter)+contribution,armedAfter=meterAfter>=C.applause.threshold;
  return {reelHeights,potentialWays:potential(reelHeights),initialGrid,featurePlan,finalGrid,...paid,scatters,freeSpins:C.freeSpins[scatters]||0,encoreBefore:copy(encore),encoreAfter:featurePlan.filter(f=>f.encore&&!f.carried).map(f=>({...f,remaining:1})),meterBefore:meter,meterAfter,armedBefore:armed,armedAfter,standingOvation:bonus&&armed,purchase};
 }
 function start({seed,bet,roundId,purchase=false}){if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isFinite(bet)||bet<=0||bet>1e9||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid round');const rng=seeded(seed),base=makePlan(rng,{purchase}),count=base.freeSpins,spins=[];let encore=[],meter=0,armed=false,total=0;
  for(let i=0;i<count;i++){const p=makePlan(rng,{bonus:true,encore,meter,armed});spins.push(p);encore=p.encoreAfter;meter=p.meterAfter;armed=p.armedAfter;total=money(total+p.winX);}
  const baseWinX=Math.min(C.maxWinX,base.winX),bonusWinX=Math.min(C.maxWinX-baseWinX,total),winX=money(baseWinX+bonusWinX);
  return {version:1,roundId,seed,bet,purchase:!!purchase,cost:money(bet*(purchase?C.buyMultiplier:1)),status:'SETTLED',base,bonus:count?{spinCount:count,spins,totalWinX:bonusWinX}:null,baseWinX,bonusWinX,winX,payout:money(winX*bet),result:count?'the-big-show':winX?'win':'lose'};
 }
 function stable(x){return JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
 function validate(r){try{if(r?.version!==1)return null;const canonical=start(r);return stable(canonical)===stable(r)?canonical:null;}catch{return null;}}
 function progress(r,{baseDone=false,introDone=false,nextSpin=0,complete=false}={}){if(!r)return null;nextSpin=Math.max(0,Math.min(r.bonus?.spinCount||0,Math.trunc(nextSpin)||0));baseDone=!!baseDone||!!introDone||nextSpin>0;introDone=!!introDone||nextSpin>0;const plans=r.bonus?.spins.slice(0,nextSpin)||[];const last=plans.at(-1);return {version:1,roundId:r.roundId,baseDone:!!baseDone,introDone:!!introDone,nextSpin,totalWinX:money(Math.min(r.bonusWinX,plans.reduce((n,p)=>n+p.winX,0))),encore:last?.encoreAfter||[],meter:last?.meterAfter||0,armed:last?.armedAfter||false,complete:!!complete&&!!baseDone&&(!r.bonus||nextSpin===r.bonus.spinCount)};}
 function validProgress(r,p){if(!r||!p||p.roundId!==r.roundId)return progress(r);const c=progress(r,p);return stable(c)===stable(p)?c:progress(r);}
 return {seeded,weighted,evaluate,makePlan,start,validate,progress,validProgress,money,potential};
})();
