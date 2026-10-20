const assert=require('node:assert/strict'),M=require('../critter/model'),C=M.config,id='11111111-1111-4111-8111-111111111111';
assert.deepEqual(C.symbols,M.v3.config.symbols);for(const k of ['payScale','scatterChance','wildChance','maxWinX'])assert.equal(C[k],M.v3.config[k]);
// Explicit x8+x2 proof: base substitution remains x1; bonus sums to x10.
const sample=Array.from({length:25},(_,uid)=>({uid,symbol:C.symbols[(uid+3)%8].id}));
for(let i=0;i<5;i++)sample[i]={uid:i,symbol:i<2?'wild':'ten',...(i<2?{multiplier:i===0?8:2}:{})};
assert.equal(M.evaluate(sample).wins.find(w=>w.symbol==='ten').multiplier,1);
assert.equal(M.evaluate(sample,{bonus:true}).wins.find(w=>w.symbol==='ten').multiplier,10);
let bonuses=0,moves=0,upgrades=0,baseWilds=0,plain=0,boost=0,summed=0;
for(let seed=0;seed<5000;seed++){
 const r=M.start({seed,bet:20,roundId:id});assert.deepEqual(M.validate(r),r);assert(!('steps' in r.base));assert.deepEqual(r.base.initialGrid,r.base.finalGrid);assert.equal(r.base.movements.length,0);assert.equal(r.base.multiplierUpdates.length,0);assert.equal(r.base.persistentWildsAfter.length,0);
 for(const w of r.base.wins)assert.equal(w.multiplier,1);for(const t of r.base.finalGrid)if(t.symbol==='wild'){assert.equal(t.multiplier,1);baseWilds++;}
 assert.equal(r.base.winX,M.evaluate(r.base.finalGrid).winX);plain+=r.base.scatters;boost+=M.start({seed,bet:20,roundId:id,scatterBoost:true}).base.scatters;
 if(r.bonus){bonuses++;checkBonus(r);}
}
function checkBonus(r){let before=[];for(const [idx,p] of r.bonus.spins.entries()){
 assert.deepEqual(p.persistentWildsBefore,before);assert(!('steps' in p));assert.equal(p.movements.length,before.length);assert.equal(new Set(p.persistentWildsAfter.map(w=>w.cell)).size,p.persistentWildsAfter.length);
 for(const move of p.movements){const w=before.find(w=>w.id===move.wildId);assert.equal(w.cell,move.from);assert.notEqual(move.from,move.to);assert.equal(p.finalGrid[move.to].wildId,w.id);moves++;}
 for(const w of p.newWilds)assert.equal(w.multiplier,1);
 const expected=M.evaluate(p.finalGrid,{bonus:true});assert.deepEqual(expected.wins,p.wins);assert.equal(expected.winX,p.winX);
 for(const win of p.wins){const wilds=win.positions.map(i=>p.finalGrid[i]).filter(t=>t.symbol==='wild');assert.equal(win.multiplier,Math.max(1,wilds.reduce((n,t)=>n+t.multiplier,0)));if(wilds.length>1)summed++;}
 const active=new Set(p.activeWilds.map(i=>p.finalGrid[i].wildId));for(const w of p.persistentWildsAfter){const t=p.finalGrid[w.cell];assert.equal(w.id,t.wildId);assert.equal(w.multiplier,t.multiplier*(active.has(w.id)?2:1));if(active.has(w.id))upgrades++;}
 before=p.persistentWildsAfter;const cursor=M.progress(r,{baseDone:true,nextSpin:idx+1});assert.deepEqual(M.validateProgress(r,cursor),cursor);assert.deepEqual(cursor.persistentWilds,before);assert.equal(cursor.remainingFreeSpins,r.bonus.spinCount-idx-1);
 const tamper=structuredClone(cursor);tamper.remainingFreeSpins++;assert.equal(M.validateProgress(r,tamper),null);
 }assert.deepEqual(r.bonus.persistentWilds,before);assert.deepEqual(M.progress(r,{baseDone:true,nextSpin:r.bonus.spinCount,complete:true}).persistentWilds,[]);}
for(const purchaseType of ['bonus','super'])for(let seed=0;seed<200;seed++){const r=M.start({seed,bet:20,roundId:id,purchaseType});checkBonus(r);assert.equal(r.cost,20*C.features[purchaseType+'Cost']);assert.equal(r.base.winX,0);assert.equal(r.base.scatters,0);assert.equal(r.bonus.spinCount,purchaseType==='super'?20:10);assert.deepEqual(M.validate(r),r);}
// Saturated fields: simultaneous identity rotation, with unique final positions and no lost Wild.
for(const count of [1,2,12,24,25]){const wilds=Array.from({length:count},(_,cell)=>({id:'saturated_'+cell,cell,multiplier:2}));for(let seed=0;seed<30;seed++){const p=M.spinPlan(seed,{bonus:true,persistentWilds:wilds});assert.equal(p.movements.length,count);assert(p.movements.every(m=>m.from!==m.to));assert.equal(new Set(p.persistentWildsAfter.map(w=>w.cell)).size,p.persistentWildsAfter.length);}}
for(const model of [M.legacy,M.previous,M.v3]){const r=model.start({seed:63,bet:20,roundId:id});assert.deepEqual(M.validate(r),r);}
assert(bonuses&&moves&&upgrades&&summed&&baseWilds);assert(boost/plain>1.35&&boost/plain<1.7);
console.log(`PASS 5000 base plans: no cascade, standard x1 Wild; ${bonuses} natural bonuses; ${moves} deterministic moves; ${upgrades} persistent upgrades; ${summed} summed clusters; 400 bonus buys; saturated fields; stable progress/tamper; legacy1/2/3; Scatter ratio ${(boost/plain).toFixed(3)}; unchanged PRNG/weights/raw paytable/payScale`);
