const assert=require('node:assert/strict'),M=require('../critter/model'),C=M.config;
const grid=()=>Array.from({length:25},(_,uid)=>({uid,symbol:'scatter'}));
function set(g,c,n,s='ten',multiplier=1){for(let r=0;r<n;r++)g[r*5+c]={uid:r*5+c,symbol:s,...(s==='wild'?{multiplier,wildId:`w${r*5+c}`}:{})};}
for(const len of [3,4,5]){const g=grid();for(let c=0;c<len;c++)set(g,c,1);const w=M.evaluate(g).wins;assert.equal(w.length,1);assert.equal(w[0].length,len);assert.equal(w[0].ways,1);}
for(const cols of [[1,2,3],[0,1,3]]){const g=grid();cols.forEach(c=>set(g,c,1));assert.equal(M.evaluate(g).wins.length,0);}
let g=grid();[2,3,2].forEach((n,c)=>set(g,c,n));assert.equal(M.evaluate(g).wins[0].ways,12);
g=grid();set(g,0,1,'ten');set(g,1,1,'wild',8);set(g,2,1,'wild',2);let w=M.evaluate(g,{bonus:true}).wins[0];assert.equal(w.weightedWays,10);assert.equal(w.ways,1);assert.equal(M.evaluate(g).wins[0].weightedWays,1);assert.deepEqual(w.positions,[0,1,2]);
// One regular and one Wild on reel1: two ways, factors1 and8.
g=grid();set(g,0,1);g[5]={uid:5,symbol:'wild',multiplier:8};set(g,1,1);set(g,2,1);assert.equal(M.evaluate(g,{bonus:true}).wins[0].weightedWays,9);
g=grid();[0,1,2].forEach(c=>set(g,c,1,'wild',2));w=M.evaluate(g,{bonus:true}).wins;assert.equal(w.length,1);assert.equal(w[0].symbol,'wild');assert.equal(w[0].weightedWays,6);
const id='11111111-1111-4111-8111-111111111111';
for(let seed=0;seed<100;seed++){
 const p=M.spinPlan(seed);for(let c=0;c<5;c++)assert.ok(p.finalGrid.filter((t,i)=>i%5===c&&t.symbol==='scatter').length<=1);
 const r=M.start({seed,bet:1,roundId:id,purchaseType:seed%2?'super':'bonus'});assert.ok(M.validate(r));let before=[];
 for(const p of r.bonus.spins){assert.deepEqual(p.persistentWildsBefore,before);assert.ok(!('steps'in p));const active=new Set(p.activeWilds.map(i=>p.finalGrid[i].wildId));for(const w of p.persistentWildsAfter){const old=p.finalGrid[w.cell];assert.equal(w.multiplier,active.has(w.id)?old.multiplier*2:old.multiplier);}before=p.persistentWildsAfter;}
 assert.ok(M.validateProgress(r,M.progress(r,{baseDone:true,nextSpin:1})));
}
// Raw PRNG draws/weights and movement geometry are unchanged before evaluation.
for(let seed=0;seed<300;seed++){
 const raw=M.v5.v4.spinPlan(seed),p=M.spinPlan(seed);assert.equal(p.scatters,Math.min(5,raw.scatters));
 assert.equal(p.finalGrid.filter(t=>t.symbol==='wild').length,raw.finalGrid.filter(t=>t.symbol==='wild').length);
 const persistentWilds=[{id:'old',cell:0,multiplier:8}],options={bonus:true,persistentWilds,spinIndex:1};
 const a=M.v5.v4.spinPlan(seed,options),b=M.spinPlan(seed,options);
 for(const key of ['initialGrid','finalGrid','movements','newWilds','persistentWildsBefore'])assert.deepEqual(a[key],b[key]);
}
for(const seed of [1,22,333]){const old=M.v5.start({seed,bet:1,roundId:id});assert.deepEqual(M.validate(old),old);}
console.log('PASS: 3/4/5 reels, starts/gaps, 12 ways, additive Wilds, all-Wild uniqueness, Scatter columns, 100 bonus plans, persistence, no cascades, legacy recovery.');
