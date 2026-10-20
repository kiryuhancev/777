const assert=require('node:assert/strict'),M=require('../magnet/features-model.js'),L=require('../magnet/model.js');
const id='11111111-1111-4111-8111-111111111111';let kinds=new Set(),bonuses=0,extensions=0;
for(let seed=0;seed<3000;seed++){
 let r=M.start({seed,bet:20,roundId:id});assert.deepEqual(r,M.start({seed,bet:20,roundId:id}));
 const base=r.spins[0];assert.equal(base.phaseCount,0);assert.equal(base.phases.length,0);assert(base.initialGrid.filter(t=>t.symbol==='wheel').length<=1);
 if(base.wheel){kinds.add(base.wheel.id);assert.equal(base.initialGrid[12].symbol,'wheel');for(const t of base.initialGrid.filter(t=>t.symbol==='scatter'))assert.equal(base.finalGrid.find(x=>x.uid===t.uid).symbol,'scatter');}
 else assert.deepEqual(base.initialGrid,base.finalGrid);
 if(M.active(r)){bonuses++;assert.equal(r.bonus.remaining,6);assert.equal(r.payout,0);}
 while(M.active(r)){
  const before=r;r=M.advance(r);assert.equal(r.roundId,id);assert.equal(r.bet,20);assert(r.step<=12);assert(r.bonus.collectedX>=before.bonus.collectedX);assert(r.bonus.charge>=before.bonus.charge);assert.equal(r.bonus.power,M.power(r.bonus.charge));
  assert.deepEqual(r.spins.slice(0,-1),before.spins);assert.deepEqual(M.validate(r),r);
  const events=r.magneticPlan.events.filter(e=>e.kind==='collect');const cells=events.flatMap(e=>e.targets);assert.equal(cells.length,new Set(cells).size,'value collected twice');
 }
 extensions+=r.bonus.extensions;assert.equal(r.payout,L.round(r.totalWinX*20));assert(r.totalWinX<=10000);assert.deepEqual(M.advance(r),r);assert.deepEqual(M.validate(r),r);
 const broken=structuredClone(r);broken.payout++;assert.equal(M.validate(broken),null);
}
assert.equal(kinds.size,6);assert(bonuses>0&&extensions>0);assert.equal(M.validate({version:2,step:13}),null);
// Explicit held-value, local/global collectors, doubling and final sweep invariant.
const prev={remaining:1,held:[{cell:0,valueX:5},{cell:24,valueX:10}],charge:0,power:1,collectedX:0,extensions:6};
for(let seed=0;seed<100;seed++){
 const p=M.bonusPlan(seed,6,prev);assert.equal(p.chamber.remaining,0);assert.equal(p.chamber.held.length,0);
 assert(!p.finalGrid.some(t=>t.symbol==='value'));
 assert.equal(p.chamber.collectedX,L.round(p.collectedThisSpin+p.sweepX));assert(p.chamber.collectedX>=15);
}
console.log('PASS 3000 deterministic cycles, all 6 Wheel sectors, held values, no duplicate collection, 6–12 Chamber spins, charge ladder/final sweep, payout once, recovery corruption rejection; v1 model retained');
