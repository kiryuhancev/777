const assert=require('node:assert/strict'),M=require('../critter/model-v2'),C=M.config,id='11111111-1111-4111-8111-111111111111';
assert.deepEqual(C.symbols,M.legacy.config.symbols,'raw paytable/weights changed');for(const key of ['wildChance','scatterChance','minCluster','maxCascades','maxWinX'])assert.equal(C[key],M.legacy.config[key]);assert.equal(M.legacy.config.payScale,3.7256);const a=M.seeded(19),b=M.legacy.seeded(19);for(let i=0;i<1000;i++)assert.equal(a(),b(),'PRNG changed');
const strip=g=>g.map(({uid,symbol})=>({uid,symbol}));
let bonus=0,superBonus=0,moves=0,chain8=false;
for(let seed=0;seed<5000;seed++){
 const r=M.start({seed,bet:20,roundId:id}),old=M.legacy.start({seed,bet:20,roundId:id});
 assert.deepEqual(M.validate(r),r);assert.deepEqual(strip(r.base.initialGrid),old.base.initialGrid,'initial draw stream changed');
 assert.deepEqual(strip(r.base.finalGrid),old.base.finalGrid,'base RNG/refill/movement stream changed');
 assert.equal(r.base.steps.length,old.base.steps.length);assert.equal(r.base.scatters,old.base.scatters);
 assert.equal(!!r.bonus,r.base.scatters>=3);assert.equal(r.payout,M.round(r.winX*r.bet));assert(r.winX<=C.maxWinX);
 const plans=[r.base,...(r.bonus?.spins||[])];let previous=null;
 for(const plan of plans){
  assert(M.validGrid(plan.initialGrid)&&M.validGrid(plan.finalGrid));
  for(const t of plan.initialGrid)if(t.symbol==='wild')assert.equal(t.multiplier,1);
  const counts=new Map();let cursor=plan.initialGrid;
  for(const s of plan.steps){
   assert.deepEqual(s.grid,cursor);assert.deepEqual(M.evaluate(s.grid).wins,s.wins);
   for(const t of s.grid)if(t.symbol==='wild'){assert.equal(t.multiplier,counts.get(t.uid)||1);if(t.multiplier>=8)chain8=true;}
   for(const w of s.wins)assert.equal(w.winX,M.round(M.round(w.rawWinX*C.payScale)*w.multiplier));
   for(const uid of s.activeWilds)counts.set(uid,(counts.get(uid)||1)*2);
   if(!s.nextGrid){assert(plan.limitReached);continue;}
   for(const t of s.nextGrid)if(t.symbol==='wild')assert.equal(t.multiplier,counts.get(t.uid)||1);
   if(plan!==r.base){assert.equal(s.moves.length,0);for(let i=0;i<25;i++)if(s.grid[i].symbol==='wild')assert.equal(s.nextGrid[i].symbol,'wild');}
   moves+=s.moves.length;cursor=s.nextGrid;
  }
  assert.deepEqual(plan.finalGrid,cursor);
  if(plan!==r.base){if(previous)for(let i=0;i<25;i++)if(previous[i].symbol==='wild')assert.equal(plan.initialGrid[i].symbol,'wild');previous=plan.finalGrid;assert.equal(plan.scatters,0);}
 }
 if(r.bonus){bonus++;if(r.bonus.kind==='super')superBonus++;assert.equal(r.bonus.spinCount,r.base.scatters>=4?20:10);assert.equal(r.bonus.winX,M.round(r.bonus.spins.reduce((n,p)=>n+p.winX,0)));}
 const bad=structuredClone(r);bad.payout++;assert.equal(M.validate(bad),null);
 if(seed<30){const legacy=M.legacy.start({seed,bet:20,roundId:id});assert.deepEqual(M.validate(legacy),legacy);}
}
assert(bonus&&superBonus&&moves&&chain8);console.log(`PASS 5000 deterministic rounds; unchanged base RNG/symbol/refill/movement paths; ${bonus} bonuses including ${superBonus} SUPER; x1→x2→x4→x8; persistent positions/reset; exact payouts/cap; legacy recovery`);
// Two Wilds use strongest multiplier and increase only once per cascade, not per cluster.
const g=Array.from({length:25},(_,uid)=>({uid,symbol:'scatter'}));[0,1,2,3,4].forEach(i=>g[i].symbol='ten');g[3]={uid:3,symbol:'wild',multiplier:2};g[4]={uid:4,symbol:'wild',multiplier:8};assert.equal(M.evaluate(g).wins[0].multiplier,8);
