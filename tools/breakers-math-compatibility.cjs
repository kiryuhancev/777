'use strict';
// The user's visual update may change timing, but must not retune payouts/RNG.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=cp.execFileSync('git',['show','d64b0a7:index.html'],{cwd:root,maxBuffer:30*1024*1024}).toString();
const engine=html.slice(html.indexOf('// BIRD RIGID BODY ENGINE'),html.indexOf('// END BIRD RIGID BODY ENGINE'));
const previous=['config.js','model.js'].map(f=>cp.execFileSync('git',['show',`d64b0a7:bird/${f}`],{cwd:root}).toString()).join('\n');
const current=['config.js','model.js'].map(f=>fs.readFileSync(path.join(root,'bird',f),'utf8')).join('\n');
const old=new Function(engine+'\n'+previous+'\nreturn BIRD_MODEL;')(),now=new Function(engine+'\n'+current+'\nreturn BIRD_MODEL;')();
assert.equal(fs.readFileSync(path.join(root,'bird/config.js'),'utf8'),cp.execFileSync('git',['show','d64b0a7:bird/config.js'],{cwd:root}).toString());
for(let seed=0;seed<3000;seed++){
 const p=now.plan(seed,20),prior=old.plan(seed,20);
 assert.deepEqual(p.buildingPlan,prior.buildingPlan);assert.deepEqual(p.flightPlan.bonusSpawns,[]);
 assert.deepEqual(now.flightBonuses(p.flightPlan),prior.flightPlan.bonusSpawns);
}
for(let seed=0;seed<30;seed++)assert.deepEqual(now.simulate(seed,20),old.simulate(seed,20));
console.log('PASS unchanged config; 3000 matching seeded scene/core plans and 30 identical actual physical payouts');
