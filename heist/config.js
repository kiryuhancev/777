const VAULT_HEIST_CONFIG=Object.freeze({
 id:'vault_heist',version:1,columns:5,rows:4,stageSpins:3,maxWinX:10000,
 waysPayScale:1.15,profileLowDecay:.035,scatterChance:.10,wildChance:.012,initialLoot:{3:23,4:35,5:70},
 stages:['BLUEPRINT','ACCESS','BREACH','VAULT OPEN','DEEP CHAMBER','GRAND TAKE'],
 stageMultipliers:[1,1.25,1.6,2.2,3.2,5],alarmRisks:[.08,.12,.16,.24,.35,0],
 profileHighBoost:[1,1.08,1.18,1.30,1.45,1.65],wildBoost:[1,1.15,1.3,1.45,1.6,1.8],
 scanChance:.12,scanMultiplier:1.25,accessChance:.32,breachChance:.18,lootChance:.22,lootTokenX:.5,
 artifactChance:.22,artifactMultipliers:[2,3,5],grandChance:.018,grandPays:[4,15,50],
 alarmChance:.04,overrideChance:.025,alarmAdd:.02,overrideReduce:.03,minRisk:.01,maxRisk:.65,
 autoChoices:[10,25,50,100,-1],timing:{initial:170,reel:125,fastInitial:50,fastReel:55,pause:500,transition:800},
 symbols:[
  {id:'mask',name:'Mask',weight:10,tier:0,pays:[.2,.6,1.5]},
  {id:'gloves',name:'Tactical gloves',weight:10,tier:0,pays:[.2,.6,1.5]},
  {id:'flashlight',name:'Flashlight',weight:10,tier:0,pays:[.2,.6,1.5]},
  {id:'card',name:'Access card',weight:10,tier:0,pays:[.2,.6,1.5]},
  {id:'tablet',name:'Hacker tablet',weight:8,tier:1,pays:[.4,1.2,3]},
  {id:'bag',name:'Duffel bag',weight:8,tier:1,pays:[.4,1.2,3]},
  {id:'cutter',name:'Laser cutter',weight:8,tier:1,pays:[.4,1.2,3]},
  {id:'override',name:'Override module',weight:8,tier:1,pays:[.4,1.2,3]},
  {id:'gold',name:'Gold bar',weight:4,tier:2,pays:[1,3,8]},
  {id:'diamond',name:'Diamond',weight:4,tier:2,pays:[1,3,8]},
  {id:'artifact',name:'Artifact capsule',weight:4,tier:2,pays:[1,3,8]},
  {id:'core',name:'Vault core',weight:4,tier:2,pays:[1,3,8]}
 ]
});
if(typeof module!=='undefined')module.exports=VAULT_HEIST_CONFIG;
