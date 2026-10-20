// Historical initial200k exploration; final expanded calibration is documented in reports/critter-v2-recalibration.json. Does not edit config.
const M=require('../critter/model'),fs=require('node:fs'),n=200000,rng=M.seeded(42917),raw=[];
for(let i=0;i<n;i++){
 const r=M.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:'11111111-1111-4111-8111-111111111111'});
 raw.push([r.base,...(r.bonus?.spins||[])].reduce((n,p)=>n+p.steps.reduce((n,s)=>n+s.wins.reduce((n,w)=>n+w.rawWinX*w.multiplier,0),0),0));
}
const mean=scale=>raw.reduce((n,v)=>n+Math.min(10000,v*scale),0)/n;
let lo=0,hi=3.7256;for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(mean(mid)>.96)hi=mid;else lo=mid;}
const scale=Number(((lo+hi)/2).toPrecision(12));
fs.writeFileSync('reports/critter-v2-calibration.json',JSON.stringify({paidCycles:n,seed:42917,targetRtpPct:96,payScale:scale,estimatedRtpPct:mean(scale)*100,method:'Binary search of E[min(10000, weighted cluster total × payScale)] on fixed seeded paths. Independent simulation validates rounded actual model.'},null,2)+'\n');console.log(scale);
