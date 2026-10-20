const M=require('../magnet/features-model.js'),L=require('../magnet/model.js');
function simulate(n,seed=87431){const rng=L.seeded(seed);let sum=0,sq=0,hits=0,wheels=0,bonuses=0,bonusX=0,baseX=0,max=0,spins=0,extensions=0;const outcomes={};
 for(let i=0;i<n;i++){
  let r=M.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:'11111111-1111-4111-8111-111111111111'});const p=r.magneticPlan;baseX+=p.winX;
  if(p.wheel){wheels++;outcomes[p.wheel.id]=(outcomes[p.wheel.id]||0)+1;}if(M.active(r)){bonuses++;while(M.active(r))r=M.advance(r);bonusX+=r.bonus.collectedX*r.bonus.power;spins+=r.step;extensions+=r.bonus.extensions;}
  sum+=r.payout;sq+=r.payout*r.payout;if(r.payout>0)hits++;max=Math.max(max,r.payout);
 }
 const mean=sum/n,se=Math.sqrt(Math.max(0,sq/n-mean*mean)/n);
 return {paidCycles:n,seed,rtpPct:mean*100,approx95Pct:[(mean-1.96*se)*100,(mean+1.96*se)*100],hitPct:hits/n*100,wheelPct:wheels/n*100,bonusPct:bonuses/n*100,bonusMeanInterval:bonuses?n/bonuses:null,averageBonusX:bonuses?bonusX/bonuses:0,baseRtpPct:baseX/n*100,bonusRtpPct:bonusX/n*100,averageBonusSpins:bonuses?spins/bonuses:0,extensions,maxObservedX:max,outcomes};
}
if(require.main===module){const n=Number(process.argv[2]||100000);console.log(JSON.stringify({config:M.config,result:simulate(n)},null,2));}
module.exports=simulate;
