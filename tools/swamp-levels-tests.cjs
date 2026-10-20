const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const box={module:{exports:{}}};vm.createContext(box);vm.runInContext(['config-v2.js','model-v1.js','config.js','model.js'].map(f=>fs.readFileSync('swamp/'+f,'utf8')).join('\n'),box);const {SWAMP_CONFIG:C,SWAMP_MODEL:M}=box.module.exports,id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const grid=()=>Array.from({length:5},()=>Array.from({length:3},()=>({id:'money',valueX:2}))),fresh=()=>({...M.newBonus(3,20),featureId:id});
for(let n=3;n<=5;n++){const g=grid();for(let i=0;i<n;i++)g[i][0]={id:'scatter'};assert.equal(M.resolve(g).triggerSpins,15);}
const empty=Array.from({length:5},()=>Array.from({length:3},()=>({id:'bait_jar'})));empty[2][1]={id:'collector'};const threshold=M.resolve(empty,{...M.acknowledge(fresh()),collectors:3,remaining:2,spinsPlayed:13});assert.equal(threshold.collectedX,0);assert.equal(threshold.nextBonus.collectors,4);assert.equal(threshold.nextBonus.tier,0);assert.equal(threshold.nextBonus.remaining,1);
let b=M.acknowledge(fresh());assert.equal(b.remaining,15);assert.equal(b.tier,0);
// Reach several future thresholds early, but finish every current level in full.
for(let tier=0;tier<4;tier++){
 for(let spin=0;spin<15;spin++){
  const g=grid();if(spin===0)for(let r=0;r<3;r++)for(let c=1;c<4;c++)g[c][r]={id:'collector'};
  const r=M.resolve(g,b);assert.equal(r.multiplier,C.multipliers[tier]);assert.equal(r.awardedSpins,0);if(spin<14){assert.equal(r.nextBonus.tier,tier);assert.equal(r.nextBonus.remaining,14-spin);assert.equal(r.nextBonus.phase,'playing');}
  b=r.nextBonus;assert(M.validateBonus(b));
 }
 if(tier<3){assert.equal(b.phase,'level-up');assert.equal(b.remaining,15);assert.equal(b.previousTier,tier);assert.equal(b.tier,tier+1);const saved=JSON.parse(JSON.stringify(b));assert.deepEqual(JSON.parse(JSON.stringify(M.validateBonus(saved))),saved);b=M.acknowledge(b);}else{assert.equal(b.phase,'complete');assert.equal(b.remaining,0);}
}
assert.equal(b.spinsPlayed,60);assert.equal(b.collectors,36);
const no=grid();const z={...M.acknowledge(fresh()),remaining:1,spinsPlayed:14};assert.equal(M.resolve(no,z).nextBonus.phase,'complete');
const cap={...M.acknowledge(fresh()),totalWinX:C.maxWinX-1};const g=grid();g[1][0]={id:'collector'};const capped=M.resolve(g,cap);assert.equal(capped.winX,1);assert.equal(capped.nextBonus.phase,'complete');assert.equal(capped.nextBonus.remaining,0);
for(let seed=0;seed<2000;seed++)for(const bonus of [false,true]){const a=M.generate(bonus,M.seeded(seed)),old=box.SWAMP_MODEL_V1;const b=vm.runInContext(`SWAMP_MODEL_V1.generate(${bonus},SWAMP_MODEL_V1.seeded(${seed}))`,box);assert.equal(JSON.stringify(a),JSON.stringify(b));}
for(let seed=0;seed<100;seed++){const p=M.purchaseTrigger(seed);assert.equal(p.flat().filter(s=>s.id==='scatter').length,3);}
assert.equal(C.purchases.length,1);assert.equal(C.purchases[0].costX,77);
console.log('PASS 3+Scatter→15; deferred sequential four levels/60 spins; x1/x2/x3/x10; cumulative overflow; no immediate upgrade/retrigger; cap/complete; stable checkpoint; 4000 unchanged generated grids;100 purchased presentation triggers; one77x offer');
