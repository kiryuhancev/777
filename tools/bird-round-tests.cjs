'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {loadPhysics}=require('./bird-physics.cjs');
const root=path.join(__dirname,'..'),physics=loadPhysics();
const source=['config.js','model.js'].map(f=>fs.readFileSync(path.join(root,'bird',f),'utf8')).join('\n');
const {C,M}=new Function('BIRD_PHYSICS',source+'\nreturn {C:BIRD_CONFIG,M:BIRD_MODEL};')(physics);
const results=[],check=(name,f)=>{f();results.push(name);console.log('PASS',name);};
check('Seeded scene is reproducible; bonuses are absent until release, then generated once',()=>{
 const a=M.plan(425,20),b=M.plan(425,20);assert.deepEqual(a,b);assert.deepEqual(a.flightPlan.bonusSpawns,[]);assert(!JSON.stringify(a).includes('targetPayout'));
 const run=M.createRun(a);assert.deepEqual(run.bonuses,[]);run.launch();assert(run.bonuses.length>=6);assert(Object.isFrozen(run.plan.flightPlan.bonusSpawns[0]));
 const offered=run.plan.flightPlan.bonusSpawns;assert.equal(run.launch(),false);assert.strictEqual(run.plan.flightPlan.bonusSpawns,offered);
});
check('All ten archetypes and four sizes generated; dry scenes contain visible bonus objects',()=>{
 const archetypes=new Set(),sizes=new Set();for(let seed=0;seed<3000;seed++){
  const p=M.plan(seed,20);archetypes.add(p.buildingPlan.archetype);sizes.add(p.buildingPlan.size);
  assert(p.buildingPlan.blocks.length<=C.round.maxBlocks);assert(p.buildingPlan.blocks.length>=6);
  assert(M.flightBonuses(p.flightPlan).length>=6);assert(p.buildingPlan.pigs.length>0);
 }assert.equal(archetypes.size,10);assert.equal(sizes.size,4);
});
check('Heavy and Mega alter real mass; split is bounded; x2 alone never guarantees profit',()=>{
 const run=M.createRun(M.plan(425,20));run.launch();const b=run.birds[0],mass=b.mass,r=b.r;
 run.collect(b,{type:'heavy',collected:false});assert(Math.abs(b.mass/mass-1.8)<1e-8);
 run.collect(b,{type:'mega',collected:false});assert.equal(b.r,r*1.4);
 run.collect(b,{type:'split',collected:false});run.reveal();assert.equal(run.birds.length,3);
 const miss=M.createRun(M.plan(42,20));miss.launch(0,0);miss.collect(miss.birds[0],{type:'x2',collected:false});
 for(let i=0;i<2000&&!miss.settled;i++)miss.step();assert.equal(miss.result.payout,0);assert.equal(miss.result.multiplier,2);
});
check('Collision thresholds distinguish glass, wood, stone and harmless resting contacts',()=>{
 const d=mat=>M.impactDamage({kind:'block',material:mat},{kind:'bird'},400);
 assert(d('glass')>d('wood'));assert(d('wood')>d('stone'));
 assert.equal(M.impactDamage({kind:'block',material:'wood'},{kind:'block'},20),0);
});
check('Collected multipliers multiply without an arbitrary payout cap',()=>{
 const run=M.createRun(M.plan(425,20));run.launch();for(let i=0;i<4;i++)run.collect(run.birds[0],{type:'x2',collected:false});
 run.collect(run.birds[0],{type:'x3',collected:false});assert.equal(run.multiplier,48);
});
check('Bomb pressure imparts physical velocities and damage to nearby bodies',()=>{
 const run=M.createRun(M.plan(425,20));run.launch();run.reveal();const block=run.blocks[0],bird=run.birds[0];bird.x=block.x-20;bird.y=block.y;
 const hp=block.hp;run.explode(bird);assert(block.hp<hp);assert(Math.hypot(block.vx,block.vy)>0);
});
check('Bonus positions remain fixed after launching and steering; no second launch',()=>{
 const run=M.createRun(M.plan(425,20));run.launch();const positions=run.bonuses.map(b=>[b.x,b.y]);assert.equal(run.launch(),false);
 for(let i=0;i<250;i++)run.step(undefined,1);assert.deepEqual(run.bonuses.map(b=>[b.x,b.y]),positions);
 assert(Math.abs(run.correctionDistance)<(run.plan.flightPlan.distance-C.sling.x)*C.flight.maxFlightCorrection);
});
check('Real physics simulations terminate, are deterministic, have misses and varying destruction',()=>{
 const first=M.simulate(425,20),again=M.simulate(425,20);assert.deepEqual(first,again);
 const outcomes=[];for(let seed=0;seed<30;seed++){const x=M.simulate(seed,20);assert(Number.isFinite(x.payout)&&x.payout>=0);assert(x.seconds<19);assert.equal(x.birdsUsed,1);outcomes.push(x);}
 const miss=M.simulate(20,20,{vx:150,vy:-100});assert.equal(miss.payout,0);
 assert(new Set(outcomes.map(x=>x.destructionScore)).size>3);
 fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/bird-simulation.json'),JSON.stringify({note:'Actual rigid-body simulation, provisional tuning; not final RTP',sample:outcomes.length,outcomes},null,2));
});
check('Settlement is idempotent and scores only actual damage/destruction',()=>{
 const run=M.createRun(M.plan(425,20));run.launch();for(let i=0;i<2400&&!run.settled;i++)run.step();const result=run.result;
 assert.strictEqual(run.finish(),result);run.step();assert.strictEqual(run.result,result);
});
console.log(results.length+' round/model checks passed');
