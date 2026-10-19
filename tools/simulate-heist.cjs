const fs=require('fs'),M=require('../heist/model.js'),C=require('../heist/config.js');
function simulateVaultHeist({spins,strategy,seed=80391,threshold=30}){
 const rng=M.seeded(seed),a={spins,strategy,seed,totalBet:spins,totalPayout:0,baseHits:0,triggers:0,busts:0,heistValue:0,cashouts:0,cashoutSum:0,maxWin:0,stageReach:Array(6).fill(0)};
 for(let i=0;i<spins;i++){
  let r=M.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:'00000000-0000-4000-8000-000000000000'});if(r.baseWinX>0)a.baseHits++;if(M.active(r)){a.triggers++;a.stageReach[0]++;}
  while(M.active(r)){if(r.status==='STAGE')r=M.advance(r,'spin');else{const collect=strategy==='SAFE'||strategy==='BALANCED'&&r.stage>=2||strategy==='THRESHOLD'&&r.lootX>=threshold;r=M.advance(r,collect?'collect':'deeper');if(!collect&&r.status==='STAGE')a.stageReach[r.stage]++;}}
  a.totalPayout+=r.payout;a.maxWin=Math.max(a.maxWin,r.payout);if(r.result==='alarm')a.busts++;if(r.completed.length){a.heistValue+=r.payout-r.baseWinX;if(r.result!=='alarm'){a.cashouts++;a.cashoutSum+=r.lootX;}}
 }
 return {...a,rtp:a.totalPayout/spins,baseHitRate:a.baseHits/spins,triggerFrequency:a.triggers/spins,averageRoundsBetweenHeists:spins/a.triggers,averageHeistValue:a.heistValue/a.triggers,bustRate:a.busts/a.triggers,averageCashout:a.cashoutSum/a.cashouts};
}
module.exports={simulateVaultHeist};
if(require.main===module){const results=[];for(const spins of [10000,100000])for(const strategy of ['SAFE','BALANCED','AGGRESSIVE']){const r=simulateVaultHeist({spins,strategy});results.push(r);console.log(spins,strategy,(r.rtp*100).toFixed(3)+'%',r.triggers);}
 fs.writeFileSync('reports/heist-simulation.json',JSON.stringify({config:C,results},null,2)+'\n');}
