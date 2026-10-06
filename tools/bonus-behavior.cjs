'use strict';
const fs=require('node:fs');const math=require('./slot-math.cjs').loadMath();
const report={version:math.CONFIG.version,sessionsPerType:10000,types:{}};
for(const type of ['normal','super']){
 const rng=math.seededRandom(4521),levels=Array.from({length:4},()=>({spins:0,empty:0,wildSum:0,maxWilds:0,threePlus:0}));
 for(let session=0;session<report.sessionsPerType;session++){
  const m=math.newBonus(type);
  while(m.freeSpins>0){const level=m.level,result=math.bonusSpin(m,rng),wilds=Array.from(m.sticky).filter(t=>t>=9).length,s=levels[level];
   if(result.stopReason!=='no-win')throw Error('Cascade guard');
   s.spins++;s.empty+=result.totalX===0;s.wildSum+=wilds;s.maxWilds=Math.max(s.maxWilds,wilds);s.threePlus+=wilds>=3;
  }
 }
 for(const s of levels){s.emptyPercent=100*s.empty/s.spins;s.meanWilds=s.wildSum/s.spins;s.threePlusPercent=100*s.threePlus/s.spins;}
 if(levels[0].emptyPercent<10||levels[0].maxWilds<4)throw Error('Bonus behavior regression');
 const rng8=math.seededRandom(51);let empty8=0;
 for(let i=0;i<10000;i++){
  const m=math.newBonus(type);m.size=8;m.level=3;m.grid=new Int8Array(64).fill(-1);m.sticky=new Int8Array(64).fill(-1);
  for(const j of [0,3,6,24,27,30,48])m.sticky[j]=9;
  math.generate(m,rng8);empty8+=math.findWins(m).length===0;
 }
 if(!empty8)throw Error('No empty spins on 8x8');
 report.types[type]={levels,eightByEightSevenWildFixture:{count:10000,empty:empty8,emptyPercent:empty8/100}};
}
fs.writeFileSync(`reports/bonus-behavior-${math.CONFIG.version}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
