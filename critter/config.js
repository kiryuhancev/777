const CRITTER_CONFIG=Object.freeze({version:6,id:'critter',columns:5,rows:5,minReels:3,maxWinX:10000,
 maxScatterPerColumn:1,wildMultiplierCap:1099511627776,wildChance:.018,scatterChance:.016,payScale:0.08958041151576461,
 payScales:{base:0.089580411515765,normal:0.002621672353986,super:0.000007596199575},
 sizes:[3,4,5],
 symbols:[
  {id:'ten',name:'10',weight:24,waysPays:[.2,.3,.45]},
  {id:'jack',name:'J',weight:20,waysPays:[.25,.4,.55]},
  {id:'king',name:'K',weight:16,waysPays:[.3,.45,.7]},
  {id:'ace',name:'A',weight:12,waysPays:[.4,.6,.9]},
  {id:'cat',name:'Street Cat',weight:10,waysPays:[.6,.9,1.3]},
  {id:'pigeon',name:'Cool Pigeon',weight:8,waysPays:[.8,1.2,1.7]},
  {id:'possum',name:'Possum',weight:6,waysPays:[1,1.5,2.2]},
  {id:'bulldog',name:'Bulldog',weight:4,waysPays:[1.5,2.2,3]}
 ],
 bonus:{spins:10,superSpins:20},
 features:{scatterMultiplier:1.5,boostCost:2.675367,bonusCost:50,superCost:500}
});
if(typeof module!=='undefined')module.exports=CRITTER_CONFIG;
