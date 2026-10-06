'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadMath}=require('./slot-math.cjs');
const math=loadMath(),started=performance.now();
const count=Number(process.argv[2]||100000),seed=77743;
const report={version:math.CONFIG.version,seed,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..','index.html'))).digest('hex'),configuration:math.CONFIG,checks:{}};
for(const type of ['normal','super']){
 report.checks[type]=math.runBonusSimulation(count,type,{seed});console.log(type,JSON.stringify(report.checks[type]));
}
for(const boost of [false,true]){
 const name=boost?'baseBoost':'base';report.checks[name]=math.runBaseSimulation(count*2,{seed,boost});console.log(name,JSON.stringify(report.checks[name]));
}
report.seconds=(performance.now()-started)/1000;
fs.writeFileSync(path.join(__dirname,'..','reports',`simulation-${math.CONFIG.version}.json`),JSON.stringify(report,null,2)+'\n');
console.log('seconds',report.seconds);
if(Object.values(report.checks).some(r=>r.guardHits||r.unfinished))process.exitCode=1;
