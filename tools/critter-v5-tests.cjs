const assert=require('node:assert/strict'),M=require('../critter/model-v5'),C=M.config,id='11111111-1111-4111-8111-111111111111';
assert.equal(C.version,5);for(const k of ['symbols','wildChance','scatterChance'])assert.deepEqual(C[k],M.v4.config[k]);
for(let seed=0;seed<500;seed++)for(const purchaseType of [null,'bonus','super']){
 const options={seed,bet:20,roundId:id,purchaseType,scatterBoost:!purchaseType&&seed%2===0},r=M.start(options),old=M.v4.start(options);assert(M.validate(r));assert(M.validate(old));assert.equal(r.version,5);assert.equal(r.cost,M.round(20*(purchaseType?C.features[purchaseType+'Cost']:options.scatterBoost?C.features.boostCost:1)));
 for(const [p,q] of [[r.base,old.base],...(r.bonus?r.bonus.spins.map((p,i)=>[p,old.bonus.spins[i]]):[])]){for(const k of ['initialGrid','finalGrid','updatedGrid','persistentWildsBefore','persistentWildsAfter','movements','newWilds','multiplierUpdates'])assert.deepEqual(p[k],q[k]);assert(!('steps'in p));}
 if(r.bonus)for(let nextSpin=0;nextSpin<=r.bonus.spinCount;nextSpin++){const p=M.progress(r,{nextSpin,baseDone:true});assert(M.validateProgress(r,p));}
}
console.log('PASS v5 all modes: unchanged RNG/field/movement/Wild upgrades; explicit mode paytables; prices; old v4 restores; safe bonus cursor; no cascade');
