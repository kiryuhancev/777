/* Pure collect-slot model. Visual timing cannot draw or replace any symbol. */
const SWAMP_MODEL=(()=>{
 const C=SWAMP_CONFIG,money=n=>Math.round(n*1e6)/1e6;
 function seeded(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function pick(entries,rng){const sum=entries.reduce((n,e)=>n+e.weight,0);let t=rng()*sum;for(const e of entries){t-=e.weight;if(t<0)return e;}return entries[entries.length-1];}
 function generate(bonus=false,rng=Math.random,config=C){
  const grid=Array.from({length:5},()=>[]);
  for(let reel=0;reel<5;reel++){
   const scatterRow=!bonus&&rng()<config.scatterPerReel?Math.floor(rng()*3):-1;
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
 function newBonus(scatterCount,bet,config=C,initialWinX=0){return {version:1,bet,remaining:initialWinX>=config.maxWinX?0:(config.freeSpins[Math.min(5,scatterCount)]||0),collectors:0,tier:0,totalWinX:initialWinX,spinsPlayed:0};}
 function resolve(grid,bonus=null,config=C){
  const e=evaluate(grid,config),inBonus=!!bonus,multiplier=inBonus?config.multipliers[bonus.tier]:1;
  const collectedX=inBonus?money(e.fish.reduce((sum,f)=>sum+f.valueX,0)*e.collectors.length*multiplier):0;
  const uncappedX=money(e.lineWinX+collectedX),availableX=Math.max(0,config.maxWinX-(bonus?.totalWinX||0));
  const winX=money(Math.min(uncappedX,availableX));let nextBonus=null,awardedSpins=0;
  if(inBonus){const before=Math.floor(bonus.collectors/config.collectorsPerUpgrade),count=bonus.collectors+e.collectors.length;
   awardedSpins=(Math.floor(count/config.collectorsPerUpgrade)-before)*config.retriggerSpins;
   nextBonus={...bonus,remaining:bonus.remaining-1+awardedSpins,collectors:count,tier:Math.min(config.multipliers.length-1,Math.floor(count/config.collectorsPerUpgrade)),totalWinX:money(bonus.totalWinX+winX),spinsPlayed:bonus.spinsPlayed+1};
   if(nextBonus.totalWinX>=config.maxWinX)nextBonus.remaining=0;
  }
  return {...e,grid,multiplier,collectedX,uncappedX,winX,awardedSpins,nextBonus,triggerSpins:!inBonus&&winX<config.maxWinX?(config.freeSpins[Math.min(5,e.scatters)]||0):0,capped:winX<uncappedX};
 }
 function validateBonus(b){if(!b||b.version!==1||b.remaining>0&&(typeof b.featureId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.featureId))||!Number.isFinite(b.bet)||b.bet<=0||b.bet>1e9||!Number.isInteger(b.remaining)||b.remaining<0||b.remaining>100000||!Number.isInteger(b.collectors)||b.collectors<0||b.collectors>100000||!Number.isInteger(b.tier)||b.tier<0||b.tier>3||!Number.isInteger(b.spinsPlayed)||b.spinsPlayed<0||b.spinsPlayed>100000||!Number.isFinite(b.totalWinX)||b.totalWinX<0||b.totalWinX>C.maxWinX||b.tier!==Math.min(3,Math.floor(b.collectors/4)))return null;return {version:1,featureId:typeof b.featureId==='string'&&/^[0-9a-f-]{36}$/i.test(b.featureId)?b.featureId:null,bet:b.bet,remaining:b.remaining,collectors:b.collectors,tier:b.tier,totalWinX:b.totalWinX,spinsPlayed:b.spinsPlayed};}
 return {seeded,pick,generate,evaluate,resolve,newBonus,validateBonus};
})();
if(typeof module!=='undefined'&&module.exports)module.exports={SWAMP_CONFIG,SWAMP_MODEL};
