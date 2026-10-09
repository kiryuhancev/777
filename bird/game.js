// Browser adapter: input/camera/presentation. Business state stays in VAULT services.
const BIRD_DEBUG=BIRD_CONFIG.debug;
let birdState={betIndex:1,phase:'IDLE',run:null,roundId:null,roundBet:0,roundWin:0,pigsKilled:0,
  dragging:false,pointerId:null,dragX:BIRD_CONFIG.sling.x,dragY:BIRD_CONFIG.sling.y,
  accumulator:0,resultTime:0,camera:{x:0,zoom:1},particles:[],trails:new Map(),sentinelAngles:new Map(),shake:0,steer:0,debug:BIRD_DEBUG,lastResult:null};
// Compatibility views only; the phase is the single source for gameplay lifecycle.
Object.defineProperties(birdState,{
  active:{get(){return ['SLINGSHOT','FLIGHT','APPROACH','IMPACT','SETTLING'].includes(this.phase);}},
  launched:{get(){return !!this.run&&this.run.phase!=='SLINGSHOT';}},
  revealed:{get(){return !!this.run?.targetAdded;}},
  blocks:{get(){return this.run?.blocks||[];}},pigs:{get(){return this.run?.pigs||[];}},
  birds:{get(){return this.run?.birds||[];}},bonuses:{get(){return this.run?.bonuses||[];}},
  world:{get(){return this.run?.world||null;}},birdsLeft:{get(){return this.phase==='SLINGSHOT'?1:0;}}
});
function birdBet(){return BIRD_BETS[birdState.betIndex];}
function birdMoney(n){return Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:2});}
function resizeBirdCanvas(){const dpr=Math.min(2,window.devicePixelRatio||1);birdCanvas.width=Math.round(960*dpr);birdCanvas.height=Math.round(540*dpr);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function resetBirdRecovery(){
  birdState.phase='IDLE';birdState.run=null;birdState.roundId=null;birdState.roundBet=0;
  birdState.roundWin=0;birdState.pigsKilled=0;birdState.dragging=false;birdState.pointerId=null;
  birdState.dragX=BIRD_CONFIG.sling.x;birdState.dragY=BIRD_CONFIG.sling.y;birdState.accumulator=0;
  birdState.resultTime=0;birdState.camera={x:0,zoom:1};birdState.particles=[];birdState.trails.clear();birdState.sentinelAngles.clear();birdState.shake=0;birdState.steer=0;
}
function birdEffect(event,data){
  if(event==='phase'){
    birdState.phase=data;
    const messages={APPROACH:'Цель впереди. Камера открывает постройку.',IMPACT:'Удар! Результат определяют столкновения.',SETTLING:'Разрушения продолжаются…'};
    if(messages[data])el('birdMessage').textContent=messages[data];return;
  }
  if(event==='bonus'){
    sound(700,.07,'sine');const b=birdState.run?.birds[0];if(b)for(let i=0;i<8&&birdState.particles.length<BIRD_CONFIG.round.maxParticles;i++)birdState.particles.push({x:b.x,y:b.y,vx:Math.cos(i*Math.PI/4)*80,vy:Math.sin(i*Math.PI/4)*80,life:.35,size:2,color:'#f0b84b'});
    updateBirdUI();return;
  }
  if(event==='impact'){birdState.shake=Math.min(3,data.impulse/600);sound(80,.06,'triangle',.015);return;}
  if(event==='break'||event==='blast'){
    const random=BIRD_MODEL.rng((birdState.run?.plan.seed||0)+Math.round(birdState.run?.time*120||0)+birdState.particles.length);
    const count=event==='blast'?24:8;
    for(let i=0;i<count&&birdState.particles.length<BIRD_CONFIG.round.maxParticles;i++)birdState.particles.push({
      x:data.x,y:data.y,vx:(random()-.5)*230,vy:-random()*180,life:.45+random()*.55,
      size:data.material==='stone'?5:2+random()*3,color:data.material==='glass'?'#e9b765':data.kind==='pig'?'#efb859':'#b8a487'});
    sound(data.material==='glass'?1100:data.kind==='pig'?270:150,.06,'triangle',.012);
  }
}
function startBirdRound(){
  if(birdState.phase==='SLINGSHOT'){launchBird(true);return;}
  if(birdState.phase!=='IDLE')return;
  if(state.balance<birdBet()){toast('Недостаточно средств');return;}
  const seed=crypto.getRandomValues(new Uint32Array(1))[0],scene=BIRD_MODEL.plan(seed,birdBet());
  const round=VaultRoundService.begin('bird',birdBet(),{seed,buildingArchetype:scene.buildingPlan.archetype});
  if(!round)return;
  birdState.roundId=round;birdState.roundBet=birdBet();birdState.phase='SLINGSHOT';
  birdState.run=BIRD_MODEL.createRun(scene,birdEffect);birdState.particles=[];birdState.camera={x:0,zoom:1};
  birdState.roundWin=0;birdState.pigsKilled=0;birdState.resultTime=0;birdState.accumulator=0;
  birdState.dragX=BIRD_CONFIG.sling.x;birdState.dragY=BIRD_CONFIG.sling.y;
  el('birdMessage').textContent='Оттяни модуль и отпусти. Или нажми «ЗАПУСТИТЬ» для стандартного броска.';
  updateBirdUI();drawBirdGame();
}
function launchBird(nominal=false){
  if(birdState.phase!=='SLINGSHOT'||!birdState.run)return false;
  const s=BIRD_CONFIG.sling,dx=s.x-birdState.dragX,dy=s.y-birdState.dragY;
  if(!nominal&&Math.hypot(dx,dy)<20)return false;
  const ok=birdState.run.launch(nominal?undefined:dx*s.launchScale,nominal?undefined:dy*s.launchScale);
  if(!ok)return false;birdState.dragging=false;birdState.dragX=s.x;birdState.dragY=s.y;
  sound(280,.11,'triangle');el('birdMessage').textContent='Небольшая коррекция: ← → / A D или кнопки под сценой.';
  updateBirdUI();return true;
}
function settleBirdRound(){
  const run=birdState.run;if(!run?.settled||run.walletSettled)return;
  run.walletSettled=true;birdState.phase='RESULT';birdState.resultTime=0;
  birdState.roundWin=run.result.payout;birdState.pigsKilled=run.pigsDestroyed;
  const result={...run.result,roundId:birdState.roundId};birdState.lastResult=result;
  if(result.payout>0)VaultWalletService.applyDelta(result.payout,{gameId:'bird'});
  VaultRoundService.finish('bird',result.payout>0?'win':'no-win','settled',result);
  el('birdMessage').textContent=`${result.payout>0?'BREACH COMPLETE +'+birdMoney(result.payout):'NO BREACH'} · ${result.pigsDestroyed} охранников · ${result.blocksDestroyed} блоков · ×${result.multiplier}`;
  sound(result.payout>0?600:180,.15,'sine');updateBirdUI();
}
function updateBirdPhysics(dt){
  if(!birdState.run||!birdState.active)return;
  birdState.run.step(dt,birdState.steer);birdState.phase=birdState.run.phase;
  birdState.pigsKilled=birdState.run.pigsDestroyed;
  if(birdState.run.settled)settleBirdRound();
}
function drawRoundedRect(ctx,x,y,w,h,r,fill,stroke=null){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function drawBreaker(c,x,y,r,b={}){
  c.save();c.translate(x,y);c.rotate(clamp(Math.sin(b.angle||0)*.28,-.28,.28));
  if(!drawVBSprite(c,'player',-r*1.4,-r*1.2,r*2.8,r*2.4)){
    drawRoundedRect(c,-r,-r*.65,r*2,r*1.3,5,'#353d48','#b39b72');
    c.fillStyle='#f0b84b';c.fillRect(r*.45,-r*.4,r*.45,r*.8);
  }
  if(b.bomb||b.hunter){c.strokeStyle=b.bomb?'#e07e47':'#e5d3a6';c.lineWidth=1.5;c.beginPath();c.arc(0,0,r+4,0,Math.PI*2);c.stroke();}c.restore();
}
function drawSentinel(c,p){
  c.save();c.translate(p.x,p.y);
  const sprite=p.type==='helmet'?'sentinelScout':'sentinelBasic';
  c.fillStyle='#0006';c.beginPath();c.ellipse(0,p.r*.86,p.r*.8,3,0,0,Math.PI*2);c.fill();
  c.rotate(birdState.sentinelAngles.get(p.id)??p.angle);
  if(!drawVBSprite(c,sprite,-p.r*1.08,-p.r*1.08,p.r*2.16,p.r*2.16)){
    c.fillStyle='#495361';c.strokeStyle='#c5ab76';c.lineWidth=2;c.beginPath();c.arc(0,0,p.r,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#f0b84b';c.beginPath();c.arc(0,0,p.r*.38,0,Math.PI*2);c.fill();
  }
  if(p.type==='gold'||p.type==='royal'){c.strokeStyle='#f0b84b';c.lineWidth=2;c.beginPath();c.arc(0,0,p.r+2,0,Math.PI*2);c.stroke();}
  const ratio=clamp(p.hp/p.maxHp,0,1);
  if(p.flash){c.fillStyle='#ffbd5b55';c.beginPath();c.arc(0,0,p.r,0,Math.PI*2);c.fill();}
  if(ratio<.7){c.strokeStyle='#ffd6a199';c.lineWidth=1;c.beginPath();c.moveTo(-p.r*.5,-p.r*.4);c.lineTo(0,0);c.lineTo(-p.r*.2,p.r*.6);c.stroke();}
  c.restore();c.fillStyle='#0f111599';c.fillRect(p.x-p.r,p.y-p.r-10,p.r*2,3);c.fillStyle='#e0ad64';c.fillRect(p.x-p.r,p.y-p.r-10,p.r*2*ratio,3);
}
function breakerBlockSprite(b){return b.material==='stone'?'armor':b.material==='glass'?'container':b.h>b.w?'column':'beam';}
function updateSentinelRenderAngles(run,dt){
  for(const p of run?.pigs||[])if(p.alive){
    const previous=birdState.sentinelAngles.get(p.id)??p.angle;
    const difference=Math.atan2(Math.sin(p.angle-previous),Math.cos(p.angle-previous));
    birdState.sentinelAngles.set(p.id,previous+clamp(difference,-6*dt,6*dt));
  }
  for(const id of birdState.sentinelAngles.keys())if(!run?.pigs.some(p=>p.id===id&&p.alive))birdState.sentinelAngles.delete(id);
}
function drawIndustrialBackground(c,cam){
  const sky=c.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#0f1115');sky.addColorStop(.65,'#2a313b');sky.addColorStop(1,'#191d24');
  c.fillStyle=sky;c.fillRect(0,0,960,540);
  const light=c.createRadialGradient(710,100,5,710,100,460);light.addColorStop(0,'#f0b84b16');light.addColorStop(1,'#f0b84b00');c.fillStyle=light;c.fillRect(0,0,960,540);
  // Far skyline, mid mechanical frames, foreground pipes: independent parallax.
  for(const [factor,space,base,color] of [[.10,160,380,'#20262e'],[.30,240,440,'#171d25'],[.65,130,500,'#10161d']]){
    const offset=cam.x*factor;
    for(let i=Math.floor(offset/space)-1;i<(offset+960)/space+1;i++){
      const x=i*space-offset,height=70+(Math.sin(i*2.7)+1)*45;
      c.fillStyle=color;c.fillRect(x,base-height,space*.63,height+100);
      c.strokeStyle=factor===.65?'#4d566044':'#515a6555';c.lineWidth=3;
      c.strokeRect(x+12,base-height+12,space*.48,height-18);
      if(factor===.30){c.beginPath();c.moveTo(x,base-height+30);c.lineTo(x+space,base-height-10);c.stroke();
        c.fillStyle='#f0b84b35';c.fillRect(x+25,base-height+25,7,3);c.fillRect(x+space*.5,base-height+25,7,3);}
      if(factor===.65){c.fillStyle='#29303b';c.fillRect(x,base+7,space,7);c.fillRect(x+30,base-16,7,40);}
    }
  }
  c.strokeStyle='#b1874933';c.lineWidth=1;c.beginPath();c.moveTo(0,75);c.lineTo(960,115);c.moveTo(0,80);c.lineTo(960,120);c.stroke();
}
function drawLaunchGate(c,s){
  drawRoundedRect(c,s.x-65,499,130,11,2,'#3c4551','#a48652');
  for(const sign of [-1,1]){
    drawRoundedRect(c,s.x+sign*34-9,s.y-36,18,146,3,'#303945','#82909d66');
    c.fillStyle='#b78c4a';c.fillRect(s.x+sign*34-6,s.y-25,12,5);c.fillRect(s.x+sign*34-6,479,12,5);
  }
  c.strokeStyle='#e4b76699';c.lineWidth=2;c.beginPath();c.moveTo(s.x-34,s.y);c.lineTo(birdState.dragX,birdState.dragY);c.lineTo(s.x+34,s.y);c.stroke();
  const pull=Math.hypot(s.x-birdState.dragX,s.y-birdState.dragY)/s.maxPull;
  c.strokeStyle=`rgba(240,184,75,${.3+pull*.6})`;c.lineWidth=1+pull*2;c.beginPath();c.arc(birdState.dragX,birdState.dragY,s.radius+7,0,Math.PI*2);c.stroke();
  if(['IDLE','SLINGSHOT'].includes(birdState.phase)){
    drawBreaker(c,birdState.dragX,birdState.dragY,s.radius);
    if(birdState.dragging){const vx=(s.x-birdState.dragX)*s.launchScale,vy=(s.y-birdState.dragY)*s.launchScale;
      c.fillStyle='#e5bd8588';for(let i=1;i<10;i++){const t=i*.045;c.beginPath();c.arc(s.x+vx*t,s.y+vy*t+.5*BIRD_CONFIG.flight.gravity*t*t,2,0,Math.PI*2);c.fill();}}
  }
}
function drawFlightCore(c,gate,time){
  const type=BIRD_BONUS_TYPES[gate.type],pulse=1+Math.sin(time*3+gate.id)*.045;
  c.save();c.translate(gate.x,gate.y);c.scale(pulse,pulse);c.rotate(Math.sin(time*.8+gate.id)*.1);
  c.fillStyle='#f0b84b0d';c.beginPath();c.arc(0,0,gate.r+7,0,Math.PI*2);c.fill();
  if(!['split','bomb','ricochet'].includes(gate.type)||!drawVBSprite(c,gate.type,-gate.r,-gate.r,gate.r*2,gate.r*2)){
    c.fillStyle='#303844';c.strokeStyle='#bb9760';c.lineWidth=2;c.beginPath();c.arc(0,0,gate.r*.85,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#e5d3a6';c.font='bold 16px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(type.label,0,0);
  }c.restore();
}
function drawBirdGame(){
  const c=bctx,W=960,H=540,cam=birdState.camera,run=birdState.run;
  // Higher backing-store resolution never changes world coordinates or physics.
  c.setTransform(birdCanvas.width/W,0,0,birdCanvas.height/H,0,0);
  drawIndustrialBackground(c,cam);
  c.save();const shake=birdState.shake*Math.sin((run?.time||0)*91);
  c.translate(-cam.x*cam.zoom+shake,H-H*cam.zoom);c.scale(cam.zoom,cam.zoom);
  const left=cam.x,right=cam.x+W/cam.zoom;
  c.fillStyle='#11161d';c.fillRect(left,510,right-left,90);c.fillStyle='#56606b';c.fillRect(left,508,right-left,5);
  c.fillStyle='#af8a4b';for(let x=Math.floor(left/90)*90;x<right;x+=90){c.save();c.translate(x,512);c.rotate(-.6);c.fillRect(0,0,15,3);c.restore();}
  const s=BIRD_CONFIG.sling;if(cam.x<s.x+140)drawLaunchGate(c,s);
  if(run){
    // Nothing is generated or drawn in the held/aiming state.
    if(run.phase!=='SLINGSHOT')for(const gate of run.bonuses)if(!gate.collected&&gate.x>left-30&&gate.x<right+30)drawFlightCore(c,gate,run.time);
    if(run.targetAdded){
      for(const b of run.blocks)if(b.alive){
        c.save();c.translate(b.x,b.y);c.rotate(b.angle);
        drawRoundedRect(c,-b.w/2,-b.h/2,b.w,b.h,2,'#39414c','#b18c5044');
        drawVBSprite(c,breakerBlockSprite(b),-b.w/2,-b.h/2,b.w,b.h,'cover');
        const ratio=b.hp/b.maxHp;
        if(ratio<.7){c.strokeStyle='#d9b48899';c.lineWidth=ratio<.4?1.5:1;c.beginPath();c.moveTo(-b.w*.3,-b.h*.3);c.lineTo(0,0);c.lineTo(-b.w*.15,b.h*.3);if(ratio<.4){c.moveTo(0,0);c.lineTo(b.w*.3,-b.h*.15);}c.stroke();}
        if(ratio<.15){c.fillStyle='#f0b84b66';c.fillRect(-b.w*.1,-b.h*.1,Math.max(2,b.w*.2),Math.max(2,b.h*.2));}c.restore();
      }
      for(const p of run.pigs)if(p.alive)drawSentinel(c,p);
    }
    for(const b of run.birds)if(b.alive){
      const trail=birdState.trails.get(b.id)||[];c.strokeStyle=b.bomb?'#d2794980':b.ricochet?'#6ed6ff60':'#e5b46d60';c.lineWidth=Math.max(2,b.r*.18);c.beginPath();
      trail.forEach((p,i)=>{if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.lineTo(b.x,b.y);c.stroke();
      drawBreaker(c,b.x,b.y,b.r,b);
    }
    if(birdState.debug){
      c.font='10px monospace';c.textAlign='left';c.strokeStyle='#fbed6f';
      for(const b of run.world.bodies)if(b.alive&&!b.static){const box=BIRD_PHYSICS.bounds(b);c.strokeRect(box.minX,box.minY,box.maxX-box.minX,box.maxY-box.minY);c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x+b.vx*.1,b.y+b.vy*.1);c.stroke();c.fillStyle='#fff';c.fillText(`${b.material} ${Math.round(b.hp||0)} ${b.sleeping?'SLEEP':''}`,b.x,b.y-20);}
      for(const b of run.bonuses){c.fillStyle=b.placement==='corridor'?'#e6ff8e':'#ffc2c2';c.fillText(b.placement,b.x,b.y-32);}
      c.strokeStyle='#fbed6f88';c.beginPath();for(let t=0;t<run.plan.flightPlan.duration;t+=.04){const x=s.x+BIRD_CONFIG.flight.nominalVx*t,y=s.y+BIRD_CONFIG.flight.nominalVy*t+.5*BIRD_CONFIG.flight.gravity*t*t;if(t===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
    }
  }
  for(const p of birdState.particles){c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size);}c.globalAlpha=1;c.restore();
  if(birdState.debug&&run){c.fillStyle='#e5d3a6';c.font='12px monospace';c.textAlign='left';c.fillText(`seed ${run.plan.seed} · ${run.phase}`,20,515);}
  if(birdState.phase==='RESULT'&&run?.result){
    drawRoundedRect(c,300,180,360,125,12,'#171c24ef','#bc986b99');c.textAlign='center';c.fillStyle='#e5d3a6';c.font='700 16px system-ui';c.fillText(birdState.roundWin>0?'BREACH COMPLETE':'NO BREACH',480,212);c.font='800 35px system-ui';c.fillText(birdState.roundWin>0?'+'+birdMoney(birdState.roundWin):'0',480,253);c.font='13px system-ui';c.fillText(`${run.pigsDestroyed} SENTINELS · ${run.blocksDestroyed} BLOCKS · ×${run.multiplier}`,480,283);
  }
}
function updateBirdUI(){
  syncLobbyBalance();el('birdBalance').textContent=window.VaultWalletService?.formatBalance()??fmt(state.balance);
  el('birdBetValue').textContent=fmt(birdBet());el('birdsLeft').textContent=birdState.run?.multiplier||1;
  el('pigsKilled').textContent=birdState.pigsKilled;el('birdRoundWin').textContent=birdMoney(birdState.roundWin);
  for(const id of ['birdBetMinus','birdBetPlus','birdMaxBet'])el(id).disabled=birdState.phase!=='IDLE';
  const button=el('birdStartBtn');button.disabled=!['IDLE','SLINGSHOT'].includes(birdState.phase)||(birdState.phase==='IDLE'&&state.balance<birdBet());
  button.textContent=({IDLE:'НОВЫЙ БРОСОК',SLINGSHOT:'ЗАПУСТИТЬ',FLIGHT:'В ПОЛЁТЕ',APPROACH:'ПОДЛЁТ',IMPACT:'УДАР',SETTLING:'РАЗРУШЕНИЕ',RESULT:'РЕЗУЛЬТАТ'})[birdState.phase]||'ГОТОВО';
  const badges=el('birdBonusHud'),text=(birdState.run?.collected||[]).map(k=>k.startsWith('x')?BIRD_BONUS_TYPES[k].label:k.toUpperCase()).join(' · ');
  if(badges.textContent!==text)badges.textContent=text;
  for(const id of ['birdSteerLeft','birdSteerRight'])el(id).disabled=birdState.phase!=='FLIGHT';
  el('birdSoundBtn').textContent=state.sound?'♪':'♪̸';el('birdSoundBtn').setAttribute('aria-pressed',String(state.sound));
}
function birdPointerPos(e){const r=birdCanvas.getBoundingClientRect(),cam=birdState.camera;return {
  x:(e.clientX-r.left)*960/r.width/cam.zoom+cam.x,
  y:((e.clientY-r.top)*540/r.height-(540-540*cam.zoom))/cam.zoom};}
birdCanvas.addEventListener('pointerdown',e=>{
  if(!['IDLE','SLINGSHOT','FLIGHT'].includes(birdState.phase)||birdState.pointerId!==null)return;
  const p=birdPointerPos(e),s=BIRD_CONFIG.sling;
  if(birdState.phase==='FLIGHT'){birdState.pointerId=e.pointerId;birdState.flightPointerX=p.x;birdCanvas.setPointerCapture(e.pointerId);return;}
  const hitRadius=Math.max(44,22*960/birdCanvas.getBoundingClientRect().width);
  if(Math.hypot(p.x-birdState.dragX,p.y-birdState.dragY)>hitRadius)return;
  if(birdState.phase==='IDLE')startBirdRound();if(birdState.phase!=='SLINGSHOT')return;
  birdState.dragging=true;birdState.pointerId=e.pointerId;birdCanvas.setPointerCapture(e.pointerId);sound(120,.06,'triangle',.012);e.preventDefault();
});
birdCanvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==birdState.pointerId)return;const p=birdPointerPos(e);
  if(birdState.phase==='FLIGHT'){birdState.steer=clamp((p.x-birdState.flightPointerX)/100,-1,1);return;}
  if(!birdState.dragging)return;const s=BIRD_CONFIG.sling,dx=Math.min(0,p.x-s.x),dy=p.y-s.y,k=Math.min(1,s.maxPull/(Math.hypot(dx,dy)||1));
  birdState.dragX=s.x+dx*k;birdState.dragY=s.y+dy*k;
});
function birdReleasePointer(e,cancel=false){
  if(e.pointerId!==birdState.pointerId)return;
  if(birdState.dragging&&!cancel)launchBird();birdState.dragging=false;birdState.pointerId=null;birdState.steer=0;
  birdState.dragX=BIRD_CONFIG.sling.x;birdState.dragY=BIRD_CONFIG.sling.y;
  if(birdCanvas.hasPointerCapture(e.pointerId))birdCanvas.releasePointerCapture(e.pointerId);
}
birdCanvas.addEventListener('pointerup',e=>birdReleasePointer(e));birdCanvas.addEventListener('pointercancel',e=>birdReleasePointer(e,true));
const birdKeys=new Set();
window.addEventListener('keydown',e=>{if(!document.body.classList.contains('bird-active')||e.target.matches('input,textarea,select'))return;
  if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)){e.preventDefault();birdKeys.add(e.key.toLowerCase());birdState.steer=(birdKeys.has('arrowright')||birdKeys.has('d')?1:0)-(birdKeys.has('arrowleft')||birdKeys.has('a')?1:0);}
  if(e.code==='Space'&&birdState.phase==='SLINGSHOT'&&!e.repeat){e.preventDefault();launchBird(true);}
});
window.addEventListener('keyup',e=>{birdKeys.delete(e.key.toLowerCase());birdState.steer=(birdKeys.has('arrowright')||birdKeys.has('d')?1:0)-(birdKeys.has('arrowleft')||birdKeys.has('a')?1:0);});
function clearBirdInput(){birdKeys.clear();birdState.steer=0;birdState.dragging=false;birdState.pointerId=null;}
window.addEventListener('blur',clearBirdInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearBirdInput();});
for(const [id,direction] of [['birdSteerLeft',-1],['birdSteerRight',1]]){
  const button=el(id);button.addEventListener('pointerdown',e=>{if(birdState.phase!=='FLIGHT')return;button.setPointerCapture(e.pointerId);birdState.steer=direction;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{birdState.steer=0;});
}
el('birdSoundBtn').onclick=()=>{toggleSetting('sound');updateBirdUI();};
let birdAnimLast=performance.now(),birdUiClock=0;
function birdLoop(now){
  const dt=Math.min(BIRD_PHYSICS.SETTINGS.MAX_FRAME_DELTA,Math.max(0,(now-birdAnimLast)/1000));birdAnimLast=now;
  if(document.body.classList.contains('bird-active')&&!document.hidden){
    if(birdState.active){birdState.accumulator+=dt;while(birdState.accumulator>=BIRD_PHYSICS.SETTINGS.DT){birdState.accumulator-=BIRD_PHYSICS.SETTINGS.DT;updateBirdPhysics(BIRD_PHYSICS.SETTINGS.DT);if(!birdState.active)break;}}
    if(birdState.phase==='RESULT'){birdState.resultTime+=dt;if(birdState.resultTime>=BIRD_CONFIG.round.resultSeconds){birdState.phase='RESETTING';const last=birdState.lastResult,win=birdState.roundWin;resetBirdRecovery();birdState.lastResult=last;birdState.roundWin=win;updateBirdUI();}}
    const run=birdState.run,primary=run?.birds[0],cam=birdState.camera;
    updateSentinelRenderAngles(run,dt);
    for(const b of run?.birds||[])if(b.alive){const trail=birdState.trails.get(b.id)||[];trail.push({x:b.x,y:b.y});if(trail.length>12)trail.shift();birdState.trails.set(b.id,trail);}
    for(const id of birdState.trails.keys())if(!run?.birds.some(b=>b.id===id&&b.alive))birdState.trails.delete(id);
    let desiredX=0,desiredZoom=1;
    if(primary){desiredX=Math.max(0,primary.x-310);if(run.targetAdded){const box=run.plan.buildingPlan.bounds;
      desiredZoom=Math.min(.95,800/(box.right-box.left+240),440/(510-box.top+50));desiredZoom=Math.max(.55,desiredZoom);
      desiredX=box.left-140;}}
    const ease=1-Math.exp(-dt*4);cam.x+=(desiredX-cam.x)*ease;cam.zoom+=(desiredZoom-cam.zoom)*ease;
    birdState.shake=Math.max(0,birdState.shake-dt*8);
    for(const p of birdState.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;}
    birdState.particles=birdState.particles.filter(p=>p.life>0);
    drawBirdGame();birdUiClock+=dt;if(birdUiClock>.1){updateBirdUI();birdUiClock=0;}
  }else{birdState.accumulator=0;clearBirdInput();}
  requestAnimationFrame(birdLoop);
}
requestAnimationFrame(birdLoop);
