const MAGNET_DEBUG=false;
const MAGNET_CONFIG=Object.freeze({
 id:'magnet',version:1,columns:5,rows:5,payRows:[1,2,3],ways:243,
 maxMagneticPhases:3,maxMovesPerPhase:10,maxWinX:10000,
 polarity:{positive:.4,negative:.4,neutral:.2},
 specials:{wild:.008,flip:.006,gravity:.006,repulsor:.006,chain:.004,scatter:.018},
 normalRadius:2,gravityRadius:2,wildRadius:2,repulsorRadius:2,flipRadius:1,
 normalInteractionChance:.32,specialActivationChance:.85,chainActivationChance:.65,
 overdrive:{scatterCount:3,spins:5,fieldPower:[1,1,2,3,5],specialBoostPerPower:.1,extraPhaseAt:3,radiusUpgradeAt:2,scatterChance:0},
 waysPayScale:.39, // Explicit common tuning scale. Never chosen from an outcome or account.
 symbols:[
  {id:'copper',name:'Copper Coil Module',weight:28,pays:[.3,.8,2]},
  {id:'steel',name:'Steel Battery Cell',weight:24,pays:[.4,1,3]},
  {id:'energy',name:'Neon Energy Cell',weight:18,pays:[.6,1.5,5]},
  {id:'plasma',name:'Plasma Orb',weight:14,pays:[.8,2.5,8]},
  {id:'crystal',name:'Quantum Crystal Prism',weight:10,pays:[1.2,4,15]},
  {id:'reactor',name:'Reactor Shard',weight:6,pays:[2,8,30]}
 ],
 autoChoices:[10,25,50,100,-1],timing:{reel:150,pause:160,phase:420,fastPhase:270,win:900,fastWin:550,next:850}
});
if(typeof module!=='undefined')module.exports=MAGNET_CONFIG;
