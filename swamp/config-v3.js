const SWAMP_CONFIG_V3=Object.freeze({
 version:3,gameId:'swamp',displayName:'SWAMP FISHING',nameIsPlaceholder:true,GAME_LOGO_SRC:'',
 rows:3,reels:5,targetRtp:.96,maxWinX:50000,
 // Scatter is selected once per reel, at most one per reel. No conditioned redraws.
 scatterPerReel:.09,scatterBoost:{symbolMultiplier:1.28,costMultiplier:1.5},moneyChanceBase:.075,moneyChanceBonus:.15,collectorChance:.028,
 collectorReels:[1,2,3],collectorsPerUpgrade:4,retriggerSpins:15,multipliers:[1,2,3,10],
 freeSpins:{3:15,4:15,5:15},
 autoChoices:[10,25,50,100,-1],timing:{initial:240,reel:180,anticipation:260,fastInitial:70,fastReel:75,pause:600},
 purchases:[{id:"bonus",spins:15,costX:77,label:"BONUS"}],
 symbols:[
  {id:'bobber',weight:23,pays:[1,3,12]}, {id:'hook',weight:20,pays:[1.2,4,16]},
  {id:'insect',weight:17,pays:[1.5,5,20]}, {id:'bait_jar',weight:14,pays:[2,7,28]},
  {id:'lantern',weight:11,pays:[2.5,10,40]}, {id:'tackle_box',weight:8,pays:[3,14,60]},
  {id:'fish_01',weight:5,pays:[5,22,100]}, {id:'catfish',weight:2,pays:[8,40,200]}
 ],
 lineScale:.97,
 money:[{x:2,weight:60000},{x:5,weight:27000},{x:10,weight:9000},{x:15,weight:2500},{x:20,weight:1000},{x:25,weight:400},{x:50,weight:99},{x:2000,weight:1}],
 paylines:[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]]
});
