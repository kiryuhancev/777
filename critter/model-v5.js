/* Calibrated v5 uses the exact v4 field/movement plan; only published mode paytables differ. */
const CRITTER_MODEL_V5=(()=>{
 const v4=typeof module!=='undefined'&&module.exports?require('./model-v4.js'):CRITTER_MODEL_V4;
 const C=typeof module!=='undefined'&&module.exports?require('./config-v5.js'):CRITTER_CONFIG_V5;
 const round=v4.round,canonical=v4.canonical;
 function rescale(result,mode){for(const w of result.wins)w.winX=round(round(w.rawWinX*C.payScales[mode],6)*w.multiplier);result.winX=round(result.wins.reduce((n,w)=>n+w.winX,0));return result;}
 function evaluate(grid,{bonus=false,kind='normal'}={}){return rescale(v4.evaluate(grid,{bonus}),bonus?kind:'base');}
 function spinPlan(seed,options={}){return rescale(v4.spinPlan(seed,options),options.bonus?(options.kind||'normal'):'base');}
 function cost(r){return r.version&&r.version<5?v4.cost(r):round(r.bet*(r.purchaseType?C.features[r.purchaseType+'Cost']:r.scatterBoost?C.features.boostCost:1));}
 function start(args){const r=v4.start(args);r.version=5;r.cost=cost(r);rescale(r.base,'base');if(r.bonus){for(const p of r.bonus.spins)rescale(p,r.bonus.kind);r.bonus.winX=round(r.bonus.spins.reduce((n,p)=>n+p.winX,0));}r.winX=round(Math.min(C.maxWinX,r.base.winX+(r.bonus?.winX||0)));r.payout=round(r.winX*r.bet);return r;}
 function validate(r){try{if(r?.version<5)return v4.validate(r);if(r?.version!==5)return null;const expected=start(r);return JSON.stringify(canonical(expected))===JSON.stringify(canonical(r))?expected:null;}catch{return null;}}
 function progress(r,options){if(r?.version!==5)return v4.progress(r,options);const p=v4.progress({...r,version:4},options);return p?{...p,version:5}:null;}
 function validateProgress(r,p){try{if(r?.version!==5)return v4.validateProgress(r,p);const expected=progress(r,p);return expected&&JSON.stringify(canonical(expected))===JSON.stringify(canonical(p))?expected:null;}catch{return null;}}
 return {...v4,v4,config:C,evaluate,spinPlan,start,cost,validate,progress,validateProgress};
})();
if(typeof module!=='undefined')module.exports=CRITTER_MODEL_V5;
