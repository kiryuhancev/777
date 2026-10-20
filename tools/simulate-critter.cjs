const M=require('../critter/model.js');
function simulate(n,seed=42917){const rng=M.seeded(seed);let sum=0,sq=0,hits=0,bonus=0,wildRuns=0,cascades=0,limit=0,max=0,clusterRaw=0,fixedBonus=0,bonusSum=0;
 for(let i=0;i<n;i++){
  const r=M.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:'11111111-1111-4111-8111-111111111111'}),plans=[r.base,...(r.bonus?[r.bonus.plan]:[])];
  sum+=r.payout;sq+=r.payout*r.payout;if(r.payout>0)hits++;max=Math.max(max,r.payout);cascades+=plans.reduce((n,p)=>n+p.steps.length,0);wildRuns+=plans.flatMap(p=>p.steps).reduce((n,s)=>n+s.moves.length,0);limit+=plans.filter(p=>p.limitReached).length;
  clusterRaw+=r.base.rawWinX+(r.bonus?r.bonus.plan.rawWinX*r.bonus.multiplier:0);
  if(r.bonus){bonus++;bonusSum+=r.bonus.winX;fixedBonus+=r.bonus.cashX*r.bonus.multiplier;}
 }
 const avg=sum/n,se=Math.sqrt(Math.max(0,sq/n-avg*avg)/n);
 return {paidCycles:n,seed,rtpPct:avg*100,approx95Pct:[(avg-1.96*se)*100,(avg+1.96*se)*100],hitPct:hits/n*100,bonusPct:bonus/n*100,bonusMeanInterval:bonus?n/bonus:null,averageBonusX:bonus?bonusSum/bonus:0,runningWildMoves:wildRuns,averageWinningCascades:cascades/n,cascadeLimits:limit,maxObservedX:max,clusterRawMean:clusterRaw/n,fixedBonusMean:fixedBonus/n};
}
if(require.main===module)console.log(JSON.stringify({config:M.config,result:simulate(Number(process.argv[2]||100000))},null,2));
module.exports=simulate;
