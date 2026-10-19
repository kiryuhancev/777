const fs=require('fs'),vm=require('vm'),cp=require('child_process'),assert=require('assert/strict'),H=require('../heist/model.js'),C=require('../heist/config.js');
function load(files,source=f=>fs.readFileSync(f,'utf8')){const b=vm.createContext({});vm.runInContext(files.map(source).join('\n')+'\nglobalThis.H=typeof VAULT_HEIST_MODEL!=="undefined"?VAULT_HEIST_MODEL:null;globalThis.S=typeof SWAMP_MODEL!=="undefined"?SWAMP_MODEL:null;',b);return b;}
const compare=!process.argv.includes('--modes-only'),old=compare?load(['heist/config.js','heist/model.js','swamp/config.js','swamp/model.js'],f=>cp.execFileSync('git',['show','cb4f619:'+f],{encoding:'utf8'})):null,now=load(['swamp/config.js','swamp/model.js']),S=now.S,id='11111111-1111-4111-8111-111111111111';
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
for(let seed=1;compare&&seed<=500;seed++){
 let a=old.H.start({seed,bet:20,roundId:id}),b=H.start({seed,bet:20,roundId:id});same(a,b);while(H.active(b)){const action=b.status==='STAGE'?'spin':'deeper';a=old.H.advance(a,action);b=H.advance(b,action);same(a,b);}assert(H.validate(b));
 for(const bonus of [false,true])same(old.S.generate(bonus,old.S.seeded(seed)),S.generate(bonus,S.seeded(seed)));
}
if(compare)console.log('PASS all unboosted Heist rounds/steps and Swamp scenes match prior release; old checkpoints still validate');
for(const purchaseType of ['heist','super']){
 const offer=C.purchases.find(o=>o.id===purchaseType);let r=H.start({seed:981,bet:20,roundId:id,purchaseType});assert.equal(r.version,2);assert.equal(H.cost(r),20*offer.costX);assert.equal(r.baseWinX,0);assert.equal(r.lootX,offer.lootX);assert.equal(r.remaining,3);assert.equal(r.outcome.scatters,0);assert(H.validate(r));
 for(let i=0;i<3;i++){r=H.advance(r,'spin');assert.equal(H.cost(r),20*offer.costX);assert(H.validate(r));}
 assert.equal(r.status,'CHOICE');const done=H.advance(r,'collect');assert.equal(done.payout,H.round((done.baseWinX+done.lootX)*20));same(H.advance(done,'collect'),done);assert(H.validate(done));assert.equal(H.validate({...r,cost:r.cost-1}),null);
}
console.log('PASS purchases freeze base bet and one paid cost; no fake Scatter outcome; free spins/collect/reload idempotence');
const boosted=H.start({seed:77,bet:20,roundId:id,scatterBoost:true});assert.equal(H.cost(boosted),30);assert(H.validate(boosted));assert.equal(H.validate({...boosted,scatterBoost:false}),null);assert.throws(()=>H.start({seed:1,bet:20,roundId:id,purchaseType:'heist',scatterBoost:true}));
for(let seed=1;seed<500;seed++){same(S.generate(true,S.seeded(seed)),S.generate(true,S.seeded(seed),undefined,true));same(H.generate(0,H.seeded(seed)),H.generate(0,H.seeded(seed),true));}
console.log('PASS Boost increases paid cost only; mode is immutable; bonus RNG unaffected; no stacked purchase surcharge');
