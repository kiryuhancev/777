/* Simulation-only instrumentation: omit trace snapshots, execute the same source math. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
function load(name,legacy){const source=fs.readFileSync(path.join(__dirname,'../critter',name),'utf8');assert(source.includes('const copy=v=>JSON.parse(JSON.stringify(v))'));const module={exports:{}};vm.runInNewContext(source.replace('const copy=v=>JSON.parse(JSON.stringify(v))','const copy=v=>v'),{module,require:p=>p==='./model-v1.js'?legacy:require(path.join(__dirname,'../critter',p))});return module.exports;}
const legacy=load('model-v1.js'),fast=load('model-v2.js',legacy),M=require('../critter/model-v2'),id='11111111-1111-4111-8111-111111111111';
// Snapshot references may change; RNG, plans' wins, final grids and financial totals must not.
for(let seed=0;seed<10000;seed++){
 const args={seed,bet:1,roundId:id},a=M.start(args),b=fast.start(args);
 assert.equal(b.payout,a.payout);assert.equal(b.winX,a.winX);assert.equal(b.base.scatters,a.base.scatters);
 assert.equal(JSON.stringify(b.base.finalGrid),JSON.stringify(a.base.finalGrid));
 if(a.bonus){assert.equal(b.bonus.winX,a.bonus.winX);assert.equal(JSON.stringify(b.bonus.spins.map(p=>p.finalGrid)),JSON.stringify(a.bonus.spins.map(p=>p.finalGrid)));}
}
const n=Number(process.argv[2]||2000000),seed=Number(process.argv[3]||20261020),rng=M.seeded(seed);let sum=0,sq=0,hits=0,bonus=0,superBonus=0,baseSum=0,bonusSum=0,max=0;
for(let i=0;i<n;i++){
 const r=fast.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:id});sum+=r.payout;sq+=r.payout*r.payout;hits+=r.payout>0;bonus+=!!r.bonus;superBonus+=r.bonus?.kind==='super';baseSum+=r.base.winX;bonusSum+=r.bonus?.winX||0;max=Math.max(max,r.winX);
}
const mean=sum/n,se=Math.sqrt(Math.max(0,sq/n-mean*mean)/n),report={paidCycles:n,seed,payScale:M.config.payScale,rtpPct:mean*100,approx95Pct:[(mean-1.96*se)*100,(mean+1.96*se)*100],hitPct:hits/n*100,bonuses:bonus,superBonuses:superBonus,bonusInterval:n/bonus,baseRtpPct:baseSum/n*100,bonusRtpPct:bonusSum/n*100,maxObservedX:max,method:'Independent seeds; actual source model with JSON trace snapshots disabled ONLY in this simulator. Verified exact payouts and final grids against unmodified model on10000 seeds. Estimate, not an exact theoretical RTP.'};
fs.writeFileSync('reports/critter-v2-final-rtp.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
