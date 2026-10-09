'use strict';
// Monte Carlo uses the exact production physics/score. No fitted or fabricated payout.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const {loadPhysics}=require('./bird-physics.cjs');
const root=path.join(__dirname,'..');
function model(){const src=['config.js','model.js'].map(f=>fs.readFileSync(path.join(root,'bird',f),'utf8')).join('\n');return new Function('BIRD_PHYSICS',src+'\nreturn {M:BIRD_MODEL,C:BIRD_CONFIG};')(loadPhysics());}
const profiles={
 standard:(r,C)=>({vx:C.flight.nominalVx,vy:C.flight.nominalVy,steer:0}),
 mixedDrag:(r,C)=>{const angle=(10+r()*35)*Math.PI/180,pull=65+r()*55;return {vx:Math.cos(angle)*pull*C.sling.launchScale,vy:-Math.sin(angle)*pull*C.sling.launchScale,steer:0};},
 steerLeft:(r,C)=>({vx:C.flight.nominalVx,vy:C.flight.nominalVy,steer:-1}),
 steerRight:(r,C)=>({vx:C.flight.nominalVx,vy:C.flight.nominalVy,steer:1})
};
if(!isMainThread){
 const {M,C}=model();
 parentPort.on('message',task=>{
  if(task===null)return process.exit(0);
  const rows=[];
  for(let i=task.start;i<task.end;i++){
   // Uniform deterministic 32-bit seeds, independent from launch-policy draws.
   const seed=Math.floor(M.rng((i^workerData.masterSeed)>>>0)()*4294967296),input=profiles[task.profile](M.rng(seed^0x52a90b1f),C);
   const x=M.simulate(seed,20,input);rows.push({profile:task.profile,index:i,seed,...input,payout:x.payout,return:x.payout/20,route:x.routeType,
    archetype:x.buildingArchetype,size:x.buildingSize,bonuses:x.bonusesCollected.length,multiplier:x.multiplier,pigs:x.pigsDestroyed,blocks:x.blocksDestroyed,seconds:x.seconds});
  }parentPort.postMessage(rows);
 });
}else{
 const standard=Number(process.argv[2]||10000),sensitivity=Number(process.argv[3]||2000),workerCount=Number(process.argv[4]||4),masterSeed=0x20261009;
 if(![standard,sensitivity,workerCount].every(x=>Number.isInteger(x)&&x>0)||workerCount>8)throw Error('Usage: node tools/breakers-rtp.cjs [standard=10000] [eachSensitivity=2000] [workers=4]');
 const tasks=[],results=[],started=Date.now();for(const profile of Object.keys(profiles)){const count=profile==='standard'?standard:sensitivity;for(let start=0;start<count;start+=50)tasks.push({profile,start,end:Math.min(start+50,count)});}
 const total=standard+sensitivity*3;let done=0,finished=0;
 function summarize(rows){
  const n=rows.length,values=rows.map(x=>x.return).sort((a,b)=>a-b),sum=values.reduce((s,x)=>s+x,0),mean=sum/n;
  const sd=Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/(n-1)),margin=1.96*sd/Math.sqrt(n);
  const group=key=>Object.fromEntries([...new Set(rows.map(r=>r[key]))].sort().map(k=>{const a=rows.filter(r=>r[key]===k);return [k,{rounds:a.length,rtpPercent:a.reduce((s,r)=>s+r.return,0)/a.length*100}];}));
  const max=rows.reduce((a,b)=>a.return>b.return?a:b);
  return {rounds:n,totalWager:n*20,totalPayout:sum*20,rtpPercent:mean*100,
   approximate95PercentInterval:[Math.max(0,(mean-margin)*100),(mean+margin)*100],
   positivePayoutPercent:rows.filter(r=>r.payout>0).length/n*100,profitableRoundPercent:rows.filter(r=>r.return>1).length/n*100,
   medianReturn:values[Math.floor(n*.5)],p95Return:values[Math.floor(n*.95)],p99Return:values[Math.floor(n*.99)],maximum:max,
   topOnePercentPayoutShare:values.slice(Math.floor(n*.99)).reduce((s,x)=>s+x,0)/sum,
   byRoute:group('route'),byBuildingSize:group('size')};
 }
 function finish(){
  results.sort((a,b)=>a.profile.localeCompare(b.profile)||a.index-b.index);
  const hash=crypto.createHash('sha256');for(const f of ['bird/config.js','bird/model.js','tools/bird-physics.cjs'])hash.update(fs.readFileSync(path.join(root,f)));
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');hash.update(html.slice(html.indexOf('// BIRD RIGID BODY ENGINE'),html.indexOf('// END BIRD RIGID BODY ENGINE')));
  const report={generatedAt:new Date().toISOString(),masterSeed,simulation:'Exact production rigid-body engine and unchanged payout formula, DT=1/120',
   modelSha256:hash.digest('hex'),elapsedSeconds:(Date.now()-started)/1000,workers:workerCount,
   formula:'RTP = sum(payout) / sum(bet) * 100; bet = 20 in all samples',
   policies:{standard:'Nominal button launch vx=660, vy=-290, no correction',mixedDrag:'Uniform pull 65–120, angle 10–45 degrees, no correction',steerLeft:'Nominal launch, constant correction -1',steerRight:'Nominal launch, constant correction +1'},
   limitations:['Monte Carlo estimate for each stated policy, not a single policy-independent theoretical RTP.','Approximate normal 95% intervals may be optimistic for rare multiplier chains; larger samples are needed for calibration.','No target RTP or payout parameters were adjusted.'],
   profiles:Object.fromEntries(Object.keys(profiles).map(k=>[k,summarize(results.filter(r=>r.profile===k))]))};
  const dir=path.join(root,'reports');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'breakers-rtp.json'),JSON.stringify(report,null,2)+'\n');
  const keys=Object.keys(results[0]);fs.writeFileSync(path.join(dir,'breakers-rtp.csv'),keys.join(',')+'\n'+results.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
  console.log(JSON.stringify(report,null,2));
 }
 for(let i=0;i<workerCount;i++){
  const w=new Worker(__filename,{workerData:{masterSeed}});
  w.on('message',rows=>{results.push(...rows);done+=rows.length;if(done%1000===0)console.log(`Simulated ${done}/${total} actual physical rounds`);if(tasks.length)w.postMessage(tasks.shift());else w.postMessage(null);});
  w.on('error',e=>{console.error(e);process.exit(1);});
  w.on('exit',code=>{if(code!==0)process.exit(code);if(++finished===workerCount)finish();});
  w.postMessage(tasks.shift()||null);
 }
}
