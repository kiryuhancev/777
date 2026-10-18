/* Pure probability model. One seeded Fisher-Yates placement per paid round. */
const MINES_MODEL=(()=>{
 const C=MINES_CONFIG,N=C.rows*C.cols,round6=n=>Math.round(n*1e6)/1e6;
 const id=x=>typeof x==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
 function seeded(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function validCount(n){return Number.isInteger(n)&&n>=C.minMines&&n<=C.maxMines;}
 function probability(mines,picks){if(!validCount(mines)||!Number.isInteger(picks)||picks<0||picks>N-mines)throw Error('Invalid Mines probability');let p=1;for(let k=0;k<picks;k++)p*=(N-mines-k)/(N-k);return p;}
 function multiplier(mines,picks,config=C){return picks===0?1:Math.min(config.maxWinX,(1-config.houseEdge)/probability(mines,picks));}
 function placement(mines,seed){if(!validCount(mines)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid Mines seed/count');const a=Array.from({length:N},(_,i)=>i),rng=seeded(seed);for(let i=N-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,mines).sort((a,b)=>a-b);}
 function create({roundId=null,bet,mineCount=C.defaultMines,seed}){if(!Number.isFinite(bet)||bet<=0||bet>1e12)throw Error('Invalid Mines bet');return {version:C.version,roundId,bet,mineCount,seed,minePositions:placement(mineCount,seed),opened:[],status:'PLAYING',multiplier:1,payout:0};}
 const safePicks=r=>r.opened.filter(i=>!r.minePositions.includes(i)).length;
 function cashOut(r){if(r.status!=='PLAYING'||safePicks(r)<1)return r;const m=multiplier(r.mineCount,safePicks(r));return {...r,status:'CASHED_OUT',multiplier:m,payout:round6(r.bet*m)};}
 function pick(r,index){if(r.status!=='PLAYING'||!Number.isInteger(index)||index<0||index>=N||r.opened.includes(index))return r;const out={...r,opened:[...r.opened,index]};if(r.minePositions.includes(index))return {...out,status:'BUST',multiplier:0,payout:0};out.multiplier=multiplier(r.mineCount,out.opened.length);return out.opened.length===N-r.mineCount||out.multiplier>=C.maxWinX?cashOut(out):out;}
 function validate(x){try{
  if(!x||x.version!==C.version||!id(x.roundId)||!Number.isInteger(x.seed)||x.seed<0||x.seed>0xffffffff||!Number.isFinite(x.bet)||x.bet<=0||x.bet>1e12||!validCount(x.mineCount)||!['PLAYING','CASHED_OUT','BUST'].includes(x.status))return null;
  const positions=placement(x.mineCount,x.seed);if(JSON.stringify(positions)!==JSON.stringify(x.minePositions)||!Array.isArray(x.opened)||x.opened.length>N||new Set(x.opened).size!==x.opened.length||x.opened.some(i=>!Number.isInteger(i)||i<0||i>=N))return null;
  let r=create(x);for(const index of x.opened){if(r.status!=='PLAYING')return null;r=pick(r,index);}if(x.status==='CASHED_OUT'&&r.status==='PLAYING')r=cashOut(r);
  if(r.status!==x.status||Math.abs(r.multiplier-Number(x.multiplier))>1e-8||!Number.isFinite(x.multiplier)||r.payout!==x.payout)return null;
  return r;
 }catch{return null;}}
 function simulateMinesStrategy({mineCount=3,safePicks:target=3,rounds=100000,seed=12345,config=C}={}){
  probability(mineCount,target);if(target<1||!Number.isInteger(rounds)||rounds<1)throw Error('Invalid simulation strategy');let effectivePicks=target;for(let k=1;k<=target;k++)if(multiplier(mineCount,k,config)>=config.maxWinX){effectivePicks=k;break;}const rng=seeded(seed),p=probability(mineCount,effectivePicks),m=multiplier(mineCount,effectivePicks,config);let wins=0;
  // Reveal a fixed sequence against independently shuffled actual boards, not a target payout.
  for(let t=0;t<rounds;t++){const mines=placement(mineCount,Math.floor(rng()*4294967296));let survived=true;for(let k=0;k<effectivePicks;k++)if(mines.includes(k)){survived=false;break;}if(survived)wins++;}
  return {mineCount,safePicks:target,effectiveCashoutPicks:effectivePicks,rounds,seed,rtp:wins*m/rounds,theoreticalRtp:p*m,bustRate:1-wins/rounds,theoreticalBustRate:1-p,averageMultiplier:wins*m/rounds,cashoutMultiplier:m,capApplied:m<(1-config.houseEdge)/p};
 }
 return {seeded,probability,multiplier,placement,create,pick,cashOut,validate,safePicks,round6,simulateMinesStrategy};
})();
if(typeof window!=='undefined')window.simulateMinesStrategy=MINES_MODEL.simulateMinesStrategy;
