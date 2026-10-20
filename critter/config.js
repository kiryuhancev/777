const CRITTER_CONFIG=Object.freeze({version:5,id:'critter',columns:5,rows:5,minCluster:5,maxWinX:10000,
 wildChance:.018,scatterChance:.016,payScale:3.122183728683,
 payScales:{base:3.122183728683,normal:0.23129493968,super:0.001288816678},
 sizes:[5,6,7,8,9,10,15],
 symbols:[
  {id:'ten',name:'10',weight:24,pays:[.2,.3,.45,.65,.9,1.4,3]},
  {id:'jack',name:'J',weight:20,pays:[.25,.4,.55,.8,1.2,1.8,4]},
  {id:'king',name:'K',weight:16,pays:[.3,.45,.7,1,1.5,2.2,5]},
  {id:'ace',name:'A',weight:12,pays:[.4,.6,.9,1.3,1.8,2.8,6]},
  {id:'cat',name:'Street Cat',weight:10,pays:[.6,.9,1.3,1.8,2.5,4,8]},
  {id:'pigeon',name:'Cool Pigeon',weight:8,pays:[.8,1.2,1.7,2.5,3.5,5,10]},
  {id:'possum',name:'Possum',weight:6,pays:[1,1.5,2.2,3,4.5,7,15]},
  {id:'bulldog',name:'Bulldog',weight:4,pays:[1.5,2.2,3,4.5,6,10,25]}
 ],
 bonus:{spins:10,superSpins:20},
 features:{scatterMultiplier:1.5,boostCost:2.675265,bonusCost:50,superCost:500}
});
if(typeof module!=='undefined')module.exports=CRITTER_CONFIG;
