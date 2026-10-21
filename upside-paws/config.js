/* New game's configurable math; no existing VAULT paytable is changed. */
const UPSIDE_PAWS_CONFIG=Object.freeze({id:'upside_paws',version:1,name:'UPSIDE PAWS',size:4,maxWinX:10000,payoutScale:2.58,buyMultiplier:17,
 scatterChance:.011,portalChance:.012,bonusPortalChance:.045,fullPortalChance:.09,echoChance:.15,bonusEchoChance:.5,fullEchoChance:1,
 freeSpins:{3:10,4:12,5:15,6:20},resonance:[1,2,3,5,10],breach:{threshold:100,echo:8,portal:10,resonance:12},
 profiles:{normal:1,quick:.7,turbo:.4,reduced:.08},timings:[1050,1250,1450,1650],
 symbols:[{id:'ten',name:'10',weight:20,pay:[.035,.08]},{id:'j',name:'J',weight:19,pay:[.04,.09]},{id:'q',name:'Q',weight:18,pay:[.045,.1]},{id:'k',name:'K',weight:17,pay:[.05,.12]},{id:'a',name:'A',weight:16,pay:[.06,.14]},{id:'dog',name:'Dog',weight:10,pay:[.08,.2]},{id:'cat',name:'Cat',weight:9,pay:[.1,.25]},{id:'rabbit',name:'Rabbit',weight:8,pay:[.12,.3]},{id:'bird',name:'Bird',weight:7,pay:[.15,.4]},{id:'hamster',name:'Hamster',weight:6,pay:[.2,.5]}]});
