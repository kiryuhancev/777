/* Version2: SHOW TICKET => one full-reel feature. Financial evaluator stays strict left-to-right. */
const BIG_TOP_MODEL=(()=>{
 const C=BIG_TOP_CONFIG,V=BIG_TOP_MODEL_V2,copy=x=>JSON.parse(JSON.stringify(x)),money=V.money,seeded=V.seeded,weighted=V.weighted,potential=V.potential;
 function evaluate(grid){const wins=[];let pure={length:0,ways:1,weighted:1,positions:[]};
  for(let r=0;r<6;r++){const hits=grid[r].map((s,i)=>({...s,i})).filter(s=>s.symbol==='wild');if(!hits.length)break;pure.length++;pure.ways*=hits.length;pure.weighted*=hits.reduce((n,s)=>n+(s.multiplier||1),0);pure.positions.push(...hits.map(s=>[r,s.i]));}
  for(const symbol of C.symbols){let length=0,ways=1,weightedWays=1,positions=[];for(let r=0;r<6;r++){const hits=grid[r].map((s,i)=>({...s,i})).filter(s=>s.symbol===symbol.id||s.symbol==='wild');if(!hits.length)break;length++;ways*=hits.length;weightedWays*=hits.reduce((n,s)=>n+(s.symbol==='wild'?(s.multiplier||1):1),0);positions.push(...hits.map(s=>[r,s.i]));}if(length<3)continue;
   // All-Wild paths have one owner (highest-paying fish), never eleven payouts.
   if(pure.length>=length){ways-=pure.ways;weightedWays-=pure.weighted;}if(ways>0)wins.push({symbol:symbol.id,length,ways,weightedWays,positions,winX:money(symbol.pay[length-3]*weightedWays*C.payoutScale)});
  }
  if(pure.length>=3){const symbol=C.symbols.at(-1);wins.push({symbol:'wild',length:pure.length,ways:pure.ways,weightedWays:pure.weighted,positions:pure.positions,winX:money(symbol.pay[pure.length-3]*pure.weighted*C.payoutScale)});}
  return {wins,winX:money(wins.reduce((n,w)=>n+w.winX,0))};
 }

 function makePlan(rng,options={}){
  const before=copy(options.persistent||[]),encore=before.map(c=>({id:c.curtainId,reel:c.reelIndex,row:0,full:true,winner:c.winnerClownId,multiplier:c.multiplier,encore:false,remaining:0}));
  const p=V.makePlan(rng,{...options,encore}),session=options.bonusSessionId||null,index=options.spinIndex||0;
  const features=p.featurePlan.map(f=>({...f,id:f.carried?f.id:(session?session+':'+index+':':'base:')+f.id,encore:false}));
  const finalGrid=copy(p.initialGrid);for(const f of features)for(let row=0;row<finalGrid[f.reel].length;row++)finalGrid[f.reel][row]={...finalGrid[f.reel][row],symbol:'wild',multiplier:f.multiplier,curtainId:f.id,clown:f.winner};
  const rawPaid=options.purchase?{wins:[],winX:0}:evaluate(finalGrid),paid=options.bonus?{wins:rawPaid.wins.map(w=>({...w,winX:money(w.winX*C.bonusPayoutScale)})),winX:money(rawPaid.winX*C.bonusPayoutScale)}:rawPaid,playing=new Set(rawPaid.wins.filter(w=>w.winX>0).flatMap(w=>w.positions.map(pos=>pos[0])));
  const after=copy(before);if(options.bonus)for(const f of features)if(!f.carried&&playing.has(f.reel))after.push({curtainId:f.id,reelIndex:f.reel,winnerClownId:f.winner,multiplier:f.multiplier,persistent:true,bonusSessionId:session});after.sort((a,b)=>a.reelIndex-b.reelIndex);
  return {...p,featurePlan:features,finalGrid,...paid,encoreBefore:[],encoreAfter:[],persistentBefore:before,persistentAfter:after,bonusSessionId:session,curtainStates:features.map(f=>({curtainId:f.id,reelIndex:f.reel,participates:playing.has(f.reel),persistent:!!options.bonus&&(f.carried||playing.has(f.reel)),visualState:f.carried&&!playing.has(f.reel)?'CLOSED_HIGHLIGHTED':'OPEN_WINNER'}))};
 }
 function start(args){if(args.version===1||args.version===2)return V.start(args);const {seed,bet,roundId,purchase=false}=args;if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isFinite(bet)||bet<=0||bet>1e9||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid round');const rng=seeded(seed),base=makePlan(rng,{purchase}),spins=[];let persistent=[],meter=0,armed=false,total=0;for(let i=0;i<base.freeSpins;i++){const p=makePlan(rng,{bonus:true,persistent,meter,armed,bonusSessionId:roundId,spinIndex:i});spins.push(p);persistent=p.persistentAfter;meter=p.meterAfter;armed=p.armedAfter;total=money(total+p.winX);}const baseWinX=Math.min(C.maxWinX,base.winX),bonusWinX=money(Math.min(C.maxWinX-baseWinX,total)),winX=money(baseWinX+bonusWinX);return {version:3,roundId,seed,bet,purchase:!!purchase,cost:money(bet*(purchase?C.buyMultiplier:1)),status:'SETTLED',base,bonus:spins.length?{spinCount:spins.length,spins,totalWinX:bonusWinX}:null,baseWinX,bonusWinX,winX,payout:money(winX*bet),result:spins.length?'the-big-show':winX?'win':'lose'};}
 function stable(x){return JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
 function validate(r){try{if(r?.version===1||r?.version===2)return V.validate(r);if(r?.version!==3)return null;const c=start(r);return stable(c)===stable(r)?c:null;}catch{return null;}}
 function progress(r,o={}){const p=V.progress(r,o);if(r?.version!==3)return p;const last=r.bonus?.spins[p.nextSpin-1];return {...p,persistentCurtains:copy(last?.persistentAfter||[])};}
 function validProgress(r,p){if(r?.version!==3)return V.validProgress(r,p);const c=progress(r,p||{});return stable(c)===stable(p)?c:progress(r);}
 return {seeded,weighted,potential,evaluate,makePlan,start,validate,progress,validProgress,money};
})();
