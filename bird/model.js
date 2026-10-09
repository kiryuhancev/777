// Pure seeded scene generation and the actual rigid-body round. No DOM or wallet.
const BIRD_MODEL = (() => {
  const C=BIRD_CONFIG, P=BIRD_PHYSICS, clip=(n,a,b)=>Math.max(a,Math.min(b,n));
  function rng(seed){let n=Number(seed)>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function pick(weights,r){const entries=Object.entries(weights),total=entries.reduce((n,[,v])=>n+(typeof v==='number'?v:v.weight),0);let x=r()*total;for(const [k,v] of entries){x-=typeof v==='number'?v:v.weight;if(x<0)return k;}return entries.at(-1)[0];}
  function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
  function building(seed,x){
    const r=rng(seed),archetype=pick(C.archetypes,r),size=pick(C.sizes,r),cells=C.sizes[size].cells;
    const blocks=[],pigs=[],platforms=[],width=80+r()*22,step=68,ground=P.SETTINGS.GROUND_Y;
    const mat=()=>pick(archetype==='FORTRESS'?C.fortressMaterialWeights:C.materialWeights,r);
    function cell(cx,f,w=width){
      const bottom=ground-f*step,offset=(r()-.5)*3;
      blocks.push({x:cx-w/2+8+offset,y:bottom-27,w:16,h:54,material:mat()},
        {x:cx+w/2-8+offset,y:bottom-27,w:16,h:54,material:mat()},
        {x:cx+offset,y:bottom-61,w:w+8,h:14,material:mat()});
      platforms.push({x:cx+offset,y:bottom-68,w});
    }
    const templates={
      TOWER:()=>Array.from({length:cells},(_,i)=>({col:Math.floor(i/4),floor:i%4})),
      TALL_THIN:()=>Array.from({length:cells},(_,i)=>({col:Math.floor(i/5),floor:i%5})),
      DOUBLE_TOWER:()=>Array.from({length:cells},(_,i)=>({col:i%2*2,floor:Math.floor(i/2)})),
      SPLIT_STRUCTURE:()=>Array.from({length:cells},(_,i)=>({col:i%3*2,floor:Math.floor(i/3)})),
      WIDE_LOW:()=>Array.from({length:cells},(_,i)=>({col:i%6,floor:Math.floor(i/6)})),
      MULTI_FLOOR:()=>Array.from({length:cells},(_,i)=>({col:i%3,floor:Math.floor(i/3)})),
      FORTRESS:()=>Array.from({length:cells},(_,i)=>({col:i%4,floor:Math.floor(i/4)})),
      BRIDGE:()=>Array.from({length:cells},(_,i)=>({col:i%2*3,floor:Math.floor(i/2)})),
      CANOPY:()=>Array.from({length:cells},(_,i)=>({col:i%4,floor:Math.floor(i/4)})),
      PYRAMID:()=>{const a=[],base=Math.ceil(Math.sqrt(cells))*2-1;for(let f=0;a.length<cells;f++)for(let c=f;c<base-f&&a.length<cells;c++)a.push({col:c,floor:f});return a;}
    };
    const layout=templates[archetype]();
    layout.forEach(({col,floor})=>cell(x+col*(width+12),floor,archetype==='TALL_THIN'?78:width));
    // Distinct load-bearing bridge/canopy geometry; caps rest on real supports.
    if(['BRIDGE','CANOPY'].includes(archetype)&&blocks.length+2<=C.round.maxBlocks){
      const span=Math.min(4,cells)*(width+12)-12;
      blocks.push({x:x+(span-width)/2,y:ground-step*Math.ceil(cells/(archetype==='BRIDGE'?2:4))-7,w:span+8,h:14,material:archetype==='BRIDGE'?'wood':'glass'});
    }
    platforms.forEach((p,i)=>{
      // A pig on a capped interior platform must fit into the floor above.
      if(r()>C.pigSpawnChance&&pigs.length)return;
      const type=pick(C.pigs,r),t=C.pigs[type];
      pigs.push({type,x:p.x+(r()-.5)*Math.max(0,p.w-2*t.r-36),y:p.y-t.r});
    });
    const left=Math.min(...blocks.map(b=>b.x-b.w/2)),right=Math.max(...blocks.map(b=>b.x+b.w/2)),top=Math.min(...blocks.map(b=>b.y-b.h/2));
    return {archetype,size,blocks,pigs,bounds:{left,right,top,bottom:ground}};
  }
  function plan(seed,bet){
    if(!Number.isFinite(bet)||bet<=0)throw Error('Invalid Bird bet');
    seed=Number(seed)>>>0;const r=rng(seed),routeType=pick(C.routes,r),distance=C.flight.distanceMin+r()*(C.flight.distanceMax-C.flight.distanceMin),target=building(seed^0x9e3779b9,distance);
    const spawns=[];
    for(let i=0;i<C.bonus.candidates;i++){
      if(r()>C.bonus.visualSpawnChance&&spawns.length>=6)continue;
      const x=C.sling.x+180+(distance-C.sling.x-720)*(i+.5)/C.bonus.candidates,t=(x-C.sling.x)/C.flight.nominalVx;
      const center=C.sling.y+C.flight.nominalVy*t+.5*C.flight.gravity*t*t;
      const reachable=r()<C.routes[routeType].reachableChance,nearMiss=!reachable&&r()<C.bonus.nearMissChance;
      const offset=reachable?(r()-.5)*24:(r()<.5?-1:1)*((nearMiss?C.bonus.nearMissOffset:C.bonus.decorativeOffset)+r()*24);
      const rare=r()<C.bonus.rareBonusChance;
      const type=rare?'x3':pick(Object.fromEntries(Object.entries(BIRD_BONUS_TYPES).filter(([k])=>k!=='x3')),r);
      spawns.push({id:i,type,x,y:center+offset,r:C.bonus.radius,placement:reachable?'corridor':nearMiss?'near-miss':'alternate'});
    }
    return freeze({seed,bet,flightPlan:{seed,distance,duration:(distance-C.sling.x)/C.flight.nominalVx,
      routeType,bonusSpawns:spawns,hazardSpawns:[],approachSpeed:C.flight.nominalVx,targetId:`${seed}:${target.archetype}`},buildingPlan:target});
  }
  function impactDamage(body,other,impulse){
    if(body.kind==='pig')return Math.max(0,impulse-(other.kind==='ground'?C.damage.pigFallThreshold:C.damage.pigThreshold))*C.damage.pigScale*(other.hunter?1.6:1);
    if(body.kind==='block'){const m=C.materials[body.material];return Math.max(0,impulse-m.damageThreshold)*m.damageScale;}
    return 0;
  }
  function createRun(scene,notify=()=>{}){
    const run={plan:scene,phase:'SLINGSHOT',time:0,phaseTime:0,impactTime:null,settled:false,result:null,
      blocks:[],pigs:[],birds:[],bonuses:scene.flightPlan.bonusSpawns.map(b=>({...b,collected:false})),
      collected:[],multiplier:1,score:0,pigsDestroyed:0,blocksDestroyed:0,damageScore:0,chainCount:0,lastBreak:-100,
      steering:0,steeringVelocity:0,correctionDistance:0,split:false,events:[],world:null,targetAdded:false};
    const transitions={SLINGSHOT:['FLIGHT'],FLIGHT:['APPROACH','SETTLING'],APPROACH:['IMPACT','SETTLING'],IMPACT:['SETTLING'],SETTLING:['RESULT']};
    run.transition=phase=>{if(run.phase===phase)return;if(!transitions[run.phase]?.includes(phase))throw Error(`Invalid Bird transition ${run.phase} -> ${phase}`);run.phase=phase;run.phaseTime=0;notify('phase',phase);};
    const world=P.createWorld({gravity:C.flight.gravity,onImpact:(a,b,impulse,point)=>{
      if(!world.damageEnabled)return;
      if([a,b].some(b=>b.kind==='bird')&&[a,b].some(b=>['block','pig'].includes(b.kind))){
        if(run.phase==='APPROACH')run.transition('IMPACT');
        if(run.impactTime===null)run.impactTime=run.time;
      }
      for(const [body,other] of [[a,b],[b,a]])run.damage(body,impactDamage(body,other,impulse),point);
      for(const bird of [a,b])if(bird.kind==='bird'&&impulse>60){
        if(bird.bomb){bird.bomb=false;run.explode(bird);}
        if(bird.pierce&&b.kind!=='ground'&&a.kind!=='ground'){
          bird.pierce=false;P.applyImpulse(bird,{x:bird.mass*Math.max(0,bird.preVx-bird.vx)*.60,y:0});
        }
        if(bird.ricochet&&[a,b].some(b=>b.kind==='block')){
          bird.ricochet=false;P.applyImpulse(bird,{x:bird.mass*135,y:-bird.mass*70});
        }
      }
      if(impulse>140)notify('impact',{impulse,point});
    }});
    const ground=world.bodies.find(b=>b.static);ground.x=scene.flightPlan.distance/2;ground.w=scene.flightPlan.distance*3;P.massProperties(ground);
    run.world=world;
    scene.buildingPlan.blocks.forEach(b=>{const m=C.materials[b.material];run.blocks.push(P.createBody({...b,...m,kind:'block',maxHp:m.hp}));});
    scene.buildingPlan.pigs.forEach(p=>{const t=C.pigs[p.type];run.pigs.push(P.createBody({...p,shape:'circle',kind:'pig',material:'pig',...t,maxHp:t.hp,flash:0}));});
    // Settle construction independently, with damage disabled, before the paid shot.
    const prep=P.createWorld();prep.bodies=[ground,...run.blocks,...run.pigs];prep.damageEnabled=false;
    for(let i=0;i<90;i++)P.step(prep);
    run.damage=(body,amount,point=body)=>{
      if(!body.alive||!['pig','block'].includes(body.kind)||!Number.isFinite(amount)||amount<=0)return;
      const taken=Math.min(body.hp,amount);body.hp-=taken;body.flash=.12;
      const value=body.kind==='pig'?body.score:C.materials[body.material].score;
      run.damageScore+=value*(taken/body.maxHp)*C.scoring.partialDamageFraction;
      if(body.hp>0)return;
      body.alive=false;run.score+=value;
      if(body.kind==='pig')run.pigsDestroyed++;else run.blocksDestroyed++;
      if(run.time-run.lastBreak<C.scoring.chainWindow){run.chainCount++;run.score+=C.scoring.chainPoints;}
      run.lastBreak=run.time;notify('break',{kind:body.kind,material:body.material,color:body.color,x:body.x,y:body.y,point});
    };
    run.explode=bird=>{
      notify('blast',{x:bird.x,y:bird.y});
      for(const body of world.bodies)if(body.alive&&!body.static&&body!==bird){
        const dx=body.x-bird.x,dy=body.y-bird.y,d=Math.hypot(dx,dy),radius=C.damage.bombRadius*(bird.mega?1.4:1);
        if(d>=radius)continue;const strength=C.damage.bombImpulse*(1-d/radius),nx=d>1?dx/d:0,ny=d>1?dy/d:-1;
        P.applyImpulse(body,{x:nx*strength,y:ny*strength},{x:body.x-ny*8,y:body.y+nx*8});
        run.damage(body,impactDamage(body,bird,strength)*.65);
      }
    };
    run.addBird=options=>{if(world.bodies.length>=C.round.maxBodies)return null;const b=P.createBody({shape:'circle',kind:'bird',material:'bird',x:C.sling.x,y:C.sling.y,r:C.sling.radius,
      linearDamping:0,angularDamping:.12,flightActive:true,preVx:0,bomb:false,...options});run.birds.push(b);world.bodies.push(b);return b;};
    const effects={
      x2:b=>{run.multiplier*=2;},
      x3:b=>{run.multiplier*=3;},
      heavy:b=>{b.density*=1.8;P.massProperties(b);},
      mega:b=>{b.r*=1.4;b.mega=true;P.massProperties(b);},
      bomb:b=>{b.bomb=true;},split:b=>{run.split=true;},pierce:b=>{b.pierce=true;},
      ricochet:b=>{b.ricochet=true;},hunter:b=>{b.hunter=true;}
    };
    run.collect=(bird,gate)=>{if(gate.collected||!effects[gate.type])return;gate.collected=true;run.collected.push(gate.type);effects[gate.type](bird);P.wake(bird);notify('bonus',gate.type);};
    run.launch=(vx=C.flight.nominalVx,vy=C.flight.nominalVy)=>{
      if(run.phase!=='SLINGSHOT')return false;
      run.addBird({vx:clip(vx,0,800),vy:clip(vy,-650,500)});run.transition('FLIGHT');return true;
    };
    run.reveal=()=>{
      if(run.targetAdded)return;run.targetAdded=true;world.bodies.push(...run.blocks,...run.pigs);
      world.gravity=P.SETTINGS.GRAVITY;
      if(run.phase==='FLIGHT')run.transition('APPROACH');
      if(run.split&&run.birds.length===1){const b=run.birds[0];for(const s of [-1,1])run.addBird({x:b.x,y:b.y+s*(b.r+14),r:12,vx:b.vx+s*45,vy:b.vy+s*65,
        density:b.density,bomb:b.bomb,hunter:b.hunter,mega:b.mega});run.split=false;}
    };
    run.finish=()=>{
      if(run.settled)return run.result;
      if(run.phase!=='SETTLING')run.transition('SETTLING');
      run.settled=true;run.transition('RESULT');
      const destructionScore=run.score+run.damageScore+(run.score>0?run.collected.length*C.scoring.bonusPoints:0);
      // This is the ONLY payout calculation: the completed physical scene supplies score.
      const payout=Math.round(scene.bet*destructionScore/C.scoring.pointsPerBet*run.multiplier*1e6)/1e6;
      run.result={seed:scene.seed,bet:scene.bet,routeType:scene.flightPlan.routeType,
        bonusesOffered:scene.flightPlan.bonusSpawns.map(b=>b.type),bonusesCollected:[...run.collected],
        buildingArchetype:scene.buildingPlan.archetype,buildingSize:scene.buildingPlan.size,
        pigsTotal:run.pigs.length,pigsDestroyed:run.pigsDestroyed,blocksTotal:run.blocks.length,
        blocksDestroyed:run.blocksDestroyed,damageScore:run.damageScore,chainReactions:run.chainCount,
        destructionScore,multiplier:run.multiplier,payout,birdsUsed:1};return run.result;
    };
    run.step=(dt=P.SETTINGS.DT,steer=0)=>{
      if(['SLINGSHOT','RESULT'].includes(run.phase))return;
      run.time+=dt;run.phaseTime+=dt;
      const primary=run.birds[0];
      if(run.phase==='FLIGHT'&&primary?.alive){
        const limit=(scene.flightPlan.distance-C.sling.x)*C.flight.maxFlightCorrection;
        const headroom=Math.max(0,1-Math.abs(run.correctionDistance)/limit);
        const next=clip(run.steeringVelocity+(clip(steer,-1,1)*C.flight.steeringAcceleration*headroom-C.flight.steeringDamping*run.steeringVelocity)*dt,-65,65);
        primary.vx+=next-run.steeringVelocity;run.steeringVelocity=next;run.correctionDistance+=next*dt;
        if(primary.x>=scene.flightPlan.distance-C.flight.approachDistance)run.reveal();
      }
      for(const b of run.birds)b.preVx=b.vx;
      P.step(world,dt);
      for(const b of run.birds)if(b.alive){
        for(const gate of run.bonuses)if(!gate.collected&&Math.hypot(b.x-gate.x,b.y-gate.y)<b.r+gate.r)run.collect(b,gate);
        if(b.y>650||b.x< -300||b.x>scene.buildingPlan.bounds.right+800){b.alive=false;b.flightActive=false;}
      }
      run.pigs.forEach(b=>b.flash=Math.max(0,b.flash-dt));
      world.bodies=world.bodies.filter(b=>b.alive);
      const quiet=world.bodies.every(b=>b.static||b.sleeping);
      if(run.phase==='IMPACT'&&run.phaseTime>.12)run.transition('SETTLING');
      if(run.phase==='APPROACH'&&(run.phaseTime>2||!primary?.alive))run.transition('SETTLING');
      if(run.phase==='FLIGHT'&&(run.time>C.flight.maxSeconds||!primary?.alive||primary.sleeping)){
        // A short/missed shot cannot reveal a new free shot or earn construction damage.
        run.transition('SETTLING');
      }
      if(run.phase==='SETTLING'&&(quiet||run.phaseTime>=C.round.maxSettleSeconds||!run.targetAdded))run.finish();
    };
    return run;
  }
  function simulate(seed,bet=20,input={}){const scene=plan(seed,bet),run=createRun(scene);run.launch(input.vx,input.vy);
    for(let i=0;i<2400&&!run.settled;i++)run.step(P.SETTINGS.DT,input.steer||0);
    if(!run.settled)throw Error('Bird simulation exceeded its bounded lifetime');return {...run.result,seconds:run.time};}
  return {rng,pick,plan,building,createRun,impactDamage,simulate};
})();
function simulateBirdRound(seed,bet,input){return BIRD_MODEL.simulate(seed,bet,input);}
