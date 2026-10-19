/* Mode pricing uses actual playable models, not predetermined payout targets. */
const fs=require('fs'),vm=require('vm'),H=require('../heist/model.js'),HC=require('../heist/config.js');const box=vm.createContext({});vm.runInContext(['swamp/config.js','swamp/model.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n')+'\nglobalThis.M=SWAMP_MODEL;globalThis.C=SWAMP_CONFIG;',box);const S=box.M,SC=box.C;
const id='11111111-1111-4111-8111-111111111111',selected=process.argv[2],results=selected?JSON.parse(fs.readFileSync('reports/slot-features-math.json')).results.filter(r=>r.game!=='vault_heist'||r.mode==='heist'):[];
function finish(a,n,cost){const mean=a.sum/n,variance=Math.max(0,a.square/n-mean*mean),se=Math.sqrt(variance/n)/cost;return {...a,spins:n,costX:cost,meanPayoutX:mean,rtp:mean/cost,standardError:se,rtp95:[Math.max(0,mean/cost-1.96*se),mean/cost+1.96*se],triggerFrequency:a.triggers/n};}
for(const mode of (selected?['boost','super']:['boost','heist','super']))for(const strategy of ['SAFE','BALANCED','AGGRESSIVE']){
 const n=100000,rng=H.seeded(830451),a={game:'vault_heist',mode,strategy,sum:0,square:0,triggers:0,busts:0,max:0};
 for(let i=0;i<n;i++){let r=H.start({seed:Math.floor(rng()*4294967296),bet:1,roundId:id,scatterBoost:mode==='boost',purchaseType:mode==='boost'?null:mode});if(H.active(r))a.triggers++;
  while(H.active(r)){const collect=strategy==='SAFE'||strategy==='BALANCED'&&r.stage>=2;r=H.advance(r,r.status==='STAGE'?'spin':collect?'collect':'deeper');}
  a.sum+=r.payout;a.square+=r.payout*r.payout;a.max=Math.max(a.max,r.payout);if(r.result==='alarm')a.busts++;
 }
 const cost=mode==='boost'?HC.scatterBoost.costMultiplier:HC.purchases.find(x=>x.id===mode).costX;const result=finish(a,n,cost);results.push(result);console.log(mode,strategy,(result.rtp*100).toFixed(3)+'%',result.rtp95.map(n=>(n*100).toFixed(2)).join('..'));
}
for(const boost of (selected?[]:[false,true])){
 const n=1000000,rng=S.seeded(953174),a={game:'swamp',mode:boost?'boost':'normal',sum:0,square:0,triggers:0,max:0};
 for(let i=0;i<n;i++){let e=S.resolve(S.generate(false,rng,SC,boost)),total=e.winX;if(e.triggerSpins){a.triggers++;let b={...S.newBonus(e.scatters,1,SC,e.winX),featureId:id};while(b.remaining>0){e=S.resolve(S.generate(true,rng),b);b=e.nextBonus;total+=e.winX;}}
 a.sum+=total;a.square+=total*total;a.max=Math.max(a.max,total);}
 const result=finish(a,n,boost?SC.scatterBoost.costMultiplier:1);results.push(result);console.log('swamp',a.mode,(result.rtp*100).toFixed(3)+'%',result.rtp95.map(n=>(n*100).toFixed(2)).join('..'));
}
for(const r of results)if(r.game==='vault_heist'&&r.mode==='heist')Object.assign(r,finish(r,r.spins,HC.purchases.find(o=>o.id==='heist').costX));
fs.writeFileSync('reports/slot-features-math.json',JSON.stringify({heistConfig:HC,swampConfig:SC,seed:{heist:830451,swamp:953174},results},null,2)+'\n');
