/* Version2: SHOW TICKET => one full-reel feature. Financial evaluator stays strict left-to-right. */
const BIG_TOP_MODEL_V2=(()=>{
 const C=BIG_TOP_CONFIG_V2,V=BIG_TOP_MODEL_V1,copy=x=>JSON.parse(JSON.stringify(x)),money=V.money,seeded=V.seeded,weighted=V.weighted,potential=V.potential;
 function evaluate(grid){const wins=[];let pure={length:0,ways:1,weighted:1,positions:[]};
  for(let r=0;r<6;r++){const hits=grid[r].map((s,i)=>({...s,i})).filter(s=>s.symbol==='wild');if(!hits.length)break;pure.length++;pure.ways*=hits.length;pure.weighted*=hits.reduce((n,s)=>n+(s.multiplier||1),0);pure.positions.push(...hits.map(s=>[r,s.i]));}
  for(const symbol of C.symbols){let length=0,ways=1,weightedWays=1,positions=[];for(let r=0;r<6;r++){const hits=grid[r].map((s,i)=>({...s,i})).filter(s=>s.symbol===symbol.id||s.symbol==='wild');if(!hits.length)break;length++;ways*=hits.length;weightedWays*=hits.reduce((n,s)=>n+(s.symbol==='wild'?(s.multiplier||1):1),0);positions.push(...hits.map(s=>[r,s.i]));}if(length<3)continue;
   // All-Wild paths have one owner (highest-paying fish), never eleven payouts.
   if(pure.length>=length){ways-=pure.ways;weightedWays-=pure.weighted;}if(ways>0)wins.push({symbol:symbol.id,length,ways,weightedWays,positions,winX:money(symbol.pay[length-3]*weightedWays*C.payoutScale)});
  }
  if(pure.length>=3){const symbol=C.symbols.at(-1);wins.push({symbol:'wild',length:pure.length,ways:pure.ways,weightedWays:pure.weighted,positions:pure.positions,winX:money(symbol.pay[pure.length-3]*pure.weighted*C.payoutScale)});}
  return {wins,winX:money(wins.reduce((n,w)=>n+w.winX,0))};
 }

 function makePlan(rng,options={}){const legacy=V.makePlan(rng,options),seen=new Set(),features=[];for(const old of legacy.featurePlan){if(seen.has(old.reel))continue;seen.add(old.reel);features.push({...old,full:true,triggerCell:old.row});}features.sort((a,b)=>a.reel-b.reel);
 const initialGrid=copy(legacy.initialGrid);for(let r=0;r<6;r++)for(let row=0;row<initialGrid[r].length;row++)if(initialGrid[r][row].symbol==='curtain')initialGrid[r][row].symbol=C.symbols[(r+row)%C.symbols.length].id;
 for(const f of features){if(!f.carried)initialGrid[f.reel][f.triggerCell].symbol='show_ticket';else initialGrid[f.reel].forEach(s=>Object.assign(s,{symbol:'wild',multiplier:f.multiplier,curtainId:f.id,clown:f.winner}));}
 const finalGrid=copy(initialGrid);for(const f of features)for(let row=0;row<finalGrid[f.reel].length;row++)finalGrid[f.reel][row]={...finalGrid[f.reel][row],symbol:'wild',multiplier:f.multiplier,curtainId:f.id,clown:f.winner};
 const bonus=!!options.bonus,meterAfter=(options.armed?0:options.meter||0)+(bonus?features.filter(f=>!f.carried).length*C.applause.full:0),armedAfter=bonus&&meterAfter>=C.applause.threshold;
 return {...legacy,initialGrid,featurePlan:features,curtainTriggers:features.filter(f=>!f.carried).map(f=>({reelIndex:f.reel,triggerCell:f.triggerCell,winner:f.winner,resultType:f.multiplier===1?'WILD':'MULTIPLIER',multiplier:f.multiplier})),finalGrid,...(options.purchase?{wins:[],winX:0}:evaluate(finalGrid)),encoreAfter:features.filter(f=>f.encore&&!f.carried).map(f=>({...f,remaining:1})),meterAfter,armedAfter};}
 function start(args){if(args.version===1)return V.start(args);const {seed,bet,roundId,purchase=false}=args;if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isFinite(bet)||bet<=0||bet>1e9||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid round');const rng=seeded(seed),base=makePlan(rng,{purchase}),spins=[];let encore=[],meter=0,armed=false,total=0;for(let i=0;i<base.freeSpins;i++){const p=makePlan(rng,{bonus:true,encore,meter,armed});spins.push(p);encore=p.encoreAfter;meter=p.meterAfter;armed=p.armedAfter;total=money(total+p.winX);}const baseWinX=Math.min(C.maxWinX,base.winX),bonusWinX=money(Math.min(C.maxWinX-baseWinX,total)),winX=money(baseWinX+bonusWinX);return {version:2,roundId,seed,bet,purchase:!!purchase,cost:money(bet*(purchase?C.buyMultiplier:1)),status:'SETTLED',base,bonus:spins.length?{spinCount:spins.length,spins,totalWinX:bonusWinX}:null,baseWinX,bonusWinX,winX,payout:money(winX*bet),result:spins.length?'the-big-show':winX?'win':'lose'};}
 function stable(x){return JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
 function validate(r){try{if(r?.version===1)return V.validate(r);if(r?.version!==2)return null;const c=start(r);return stable(c)===stable(r)?c:null;}catch{return null;}}
 return {seeded,weighted,potential,evaluate,makePlan,start,validate,progress:V.progress,validProgress:V.validProgress,money};
})();
