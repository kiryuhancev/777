/* Pure deterministic math. No DOM, account/balance inputs or outcome compensation. */
const VAULT_HEIST_MODEL=(()=>{
 const C=typeof VAULT_HEIST_CONFIG!=='undefined'?VAULT_HEIST_CONFIG:require('./config.js'),clone=x=>JSON.parse(JSON.stringify(x)),round=n=>Math.round(n*1e6)/1e6;
 function seeded(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function weighted(list,rng){let x=rng()*list.reduce((n,s)=>n+s.weight,0);for(const s of list){x-=s.weight;if(x<0)return s;}return list.at(-1);}
 function generate(stage,rng,boost=false){
  const bonus=stage>=0,profile=C.symbols.map(s=>({...s,weight:s.weight*(bonus?(s.tier===2?C.profileHighBoost[stage]:s.tier===0?1/(1+stage*C.profileLowDecay):1):1)}));
  const grid=Array.from({length:5},()=>Array.from({length:4},()=>weighted(profile,rng).id));
  for(let c=0;c<5;c++){
   if(!bonus&&rng()<C.scatterChance*(boost?C.scatterBoost.symbolMultiplier:1))grid[c][Math.floor(rng()*4)]='scatter';
   for(let r=0;r<4;r++)if(grid[c][r]!=='scatter'&&rng()<C.wildChance*(bonus?C.wildBoost[stage]:1))grid[c][r]='wild';
  }
  const marks=[],effects=[];
  if(stage===0)for(let c=0;c<5;c++)for(let r=0;r<4;r++)if(rng()<C.scanChance)marks.push(c*4+r);
  if(stage===1)for(let c=0;c<5;c++)for(let r=0;r<4;r++)if(grid[c][r]==='wild'&&rng()<C.accessChance){const nc=c===4?3:c+1;if(C.symbols.find(s=>s.id===grid[nc][r])?.tier===0){grid[nc][r]='wild';effects.push({type:'access',reel:nc,row:r});}}
  if(stage===2&&grid.some(col=>col.includes('wild'))&&rng()<C.breachChance){const c=Math.floor(rng()*5);grid[c].fill('wild');effects.push({type:'breach',reel:c});}
  if(stage===5)for(let c=0;c<5;c++)for(let r=0;r<4;r++)if(rng()<C.grandChance)grid[c][r]='grand';
  return {grid,marks,effects};
 }
 function evaluate(scene,stage=-1,rng=()=>.999){
  const grid=scene.grid,marks=new Set(scene.marks||[]),wins=[];let winX=0;
  const list=[...C.symbols,...(stage===5?[{id:'grand',tier:2,pays:C.grandPays}]:[])];
  for(const s of list){let length=0,ways=1,weightedWays=1,wildWays=1,wildWeighted=1;const positions=[];
   for(let c=0;c<5;c++){
    const matches=grid[c].map((id,r)=>({id,r})).filter(x=>x.id===s.id||x.id==='wild');if(!matches.length)break;
    length++;ways*=matches.length;weightedWays*=matches.reduce((n,x)=>n+(marks.has(c*4+x.r)?C.scanMultiplier:1),0);
    const wilds=matches.filter(x=>x.id==='wild');wildWays*=wilds.length;wildWeighted*=wilds.reduce((n,x)=>n+(marks.has(c*4+x.r)?C.scanMultiplier:1),0);
    positions.push(...matches.map(x=>c*4+x.r));
   }
   if(length>=3&&ways>wildWays){const x=(weightedWays-wildWeighted)*s.pays[length-3];wins.push({id:s.id,length,ways:ways-wildWays,x,positions,tier:s.tier});winX+=x;}
  }
  let wildLength=0,pureWays=1;for(const col of grid){const n=col.filter(x=>x==='wild').length;if(!n)break;wildLength++;pureWays*=n;}
  if(wildLength>=3){const x=pureWays*C.symbols.at(-1).pays[wildLength-3];winX+=x;wins.push({id:'wild',length:wildLength,ways:pureWays,x,positions:[],tier:2});}
  let tokens=0,artifact=1;
  if(stage===3)for(const w of wins.filter(w=>w.tier===2))for(const pos of new Set(w.positions))if(rng()<C.lootChance)tokens+=C.lootTokenX;
  if(stage===4&&grid.some(col=>col.includes('artifact'))&&winX>0&&rng()<C.artifactChance)artifact=C.artifactMultipliers[Math.floor(rng()*C.artifactMultipliers.length)];
  let riskDelta=0,alarm=false,disabled=false;
  if(stage>=0&&stage<5){alarm=rng()<C.alarmChance;disabled=rng()<C.overrideChance&&grid.some(col=>col.includes('override'));riskDelta=(alarm?C.alarmAdd:0)-(disabled?C.overrideReduce:0);}
  return {...scene,wins,winX:round((winX*C.waysPayScale*artifact+tokens)*(stage>=0?C.stageMultipliers[stage]:1)),tokens,artifact,riskDelta,alarm,disabled,scatters:grid.filter(col=>col.includes('scatter')).length};
 }
 const active=r=>r&&['STAGE','CHOICE'].includes(r.status);
 function risk(r){return r.stage>=5?0:round(Math.max(C.minRisk,Math.min(C.maxRisk,C.alarmRisks[r.stage]*(C.purchases.find(o=>o.id===r.purchaseType)?.riskMultiplier??1)+r.alarmModifier)));}
 function cap(r){if(r.baseWinX+r.lootX>=C.maxWinX){r.lootX=Math.max(0,C.maxWinX-r.baseWinX);r.status='SETTLED';r.result='max-win';}return r;}
 function finalize(r,result){r.status='SETTLED';r.result=result;r.payout=round((r.baseWinX+(result==='alarm'?0:r.lootX))*r.bet);return r;}
 function start({seed,bet,roundId,version=1,scatterBoost=false,purchaseType=null}){
  const offer=purchaseType?C.purchases.find(o=>o.id===purchaseType):null;if(purchaseType&&!offer)throw Error('Invalid Heist purchase');if(offer&&scatterBoost)throw Error('Boost does not apply to purchases');
  const rng=seeded(seed),outcome=offer?{grid:Array.from({length:5},(_,c)=>Array.from({length:4},(_,r)=>C.symbols[(c*4+r)%C.symbols.length].id)),marks:[],effects:[],wins:[],winX:0,tokens:0,artifact:1,riskDelta:0,alarm:false,disabled:false,scatters:0}:evaluate(generate(-1,rng,scatterBoost),-1,rng),baseWinX=Math.min(C.maxWinX,outcome.winX),trigger=!!offer||outcome.scatters>=3;
  const r={version:1,roundId,seed:seed>>>0,bet,step:0,status:trigger?'STAGE':'SETTLED',stage:0,remaining:trigger?C.stageSpins:0,baseWinX,lootX:trigger?(offer?offer.lootX:C.initialLoot[outcome.scatters]):0,alarmModifier:0,decisions:[],completed:[],maxStage:0,maxRisk:0,result:trigger?'heist-triggered':'base',payout:0,outcome};
  if(version===2||scatterBoost||offer)Object.assign(r,{version:2,scatterBoost:!!scatterBoost,purchaseType:offer?.id||null,cost:round(bet*(offer?offer.costX:scatterBoost?C.scatterBoost.costMultiplier:1))});
  cap(r);if(r.status==='SETTLED')finalize(r,r.result);return r;
 }
 function advance(input,action){
  const r=clone(input);if(!active(r))return r;
  if(action==='spin'&&r.status==='STAGE'){
   const rng=seeded((r.seed^Math.imul(r.stage*3+(C.stageSpins-r.remaining)+1,0x9e3779b1))>>>0);
   r.outcome=evaluate(generate(r.stage,rng),r.stage,rng);r.lootX=round(r.lootX+r.outcome.winX);r.alarmModifier=round(r.alarmModifier+r.outcome.riskDelta);r.remaining--;r.step++;r.maxRisk=Math.max(r.maxRisk,risk(r));cap(r);
   if(r.status==='SETTLED')return finalize(r,'max-win');
   if(r.remaining===0){r.completed.push(r.stage);if(r.stage===5)return finalize(r,'grand-take');r.status='CHOICE';}return r;
  }
  if(r.status!=='CHOICE')return r;
  if(action==='collect'){r.step++;r.decisions.push({stage:r.stage,action,risk:risk(r),lootX:r.lootX});return finalize(r,'collected');}
  if(action==='deeper'){
   const p=risk(r),draw=seeded((r.seed^Math.imul(r.stage+1,0x85ebca6b))>>>0)();r.step++;
   r.decisions.push({stage:r.stage,action,risk:p,lootX:r.lootX,draw,safe:draw>=p});r.maxRisk=Math.max(r.maxRisk,p);
   if(draw<p)return finalize(r,'alarm');r.stage++;r.maxStage=r.stage;r.remaining=C.stageSpins;r.alarmModifier=0;r.status='STAGE';r.result='access-granted';return r;
  }
  return r;
 }
 // Validate by reproducing the entire business action prefix (at most 24 transitions).
 function validate(x){try{
  if(!x||![1,2].includes(x.version)||typeof x.roundId!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x.roundId))||!Number.isInteger(x.seed)||x.seed<0||x.seed>4294967295||!Number.isFinite(x.bet)||x.bet<=0||x.bet>1e9||!Number.isInteger(x.step)||x.step<0||x.step>24||!Array.isArray(x.decisions))return null;
  let r=start(x);while(r.step<x.step&&active(r)){const a=r.status==='STAGE'?'spin':x.decisions.find(d=>d.stage===r.stage)?.action;if(!a)return null;r=advance(r,a);}
  const stable=v=>v&&typeof v==='object'?Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;return JSON.stringify(stable(r))===JSON.stringify(stable(x))?r:null;
 }catch{return null;}}
 return {seeded,weighted,generate,evaluate,start,advance,risk,active,validate,round,cost:r=>r.cost??r.bet};
})();
if(typeof module!=='undefined')module.exports=VAULT_HEIST_MODEL;
