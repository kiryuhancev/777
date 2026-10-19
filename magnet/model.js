/* Pure deterministic lattice model. Animation consumes a completed plan; it has no RNG. */
const MAGNET_MODEL=(()=>{
 const C=typeof module!=='undefined'&&module.exports?require('./config.js'):MAGNET_CONFIG;
 const copy=x=>JSON.parse(JSON.stringify(x)),round=n=>Math.round(n*1e6)/1e6;
 const regular=id=>C.symbols.some(s=>s.id===id),mobile=t=>regular(t.symbol);
 const xy=i=>[i%5,Math.floor(i/5)],distance=(a,b)=>Math.abs(a%5-b%5)+Math.abs(Math.floor(a/5)-Math.floor(b/5));
 function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function seedFor(seed,index){let x=(seed^Math.imul(index+1,0x9e3779b9))>>>0;x=Math.imul(x^x>>>16,0x85ebca6b);return(x^x>>>13)>>>0;}
 function powerAt(index){return C.overdrive.fieldPower[index-1]||1;}
 function generate(rng,{bonus=false,power=1}={}){
  const boost=bonus?1+(power-1)*C.overdrive.specialBoostPerPower:1;
  return Array.from({length:25},(_,uid)=>{
   let n=rng(),symbol=null;
   for(const [id,chance] of Object.entries(C.specials)){const p=id==='scatter'?(bonus?C.overdrive.scatterChance:chance):chance*boost;if(n<p){symbol=id;break;}n-=p;}
   if(!symbol){let w=rng()*C.symbols.reduce((n,s)=>n+s.weight,0);symbol=C.symbols.find(s=>(w-=s.weight)<0)?.id||C.symbols.at(-1).id;}
   const p=rng(),polarity=regular(symbol)||symbol==='wild'?(p<C.polarity.positive?1:p<C.polarity.positive+C.polarity.negative?-1:0):0;
   return {uid,symbol,polarity};
  });
 }
 function toward(from,source,outward=false){const [x,y]=xy(from),[sx,sy]=xy(source),dx=x-sx,dy=y-sy;
  if(!dx&&!dy)return null;const sign=outward?1:-1;
  const nx=x+(Math.abs(dx)>=Math.abs(dy)&&dx?Math.sign(dx)*sign:0),ny=y+(Math.abs(dx)<Math.abs(dy)||!dx?Math.sign(dy)*sign:0);
  return nx>=0&&nx<5&&ny>=0&&ny<5?ny*5+nx:null;
 }
 function resolveMagnetic(initialGrid,{seed=1,power=1,bonus=false}={}){
  if(!validGrid(initialGrid))throw Error('Invalid MAGNET grid');
  const rng=seeded(seed),grid=copy(initialGrid),orderedEffects=[],phases=[];
  const radiusUpgrade=bonus&&power>=C.overdrive.radiusUpgradeAt?1:0;
  const activation=Math.min(1,C.specialActivationChance+(bonus?(power-1)*.04:0));
  let budget=bonus&&power>=C.overdrive.extraPhaseAt?2:1;
  for(let phase=0;phase<Math.min(budget,C.maxMagneticPhases);phase++){
   const beforeGrid=copy(grid),effects=[],moved=new Set();let cancelled=0,moves=0;
   const locate=uid=>grid.findIndex(t=>t.uid===uid);
   function swap(from,to,source,kind){
    if(to===null||from===to||moves>=C.maxMovesPerPhase||!mobile(grid[from])||!mobile(grid[to])||moved.has(grid[from].uid)||moved.has(grid[to].uid)){cancelled++;return false;}
    const a=grid[from],b=grid[to],sourceCell=locate(source);
    [grid[from],grid[to]]=[b,a];moved.add(a.uid);moved.add(b.uid);moves++;
    effects.push({phase,kind,source,sourceCell,target:a.uid,from,to,swap:b.uid});return true;
   }
   function force(id,kind,radius,outward=false){
    for(const actor of [...grid].filter(t=>t.symbol===id).sort((a,b)=>a.uid-b.uid)){
     if(rng()>activation)continue;const at=locate(actor.uid);
     const targets=grid.map((t,i)=>({t,i,d:distance(at,i)})).filter(o=>mobile(o.t)&&o.d>0&&o.d<=radius&&(id!=='wild'||actor.polarity!==0&&o.t.polarity===-actor.polarity)).sort((a,b)=>a.d-b.d||a.t.uid-b.t.uid);
     for(const o of targets){const from=locate(o.t.uid);if(!outward&&distance(from,at)<=1)continue;swap(from,toward(from,at,outward),actor.uid,kind);}
    }
   }
   force('gravity','gravity',C.gravityRadius+radiusUpgrade);
   force('wild','wild',C.wildRadius+radiusUpgrade);
   force('repulsor','repulsor',C.repulsorRadius+radiusUpgrade,true);
   for(const kind of ['attract','repel'])for(const actor of [...grid].filter(t=>mobile(t)&&t.polarity!==0).sort((a,b)=>a.uid-b.uid)){
    const from=locate(actor.uid);if(moved.has(actor.uid)||rng()>C.normalInteractionChance)continue;
    const partner=grid.map((t,i)=>({t,i,d:distance(from,i)})).filter(o=>o.t.uid!==actor.uid&&mobile(o.t)&&o.t.polarity!==0&&o.d<=C.normalRadius+radiusUpgrade&&(kind==='attract'?o.t.polarity===-actor.polarity:o.t.polarity===actor.polarity)&&!(kind==='attract'&&o.d<=1)).sort((a,b)=>a.d-b.d||a.t.uid-b.t.uid)[0];
    if(partner)swap(from,toward(from,partner.i,kind==='repel'),partner.t.uid,kind);
   }
   for(const actor of [...grid].filter(t=>t.symbol==='flip').sort((a,b)=>a.uid-b.uid)){
    if(rng()>activation)continue;const sourceCell=locate(actor.uid),changes=[];
    grid.forEach((t,i)=>{if(t.polarity!==0&&distance(i,sourceCell)<=C.flipRadius){changes.push({uid:t.uid,cell:i,from:t.polarity,to:-t.polarity});t.polarity=-t.polarity;}});
    effects.push({phase,kind:'flip',source:actor.uid,sourceCell,changes});
   }
   const chain=grid.filter(t=>t.symbol==='chain').sort((a,b)=>a.uid-b.uid).find(()=>rng()<Math.min(1,C.chainActivationChance+(bonus?(power-1)*.05:0)));
   if(chain&&budget<C.maxMagneticPhases&&phase===budget-1){budget++;effects.push({phase,kind:'chain',source:chain.uid,sourceCell:locate(chain.uid)});}
   phases.push({index:phase,beforeGrid,effects,finalGrid:copy(grid),cancelled});orderedEffects.push(...effects);
  }
  return {seed,fieldPower:power,initialGrid:copy(initialGrid),orderedEffects,phases,phaseCount:phases.length,finalGrid:copy(grid)};
 }
 function validGrid(g){return Array.isArray(g)&&g.length===25&&new Set(g.map(t=>t?.uid)).size===25&&g.every(t=>Number.isInteger(t?.uid)&&t.uid>=0&&t.uid<25&&(regular(t.symbol)||Object.hasOwn(C.specials,t.symbol))&&[-1,0,1].includes(t.polarity)&&((regular(t.symbol)||t.symbol==='wild')||t.polarity===0));}
 function evaluate(grid){
  if(!validGrid(grid))throw Error('Invalid final grid');const wins=[];
  for(const s of C.symbols){let ways=1,length=0,positions=[];
   for(let c=0;c<5;c++){const matches=C.payRows.map(r=>r*5+c).filter(i=>grid[i].symbol===s.id||grid[i].symbol==='wild');if(!matches.length)break;ways*=matches.length;length++;positions.push(...matches);}
   if(length>=3)wins.push({symbol:s.id,length,ways,positions,winX:round(s.pays[length-3]*ways*C.waysPayScale)});
  }
  // All-Wild prefixes must not pay once for each regular symbol.
  let pureWays=1,pureLength=0;for(let c=0;c<5;c++){const n=C.payRows.filter(r=>grid[r*5+c].symbol==='wild').length;if(!n)break;pureWays*=n;pureLength++;}
  if(pureLength>=3){
   for(const w of wins)if(w.length===pureLength)w.winX=round(w.winX-C.symbols.find(s=>s.id===w.symbol).pays[pureLength-3]*pureWays*C.waysPayScale);
   const positions=grid.flatMap((t,i)=>t.symbol==='wild'&&C.payRows.includes(Math.floor(i/5))&&i%5<pureLength?[i]:[]);
   wins.push({symbol:'wild',length:pureLength,ways:pureWays,positions,winX:round(C.symbols.at(-1).pays[pureLength-3]*pureWays*C.waysPayScale)});
  }
  return {wins:wins.filter(w=>w.winX>0),winX:round(wins.reduce((n,w)=>n+w.winX,0)),scatters:grid.filter(t=>t.symbol==='scatter').length};
 }
 function plan(seed,index=0){const power=index?powerAt(index):1,bonus=index>0,drawSeed=seedFor(seed,index),initialGrid=generate(seeded(drawSeed),{bonus,power}),p=resolveMagnetic(initialGrid,{seed:seedFor(drawSeed,7),power,bonus});return {...p,index,bonus,...evaluate(p.finalGrid)};}
 const active=r=>r?.status==='OVERDRIVE'&&r.bonus.remaining>0;
 function start({seed,bet,roundId}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(bet)||bet<=0||bet>1e9||typeof roundId!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(roundId))throw Error('Invalid MAGNET round');
  const p=plan(seed),triggered=p.scatters>=C.overdrive.scatterCount,totalWinX=Math.min(C.maxWinX,p.winX),terminal=!triggered||totalWinX===C.maxWinX;
  return {version:1,roundId,seed,bet,step:0,status:terminal?'SETTLED':'OVERDRIVE',bonus:{triggered,remaining:terminal?0:C.overdrive.spins,index:0,power:1},spins:[p],magneticPlan:p,totalWinX,payout:terminal?round(totalWinX*bet):0,result:terminal?'base':'overdrive'};
 }
 function advance(previous){if(!active(previous))return previous;const r=copy(previous);r.step++;const p=plan(r.seed,r.step);r.spins.push(p);r.magneticPlan=p;r.totalWinX=round(Math.min(C.maxWinX,r.totalWinX+p.winX));r.bonus={...r.bonus,remaining:r.bonus.remaining-1,index:r.step,power:powerAt(r.step)};
  if(r.bonus.remaining===0||r.totalWinX===C.maxWinX){r.status='SETTLED';r.bonus.remaining=0;r.payout=round(r.totalWinX*r.bet);r.result=r.totalWinX===C.maxWinX?'max-win':'overdrive-complete';}return r;
 }
 function canonical(v){return v&&typeof v==='object'?Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
 function validate(value){try{if(!value||value.version!==1||!Number.isInteger(value.step)||value.step<0||value.step>C.overdrive.spins)return null;let r=start(value);for(let i=0;i<value.step;i++){if(!active(r))return null;r=advance(r);}return JSON.stringify(canonical(r))===JSON.stringify(canonical(value))?r:null;}catch{return null;}}
 return {seeded,seedFor,generate,resolveMagnetic,evaluate,plan,start,advance,active,validate,validGrid,round,canonical,config:C};
})();
if(typeof module!=='undefined')module.exports=MAGNET_MODEL;
