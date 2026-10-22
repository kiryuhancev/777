/* Versioned game rules. Written archive specification is authoritative. */
const BIG_TOP_CONFIG_V1=Object.freeze({id:'big_top',name:'BIG TOP WILDS',version:1,reels:6,minRows:2,maxRows:6,rowWeights:[10,22,36,22,10],maxWinX:10000,payoutScale:2.55,
 scatterChance:.06,curtainChance:.009,bonusCurtainChance:.045,fullReelChance:.0015,bonusFullReelChance:.006,
 multiplierValues:[1,2,3,5,10],multiplierWeights:[65,22,8,4,1],bonusMultiplierWeights:[40,30,17,10,3],encoreChance:.18,
 freeSpins:{3:10,4:12,5:15,6:20},applause:{threshold:12,normal:1,multiplier:2,full:3},buyMultiplier:110,
 timings:[1000,1150,1300,1450,1600,1775],profiles:{normal:1,quick:.7,turbo:.4,reduced:.15},
 symbols:[{id:'ten',name:'10',weight:18,pay:[.03,.06,.12,.25]},{id:'j',name:'J',weight:17,pay:[.035,.07,.14,.28]},{id:'q',name:'Q',weight:16,pay:[.04,.08,.16,.32]},{id:'k',name:'K',weight:15,pay:[.045,.09,.18,.36]},{id:'a',name:'A',weight:14,pay:[.05,.1,.2,.4]},
 {id:'dog',name:'Balloon Dog',weight:8,pay:[.06,.15,.35,.8]},{id:'duck',name:'Squeaky Duck',weight:7,pay:[.065,.17,.4,1]},{id:'boot',name:'Spring Boot',weight:6,pay:[.07,.19,.5,1.2]},{id:'weight',name:'Comic Heavy Weight',weight:5,pay:[.08,.22,.6,1.4]},{id:'skate',name:'Rocket Skate',weight:4,pay:[.09,.25,.7,1.7]},{id:'fish',name:'Crowned Goldfish',weight:3,pay:[.1,.3,.8,2]}]});
