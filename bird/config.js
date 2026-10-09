// Provisional probability/physics tuning, not a promised RTP. No desired payout exists.
const BIRD_CONFIG = Object.freeze({
  debug: false,
  sling: {x:280, y:390, radius:19, maxPull:120, launchScale:6.6},
  flight: {gravity:140, nominalVx:660, nominalVy:-290, distanceMin:1780, distanceMax:2080,
    approachDistance:440, maxSeconds:6, maxFlightCorrection:.12, steeringAcceleration:90, steeringDamping:2.5},
  round: {maxSettleSeconds:10, resultSeconds:1.5, maxBlocks:45, maxBodies:64, maxParticles:140},
  routes: {DRY:{weight:42,reachableChance:.07}, NORMAL:{weight:44,reachableChance:.24},
    HOT:{weight:12.5,reachableChance:.48}, RARE:{weight:1.5,reachableChance:.70}},
  bonus: {visualSpawnChance:.94, candidates:10, nearMissChance:.55, rareBonusChance:.035,
    radius:23, nearMissOffset:72, decorativeOffset:150},
  archetypes: {TOWER:12,BRIDGE:10,FORTRESS:8,DOUBLE_TOWER:11,TALL_THIN:8,
    PYRAMID:10,CANOPY:8,MULTI_FLOOR:12,SPLIT_STRUCTURE:10,WIDE_LOW:11},
  sizes: {SMALL:{weight:35,cells:3},MEDIUM:{weight:38,cells:5},LARGE:{weight:22,cells:8},FORTRESS:{weight:5,cells:12}},
  materials: {
    glass:{density:.0012,massFactor:.6,hp:25,damageThreshold:45,damageScale:.18,restitution:.12,friction:.40,
      breakBehavior:'shards',color:'#83d4d8',score:5},
    wood:{density:.002,massFactor:1,hp:60,damageThreshold:95,damageScale:.14,restitution:.07,friction:.65,
      breakBehavior:'splinters',color:'#b88d62',score:9},
    stone:{density:.0044,massFactor:2.2,hp:130,damageThreshold:180,damageScale:.10,restitution:.025,friction:.82,
      breakBehavior:'dust',color:'#89939c',score:18}
  },
  materialWeights:{glass:30,wood:52,stone:18},
  fortressMaterialWeights:{glass:12,wood:38,stone:50},
  pigs: {
    basic:{weight:57,hp:45,r:16,score:50,color:'#86b779'},
    helmet:{weight:24,hp:70,r:17,score:80,color:'#91b584'},
    heavy:{weight:13,hp:105,r:20,score:120,color:'#709b68'},
    gold:{weight:5,hp:80,r:15,score:200,color:'#d5b964'},
    royal:{weight:1,hp:145,r:21,score:300,color:'#98b477'}
  },
  pigSpawnChance:.62,
  damage:{pigThreshold:95,pigFallThreshold:200,pigScale:.22,bombRadius:130,bombImpulse:1900},
  scoring:{pointsPerBet:100,partialDamageFraction:.15,chainWindow:.55,chainPoints:4,bonusPoints:2}
});
const BIRD_BONUS_TYPES = Object.freeze({
  x2:{weight:24,label:'×2',color:'#ead39a',description:'Множитель результата'},
  x3:{weight:5,label:'×3',color:'#e5b56f',description:'Множитель результата'},
  heavy:{weight:19,label:'H',color:'#9db0c4',description:'Масса ×1.8'},
  mega:{weight:15,label:'M',color:'#e4af77',description:'Радиус ×1.4'},
  bomb:{weight:9,label:'B',color:'#df8d75',description:'Импульсный взрыв при сильном ударе'},
  split:{weight:8,label:'S',color:'#bfacdc',description:'Два дополнительных осколка птицы перед целью'},
  pierce:{weight:10,label:'P',color:'#9fc7b0',description:'Сохранение части импульса первого удара'},
  ricochet:{weight:6,label:'R',color:'#96c1d3',description:'Усиленный первый отскок'},
  hunter:{weight:4,label:'H+',color:'#c2cc7c',description:'Урон свиньям ×1.6'}
});
