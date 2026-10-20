// Legacy v1 checkpoint/model regression; v2 has its own additional suite.
const assert=require('node:assert/strict'),M=require('../critter/model-v1.js'),C=M.config,id='11111111-1111-4111-8111-111111111111';
const grid=()=>Array.from({length:25},(_,uid)=>({uid,symbol:'scatter'}));
let g=grid();[0,1,2,3].forEach(i=>g[i].symbol='ten');assert.equal(M.evaluate(g).winX,0);
g=grid();[0,6,12,18,24].forEach(i=>g[i].symbol='ten');assert.equal(M.evaluate(g).winX,0,'diagonal is not a cluster');
g=grid();[0,1,2,3,4].forEach(i=>g[i].symbol='ten');assert.equal(M.evaluate(g).winX,M.round(.2*C.payScale));
g[3].symbol='wild';g[4].symbol='wild';assert.equal(M.evaluate(g).wins.length,1);assert.deepEqual(M.evaluate(g).activeWilds,[3,4]);
g=grid();[0,1,2,3,4].forEach(i=>g[i].symbol='wild');assert.equal(M.evaluate(g).wins.length,1);assert.equal(M.evaluate(g).wins[0].rawWinX,1.5);
let bonuses=0,moves=0,limits=0;
for(let seed=0;seed<3000;seed++){
 const r=M.start({seed,bet:20,roundId:id});assert.deepEqual(r,M.start({seed,bet:20,roundId:id}));assert.deepEqual(M.validate(JSON.parse(JSON.stringify(r))),r);
 assert.equal(r.bonus!==null,r.base.scatters>=3);assert.equal(r.payout,M.round(r.winX*20));assert(r.winX<=C.maxWinX);
 for(const p of [r.base,...(r.bonus?[r.bonus.plan]:[])]){
  assert(M.validGrid(p.initialGrid)&&M.validGrid(p.finalGrid));assert(p.steps.length<=12);if(p.limitReached)limits++;
  let cursor=p.initialGrid;
  for(const step of p.steps){
   assert.deepEqual(step.grid,cursor);assert(M.validGrid(step.grid));assert.equal(step.activeWilds.length,new Set(step.activeWilds).size);
   for(const uid of step.removed)assert.notEqual(step.grid.find(t=>t.uid===uid).symbol,'wild');
   if(!step.gravityGrid){assert(p.limitReached);continue;}
   assert(M.validGrid(step.gravityGrid));
   for(const [i,t] of step.grid.entries())if(t.symbol==='wild')assert.deepEqual(step.gravityGrid[i],t,'Wild anchor moved during gravity');
   const scatters=step.grid.filter(t=>t.symbol==='scatter').map(t=>t.uid);assert(scatters.every(uid=>step.gravityGrid.some(t=>t.uid===uid&&t.symbol==='scatter')));
   const visual=structuredClone(step.gravityGrid),seen=new Set();
   for(const move of step.moves){assert.equal(visual[move.from].uid,move.uid);assert.equal(visual[move.from].symbol,'wild');assert(!['wild','scatter'].includes(visual[move.to].symbol));assert(step.activeWilds.includes(move.uid));assert(!seen.has(move.uid));seen.add(move.uid);[visual[move.from],visual[move.to]]=[visual[move.to],visual[move.from]];moves++;}
   assert.deepEqual(visual,step.nextGrid);cursor=step.nextGrid;
  }
  assert.deepEqual(p.finalGrid,cursor);
 }
 if(r.bonus){bonuses++;assert.equal(r.bonus.plan.scatters,0);assert.equal(r.bonus.plan.drops.length,r.bonus.extraWilds);assert.equal(r.bonus.winX,M.round((r.bonus.cashX+r.bonus.plan.winX)*r.bonus.multiplier));}
 const bad=structuredClone(r);bad.payout++;assert.equal(M.validate(bad),null);
}
assert(bonuses>0&&moves>0);assert.equal(M.validate({version:1,gameId:'critter',status:'SETTLED',seed:NaN}),null);
console.log(`PASS cluster threshold/orthogonal adjacency/Wild substitution/pure-Wild once; 3000 seeded round paths, ${moves} running Wild swaps, ${bonuses} bonuses; gravity anchors/Scatter identity/unique occupancy, cascade cap, exact restore and payout once`);
