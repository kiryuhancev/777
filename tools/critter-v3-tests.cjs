const assert=require('node:assert/strict'),M=require('../critter/model'),C=M.config,id='11111111-1111-4111-8111-111111111111';
assert.deepEqual(C.symbols,M.previous.config.symbols);for(const k of ['payScale','scatterChance','wildChance','maxCascades','maxWinX'])assert.equal(C[k],M.previous.config[k]);
let moves=0,bonuses=0,plainScatter=0,boostScatter=0;
for(let seed=0;seed<3000;seed++){
 const args={seed,bet:20,roundId:id},r=M.start(args),v2=M.previous.start(args);assert.deepEqual(r.base,v2.base,'unboosted base path/math changed');assert.deepEqual(M.validate(r),r);assert.deepEqual(M.validate(v2),v2);assert.equal(M.cost(r),20);
 plainScatter+=r.base.initialGrid.filter(t=>t.symbol==='scatter').length;boostScatter+=M.cascade(M.channel(seed,0),{scatterBoost:true}).initialGrid.filter(t=>t.symbol==='scatter').length;
 if(r.bonus){bonuses++;let previous=null;for(const plan of r.bonus.spins){
  if(previous)for(let i=0;i<25;i++)if(previous[i].symbol==='wild')assert.equal(plan.initialGrid[i].symbol,'wild');
  for(const t of plan.initialGrid)if(t.symbol==='wild')assert.equal(t.multiplier,1);
  const multipliers=new Map();for(const step of plan.steps){for(const t of step.grid)if(t.symbol==='wild')assert.equal(t.multiplier,multipliers.get(t.uid)||1);for(const uid of step.activeWilds)multipliers.set(uid,(multipliers.get(uid)||1)*2);
   if(!step.nextGrid)continue;const next=structuredClone(step.gravityGrid);for(const move of step.moves){const t=next[move.from];assert.equal(t.symbol,'wild');assert.equal(t.uid,move.uid);assert.equal(t.multiplier,multipliers.get(t.uid));assert(!['wild','scatter'].includes(next[move.to].symbol));[next[move.from],next[move.to]]=[next[move.to],next[move.from]];moves++;}assert.deepEqual(next,step.nextGrid);
  }previous=plan.finalGrid;
 }}
}
assert(bonuses&&moves);assert(boostScatter>plainScatter*1.35&&boostScatter<plainScatter*1.7);
for(const purchaseType of ['bonus','super'])for(let seed=0;seed<100;seed++){
 const r=M.start({seed,bet:20,roundId:id,purchaseType});assert.equal(r.bonus.kind,purchaseType==='super'?'super':'normal');assert.equal(r.bonus.spinCount,purchaseType==='super'?20:10);assert.equal(r.base.winX,0);assert.equal(r.base.steps.length,0);assert.equal(r.base.scatters,0);assert.equal(r.cost,M.round(20*C.features[purchaseType+'Cost']));assert.deepEqual(M.validate(r),r);const bad=structuredClone(r);bad.cost--;assert.equal(M.validate(bad),null);
}
assert.throws(()=>M.start({seed:1,bet:20,roundId:id,purchaseType:'super',scatterBoost:true}));assert.throws(()=>M.start({seed:1,bet:20,roundId:id,purchaseType:'fake'}));
console.log(`PASS unchanged base/paytable/weights/RNG;3000 paths, ${bonuses} natural bonuses, ${moves} bonus Wild moves; persistent final positions and x1 reset; initial Scatter boost ratio ${(boostScatter/plainScatter).toFixed(3)};200 paid features with one cost, no fake base Scatters, exact validation and tamper rejection`);
