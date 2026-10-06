'use strict';
const assert=require('node:assert/strict');
const {loadMath}=require('./slot-math.cjs');const math=loadMath();
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
function board(n=5,bonus=false){const m=math.newBoard({bonus});m.size=n;m.grid=new Int8Array(n*n).fill(13);m.sticky=new Int8Array(n*n).fill(-1);return m;}
const rng=math.seededRandom(43);
test('five orthogonal cells win; diagonals do not',()=>{
 let m=board();for(let i=0;i<5;i++)m.grid[i]=0;assert.equal(math.findWins(m).length,1);assert.equal(math.findWins(m)[0].paidX,.4);
 m=board();for(let i=0;i<5;i++)m.grid[i*6]=0;assert.equal(math.findWins(m).length,0);
});
test('Wild shared by two types; Scatter excluded; Wild-only cluster excluded',()=>{
 const m=board();m.grid[12]=9;for(const i of [10,11,6,7])m.grid[i]=0;for(const i of [13,14,18,17])m.grid[i]=1;
 const w=math.findWins(m);assert.equal(w.length,2);assert.ok(w.every(x=>x.cells.includes(12)));
 const all=board();all.grid.fill(9);assert.equal(math.findWins(all).length,0);
});
test('paytable pays below 1x and above 50x without altering individual clusters',()=>{
 const m=board(8,true);for(let r=0;r<3;r++)for(let c=0;c<5;c++)m.grid[r*8+c]=8;
 for(let r=5;r<8;r++)for(let c=0;c<5;c++)m.grid[r*8+c]=8;
 const w=math.findWins(m);assert.equal(w.length,2);assert.deepEqual(w.map(x=>x.paidX),[60,60]);assert.equal(w.reduce((s,x)=>s+x.paidX,0),120);
 const low=board(5,true);for(let i=0;i<5;i++)low.grid[i]=0;assert.equal(math.findWins(low)[0].paidX,.4);
});
test('Wild multipliers multiply exactly rather than stopping at x50',()=>{
 const m=board(5,true);m.grid[0]=m.grid[1]=m.grid[2]=12;m.grid[3]=m.grid[4]=2;
 const w=math.findWins(m)[0];assert.equal(w.mult,125);assert.equal(w.paidX,81.25);assert.equal(w.paidX,w.rawX);
});
test('every Super uses the declared profile without a secret session lottery',()=>{
 let draws=0;const m=math.newBonus('super',()=>{draws++;return 0});assert.equal(m.profile,'super');assert.equal(draws,0);
 assert.ok(!('rare' in math.CONFIG));assert.ok(!('rareSuperProbability' in math.CONFIG));
});
test('winning base Wild locks through gravity and releases after cascade; losing Wild stays movable',()=>{
 const m=board();m.grid[0]=10;m.grid[24]=9;for(let i=1;i<5;i++)m.grid[i]=0;
 const wins=math.findWins(m);math.removeWins(m,wins);assert.equal(m.sticky[0],10);assert.equal(m.sticky[24],-1);
 math.gravity(m);assert.equal(m.sticky[0],10);math.generate(m,rng,{refill:true});assert.equal(m.sticky[0],10);
 math.releaseCascadeWilds(m);assert.equal(m.grid[0],10);assert.ok(m.sticky.every(x=>x===-1));
 const bonus=board(5,true);bonus.grid[0]=9;math.lockWilds(bonus);math.releaseCascadeWilds(bonus);assert.equal(bonus.sticky[0],9);
});
test('every 3x3 window, including an off-centre candidate, respects the cap',()=>{
 const m=board();for(const i of [0,1,5])m.grid[i]=9;assert.equal(math.canPlaceWild(m,12),false);m.grid[12]=9;math.enforceWildCap(m,rng);
 for(const w of math.layout(5).windows)assert.ok(w.filter(i=>m.grid[i]>=9&&m.grid[i]<13).length<=3);
});
test('safe separated Sticky Wilds are not subject to an arbitrary global count cap',()=>{
 const m=board(8,true);for(const i of [0,3,6,24,27,30,48])m.sticky[i]=9;assert.equal(math.canPlaceWild(m,54),true);
});
test('reject the one-base-cell Sticky trap even across different windows',()=>{
 const m=board(8,true);for(const i of [16,17,20,21])m.sticky[i]=9;assert.equal(math.canPlaceWild(m,19),false);
 m.sticky[19]=9;assert.equal(math.wildTrap(m),true);math.repairWildTraps(m,rng);assert.equal(math.wildTrap(m),false);
});
test('Scatter falls, credits once and never requests a refill; growth preserves Sticky',()=>{
 const m=board(5,true);m.grid.fill(-1);m.grid[0]=13;m.sticky[11]=10;math.gravity(m);assert.equal(m.grid[20],13);
 m.grid[21]=13;m.grid[22]=13;const fs=m.freeSpins;assert.equal(math.creditScatters(m,rng),3);assert.equal(m.freeSpins,fs+3);assert.equal(m.size,6);assert.equal(m.sticky[13],10);
 assert.equal(Array.from(m.grid).filter(x=>x===13).length,3);assert.equal(math.creditScatters(m,rng),0);assert.equal(m.freeSpins,fs+3);
});
test('8x8 still grants +3 spins without growth',()=>{
 const m=board(8,true);m.level=3;m.grid.fill(0);m.grid[0]=m.grid[1]=m.grid[2]=13;const fs=m.freeSpins;math.creditScatters(m,rng);assert.equal(m.size,8);assert.equal(m.freeSpins,fs+3);
});
test('generation never replaces surviving symbols on refill',()=>{
 const m=math.newBonus('super',rng);math.generate(m,rng);math.lockWilds(m);const old=Array.from(m.grid);m.grid[0]=-1;const added=math.generate(m,rng,{refill:true});assert.deepEqual(added,[0]);for(let i=1;i<25;i++)assert.equal(m.grid[i],old[i]);
});
test('outcomes do not depend on past winnings; seeded runs are reproducible',()=>{
 const a=math.newBonus('normal',math.seededRandom(1)),b=math.newBonus('normal',math.seededRandom(1));b.totalX=50000;
 math.generate(a,math.seededRandom(2));math.generate(b,math.seededRandom(2));assert.deepEqual(a.grid,b.grid);
 assert.deepEqual(math.runBonusSimulation(30,'super',{seed:43}),math.runBonusSimulation(30,'super',{seed:43}));
});
test('generated bonus spins satisfy Wild invariants and remove real base symbols',()=>{
 const m=math.newBonus('super',rng);
 for(let spin=0;spin<60&&m.freeSpins>0;spin++){
  const result=math.bonusSpin(m,rng);assert.equal(result.stopReason,'no-win');
  assert.equal(math.wildTrap(m),false);for(const w of math.layout(m.size).windows)assert.ok(w.filter(i=>m.sticky[i]>=9).length<=3);
 }
});
test('simulation rejects invalid counts and bonus types',()=>{
 assert.throws(()=>math.runBonusSimulation(0));assert.throws(()=>math.runBonusSimulation(2,'invalid'));
});
console.log(`${passed} tests passed`);
