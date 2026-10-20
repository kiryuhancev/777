/* Pure collect-slot model. Visual timing cannot draw or replace any symbol. */
const SWAMP_MODEL_V2=(()=>{
 const C=SWAMP_CONFIG_V3,money=n=>Math.round(n*1e6)/1e6;
 function seeded(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function pick(entries,rng){const sum=entries.reduce((n,e)=>n+e.weight,0);let t=rng()*sum;for(const e of entries){t-=e.weight;if(t<0)return e;}return entries[entries.length-1];}
 function generate(bonus=false,rng=Math.random,config=C,boost=false){
  const grid=Array.from({length:5},()=>[]);
  for(let reel=0;reel<5;reel++){
   const scatterRow=!bonus&&rng()<config.scatterPerReel*(boost?config.scatterBoost.symbolMultiplier:1)?Math.floor(rng()*3):-1;
   for(let row=0;row<3;row++){
    if(row===scatterRow){grid[reel].push({id:'scatter'});continue;}
    if(bonus&&config.collectorReels.includes(reel)&&rng()<config.collectorChance){grid[reel].push({id:'collector'});continue;}
    if(rng()<(bonus?config.moneyChanceBonus:config.moneyChanceBase)){const m=pick(config.money,rng);grid[reel].push({id:'money',valueX:m.x,skin:m.x>=50?1:m.x>=20?2:m.x>=10?3:0});continue;}
    grid[reel].push({id:pick(config.symbols,rng).id});
   }
  }return grid;
 }
 function evaluate(grid,config=C){
  let lineWinX=0;const lines=[];
  config.paylines.forEach((rows,index)=>{const symbol=config.symbols.find(s=>s.id===grid[0][rows[0]].id);if(!symbol)return;let count=1;while(count<5&&[symbol.id,'collector'].includes(grid[count][rows[count]].id))count++;if(count>=3){const payoutX=money(symbol.pays[count-3]*config.lineScale);lineWinX+=payoutX;lines.push({line:index,rows,count,symbol:symbol.id,payoutX});}});
  const collectors=[],fish=[];let scatters=0;
  grid.forEach((column,reel)=>column.forEach((s,row)=>{if(s.id==='collector')collectors.push({reel,row});if(s.id==='money')fish.push({reel,row,valueX:s.valueX});if(s.id==='scatter')scatters++;}));
  return {lineWinX:money(lineWinX),lines,collectors,fish,scatters};
 }
 function newBonus(scatterCount,bet,config=C,initialWinX=0){return {version:2,bet,remaining:initialWinX>=config.maxWinX?0:15,collectors:0,tier:0,totalWinX:initialWinX,spinsPlayed:0,phase:initialWinX>=config.maxWinX?'complete':'intro'};}
 function resolve(grid,bonus=null,config=C){
  if(bonus?.version===1)return SWAMP_MODEL_V1.resolve(grid,bonus,SWAMP_CONFIG_V2);
  const e=evaluate(grid,config),inBonus=!!bonus,multiplier=inBonus?config.multipliers[bonus.tier]:1;
  const collectedX=inBonus?money(e.fish.reduce((sum,f)=>sum+f.valueX,0)*e.collectors.length*multiplier):0;
  const uncappedX=money(e.lineWinX+collectedX),availableX=Math.max(0,config.maxWinX-(bonus?.totalWinX||0)),winX=money(Math.min(uncappedX,availableX));
  let nextBonus=null;
  if(inBonus){
   const count=bonus.collectors+e.collectors.length;
   nextBonus={...bonus,remaining:bonus.remaining-1,collectors:count,totalWinX:money(bonus.totalWinX+winX),spinsPlayed:bonus.spinsPlayed+1,phase:'playing'};
   delete nextBonus.previousTier;
   if(nextBonus.totalWinX>=config.maxWinX){nextBonus.remaining=0;nextBonus.phase='complete';}
   else if(nextBonus.remaining===0){
    if(bonus.tier<3&&count>=(bonus.tier+1)*4){nextBonus={...nextBonus,remaining:15,tier:bonus.tier+1,previousTier:bonus.tier,phase:'level-up'};}
    else nextBonus.phase='complete';
   }
  }
  return {...e,grid,multiplier,collectedX,uncappedX,winX,awardedSpins:0,nextBonus,triggerSpins:!inBonus&&e.scatters>=3&&winX<config.maxWinX?15:0,capped:winX<uncappedX};
 }
 function acknowledge(b){if(!b||b.version!==2)return b;const next={...b,phase:b.phase==='complete'?'complete':'playing'};delete next.previousTier;return next;}
 function purchaseTrigger(seed){const grid=generate(false,seeded(seed));for(const col of grid)for(let i=0;i<3;i++)if(col[i].id==='scatter')col[i]={id:C.symbols[(i+seed)%C.symbols.length].id};for(let i=0;i<3;i++)grid[i][(seed+i)%3]={id:'scatter'};return grid;}
 function validateBonus(b){
  if(b?.version===1)return SWAMP_MODEL_V1.validateBonus(b);
  if(!b||b.version!==2||typeof b.featureId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.featureId)||!Number.isFinite(b.bet)||b.bet<=0||b.bet>1e9||!Number.isInteger(b.remaining)||b.remaining<0||b.remaining>15||!Number.isInteger(b.collectors)||b.collectors<0||b.collectors>540||!Number.isInteger(b.tier)||b.tier<0||b.tier>3||b.collectors<b.tier*4||!Number.isInteger(b.spinsPlayed)||b.spinsPlayed<0||b.spinsPlayed>60||!Number.isFinite(b.totalWinX)||b.totalWinX<0||b.totalWinX>C.maxWinX||!['intro','playing','level-up','complete'].includes(b.phase))return null;
  if(b.phase==='intro'&&(b.tier!==0||b.remaining!==15||b.spinsPlayed!==0)||b.phase==='level-up'&&(b.tier<1||b.remaining!==15||b.spinsPlayed!==b.tier*15||b.previousTier!==b.tier-1)||b.phase==='complete'&&b.remaining!==0)return null;
  const out={version:2,featureId:b.featureId,bet:b.bet,remaining:b.remaining,collectors:b.collectors,tier:b.tier,totalWinX:b.totalWinX,spinsPlayed:b.spinsPlayed,phase:b.phase};
  if(b.phase==='level-up')out.previousTier=b.previousTier;
  if(Number.isInteger(b.triggerSeed)&&b.triggerSeed>=0&&b.triggerSeed<=4294967295)out.triggerSeed=b.triggerSeed;
  return out;
 }

 return {seeded,pick,generate,evaluate,resolve,newBonus,validateBonus,acknowledge,purchaseTrigger};
})();
if(typeof module!=='undefined'&&module.exports)module.exports={SWAMP_CONFIG:SWAMP_CONFIG_V3,SWAMP_MODEL:SWAMP_MODEL_V2};
