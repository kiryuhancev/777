const fs=require('fs'),M=require('../critter/model'),C=M.config;
const rng=M.seeded(21102026),id='11111111-1111-4111-8111-111111111111';
function stats(a,cost){const mean=a.reduce((s,x)=>s+x,0)/a.length,variance=a.reduce((s,x)=>s+(x-mean)**2,0)/(a.length-1),se=Math.sqrt(variance/a.length);return{count:a.length,mean,rtp:mean/cost,ci95:[(mean-1.96*se)/cost,(mean+1.96*se)/cost]};}
const data={};for(const purchaseType of ['bonus','super']){const a=[];for(let i=0;i<30000;i++)a.push(M.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:id,purchaseType}).payout);data[purchaseType]=stats(a,C.features[purchaseType+'Cost']);console.log(purchaseType,data[purchaseType]);}
const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;};
for(const boost of [false,true]){const a=[],freq={normal:0,super:0};for(let i=0;i<250000;i++){const p=M.spinPlan(M.channel(Math.floor(rng()*4294967296),0),{scatterBoost:boost});a.push(p.winX);if(p.scatters>=3)freq[p.scatters>=4?'super':'normal']++;}
 const p=C.scatterChance*(boost?C.features.scatterMultiplier:1),p3=choose(25,3)*p**3*(1-p)**22,p4=Array.from({length:22},(_,i)=>i+4).reduce((s,k)=>s+choose(25,k)*p**k*(1-p)**(25-k),0),cost=boost?C.features.boostCost:1,base=stats(a,1),ev=base.mean+p3*data.bonus.mean+p4*data.super.mean;
 data[boost?'boost':'base']={count:a.length,baseWin:base,triggerFrequency:freq,rtp:ev/cost,note:'Stratified estimate: exact Scatter trigger probabilities plus independent conditional bonus sample; max-win cap applied to bonuses. Base overlap with cap bounded by rare capped features.'};console.log(boost?'boost':'base',data[boost?'boost':'base']);}
fs.writeFileSync(require('path').resolve(__dirname,'../reports/critter-ways-rtp.json'),JSON.stringify({seed:21102026,config:C,results:data},null,2)+'\n');
