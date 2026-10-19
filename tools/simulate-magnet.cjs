const fs=require('fs'),M=require('../magnet/model.js'),C=M.config;
function simulateMagnetSpins(count,seed=87431){
 if(!Number.isInteger(count)||count<1||!Number.isInteger(seed))throw Error('Invalid simulation input');
 const rng=M.seeded(seed);let sum=0,squares=0,hits=0,triggers=0,bonusSum=0,max=0,moved=0,specials=0,plans=0,effects=0;const specialCounts={};
 function observe(p,base){plans++;const movements=p.orderedEffects.filter(e=>e.from!==undefined);if(base&&movements.length)moved++;effects+=movements.length;const a=p.orderedEffects.filter(e=>!['attract','repel'].includes(e.kind));if(a.length)specials++;for(const e of a)specialCounts[e.kind]=(specialCounts[e.kind]||0)+1;}
 for(let i=0;i<count;i++){const roundSeed=Math.floor(rng()*4294967296),base=M.plan(roundSeed);observe(base,true);let win=base.winX,bonus=0;
  if(base.scatters>=C.overdrive.scatterCount){triggers++;for(let j=1;j<=C.overdrive.spins&&win<C.maxWinX;j++){const p=M.plan(roundSeed,j);observe(p,false);const added=Math.min(p.winX,C.maxWinX-win);bonus+=added;win+=added;}}
  win=Math.min(C.maxWinX,win);sum+=win;squares+=win*win;if(win>0)hits++;max=Math.max(max,win);bonusSum+=bonus;
 }
 const mean=sum/count,se=Math.sqrt(Math.max(0,squares/count-mean*mean)/count);
 return {paidRounds:count,seed,rtpPercent:mean*100,approx95IntervalPercent:[(mean-1.96*se)*100,(mean+1.96*se)*100],hitRate:hits/count,averageWinX:mean,magneticMovementFrequency:moved/count,averageSwapsPerResolvedSpin:effects/plans,specialActivationFrequency:specials/plans,specialCounts,overdriveCount:triggers,overdriveFrequency:triggers/count,averageSpinsBetweenOverdrives:triggers?count/triggers:null,averageOverdrivePayoutX:triggers?bonusSum/triggers:0,maxObservedWinX:max};
}
if(require.main===module){const results=[10000,100000].map(n=>simulateMagnetSpins(n));const report={config:C,method:'Seeded paid rounds; all earned Overdrive spins included; no DOM, wallet/history input or payout-conditioned movement. Approximate normal interval for a finite high-volatility sample.',results};fs.writeFileSync('reports/magnet-simulation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(results,null,2));}
module.exports={simulateMagnetSpins};
