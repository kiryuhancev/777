// Browser adapter: input/camera/presentation. Business state stays in VAULT services.
const BIRD_DEBUG=BIRD_CONFIG.debug;
let birdState={betIndex:1,phase:'IDLE',run:null,roundId:null,roundBet:0,roundWin:0,pigsKilled:0,
  dragging:false,pointerId:null,dragX:BIRD_CONFIG.sling.x,dragY:BIRD_CONFIG.sling.y,
  accumulator:0,resultTime:0,camera:{x:0,zoom:1},particles:[],shake:0,steer:0,debug:BIRD_DEBUG,lastResult:null};
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
function resizeBirdCanvas(){/* A fixed logical viewport avoids mobile-dependent mathematics. */}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function resetBirdRecovery(){
  birdState.phase='IDLE';birdState.run=null;birdState.roundId=null;birdState.roundBet=0;
  birdState.roundWin=0;birdState.pigsKilled=0;birdState.dragging=false;birdState.pointerId=null;
  birdState.dragX=BIRD_CONFIG.sling.x;birdState.dragY=BIRD_CONFIG.sling.y;birdState.accumulator=0;
  birdState.resultTime=0;birdState.camera={x:0,zoom:1};birdState.particles=[];birdState.shake=0;birdState.steer=0;
}
function birdEffect(event,data){
  if(event==='phase'){
    birdState.phase=data;
    const messages={APPROACH:'Цель впереди. Камера открывает постройку.',IMPACT:'Удар! Результат определяют столкновения.',SETTLING:'Разрушения продолжаются…'};
    if(messages[data])el('birdMessage').textContent=messages[data];return;
  }
  if(event==='bonus'){sound(700,.07,'sine');updateBirdUI();return;}
  if(event==='impact'){birdState.shake=Math.min(3,data.impulse/600);sound(80,.06,'triangle',.015);return;}
  if(event==='break'||event==='blast'){
    const random=BIRD_MODEL.rng((birdState.run?.plan.seed||0)+Math.round(birdState.run?.time*120||0)+birdState.particles.length);
    const count=event==='blast'?24:8;
    for(let i=0;i<count&&birdState.particles.length<BIRD_CONFIG.round.maxParticles;i++)birdState.particles.push({
      x:data.x,y:data.y,vx:(random()-.5)*230,vy:-random()*180,life:.45+random()*.55,
      size:data.material==='stone'?5:2+random()*3,color:data.color||'#e5b56f'});
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
  el('birdMessage').textContent='Оттяни птицу и отпусти. Или нажми «ЗАПУСТИТЬ» для стандартного броска.';
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
  el('birdMessage').textContent=`${result.payout>0?'ROUND WIN +'+birdMoney(result.payout):'NO WIN'} · ${result.pigsDestroyed} свиней · ${result.blocksDestroyed} блоков · ×${result.multiplier}`;
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
function drawBirdShape(c,x,y,r,b={}){
  c.save();c.translate(x,y);c.rotate(b.angle||0);
  c.shadowColor='#0005';c.shadowBlur=8;c.shadowOffsetY=4;
  c.fillStyle=b.bomb?'#414653':b.mega?'#e8b66e':'#b85956';c.beginPath();c.ellipse(0,0,r,r*.87,0,0,Math.PI*2);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
  c.fillStyle='#e7cd9f';c.beginPath();c.moveTo(r*.7,-3);c.lineTo(r+10,2);c.lineTo(r*.65,7);c.fill();
  c.fillStyle='#f3e9d7';c.beginPath();c.arc(r*.35,-r*.22,r*.24,0,Math.PI*2);c.fill();
  c.fillStyle='#262631';c.beginPath();c.arc(r*.42,-r*.22,r*.09,0,Math.PI*2);c.fill();
  c.strokeStyle='#edd09b';c.lineWidth=2;c.beginPath();c.arc(-r*.22,3,r*.45,.1,2);c.stroke();
  if(b.hunter){c.strokeStyle='#c5d985';c.strokeRect(-r,-r,r*2,r*2);}c.restore();
}
function drawBirdGame(){
  const c=bctx,W=960,H=540,cam=birdState.camera,run=birdState.run;
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#263c56');sky.addColorStop(.6,'#809da8');sky.addColorStop(1,'#d4b58d');
  c.fillStyle=sky;c.fillRect(0,0,W,H);
  c.fillStyle='#e8d5ae';c.beginPath();c.arc(740-cam.x*.035,115,39,0,Math.PI*2);c.fill();
  const drift=performance.now()*.003;
  c.fillStyle='#d5e0de25';for(let i=0;i<5;i++){
    const x=((i*271-cam.x*.06+drift)%1300+1300)%1300-140,y=82+(i%3)*43;
    c.beginPath();c.ellipse(x,y,65,13,0,0,Math.PI*2);c.ellipse(x+23,y-8,36,14,0,0,Math.PI*2);c.fill();
  }
  // Three independently moving layers, bounded drawing regardless of world length.
  for(const [factor,base,amp,color] of [[.10,325,65,'#49647a'],[.28,405,55,'#496b69'],[.65,485,26,'#38534f']]){
    c.fillStyle=color;c.beginPath();c.moveTo(0,H);for(let x=-40;x<=1000;x+=30){const world=x+cam.x*factor;
      c.lineTo(x,base+Math.sin(world*.007)*amp+Math.sin(world*.013)*amp*.25);}c.lineTo(W,H);c.fill();
  }
  c.save();const shake=birdState.shake*Math.sin((run?.time||0)*91);
  c.translate(-cam.x*cam.zoom+shake,H-H*cam.zoom);c.scale(cam.zoom,cam.zoom);
  const left=cam.x,right=cam.x+W/cam.zoom;
  c.fillStyle='#34473c';c.fillRect(left,510,right-left,90);c.fillStyle='#9ba878';c.fillRect(left,508,right-left,5);
  c.fillStyle='#62755c';for(let x=Math.floor(left/90)*90;x<right;x+=90){c.beginPath();c.moveTo(x,510);c.lineTo(x+4,499);c.lineTo(x+10,510);c.fill();}
  const s=BIRD_CONFIG.sling;
  if(cam.x<s.x+140){
    c.strokeStyle='#8e7255';c.lineWidth=13;c.lineCap='round';c.beginPath();c.moveTo(s.x,510);c.lineTo(s.x,425);c.lineTo(s.x-19,s.y);c.moveTo(s.x,425);c.lineTo(s.x+19,s.y);c.stroke();
    if(['IDLE','SLINGSHOT'].includes(birdState.phase)){
      c.strokeStyle='#d4af79';c.lineWidth=4;c.beginPath();c.moveTo(s.x-19,s.y);c.lineTo(birdState.dragX,birdState.dragY);c.lineTo(s.x+19,s.y);c.stroke();
      drawBirdShape(c,birdState.dragX,birdState.dragY,s.radius);
      if(birdState.dragging){const vx=(s.x-birdState.dragX)*s.launchScale,vy=(s.y-birdState.dragY)*s.launchScale;
        c.fillStyle='#f3dfb6aa';for(let i=1;i<10;i++){const t=i*.045;c.beginPath();c.arc(s.x+vx*t,s.y+vy*t+.5*BIRD_CONFIG.flight.gravity*t*t,3,0,Math.PI*2);c.fill();}}
    }
  }
  if(run){
    for(const gate of run.bonuses)if(!gate.collected&&gate.x>left-30&&gate.x<right+30){
      const type=BIRD_BONUS_TYPES[gate.type];c.fillStyle='#23383b';c.strokeStyle=type.color;c.lineWidth=3;c.beginPath();c.arc(gate.x,gate.y,gate.r,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle=type.color;c.font='bold 18px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(type.label,gate.x,gate.y);
    }
    if(run.targetAdded){
      for(const b of run.blocks)if(b.alive){
        c.save();c.translate(b.x,b.y);c.rotate(b.angle);drawRoundedRect(c,-b.w/2,-b.h/2,b.w,b.h,2,b.color,'#20333f66');
        c.fillStyle='#ffffff30';c.fillRect(-b.w/2+2,-b.h/2+2,b.w-4,3);
        const ratio=b.hp/b.maxHp;if(ratio<.7){c.strokeStyle=b.material==='glass'?'#eefaff':'#302b2d88';c.lineWidth=ratio<.4?2:1;c.beginPath();c.moveTo(-b.w*.3,-b.h*.3);c.lineTo(0,0);c.lineTo(-b.w*.15,b.h*.3);if(ratio<.4){c.moveTo(0,0);c.lineTo(b.w*.3,-b.h*.15);}c.stroke();}
        if(ratio<.15){c.fillStyle='#b94a4930';c.fillRect(-b.w/2,-b.h/2,b.w,b.h);}c.restore();
      }
      for(const p of run.pigs)if(p.alive){
        c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle=p.flash?'#d7e5a5':p.color;c.strokeStyle='#355447';c.lineWidth=2;c.beginPath();c.arc(0,0,p.r,0,Math.PI*2);c.fill();c.stroke();
        c.fillStyle='#b3c995';c.beginPath();c.ellipse(0,5,p.r*.5,p.r*.3,0,0,Math.PI*2);c.fill();
        c.fillStyle='#283e37';for(const x of [-5,5]){c.beginPath();c.arc(x,-5,2.5,0,Math.PI*2);c.fill();c.beginPath();c.arc(x*.65,5,1.7,0,Math.PI*2);c.fill();}
        if(p.type==='helmet'){c.fillStyle='#728391';c.beginPath();c.arc(0,-5,p.r*.88,Math.PI,0);c.fill();}
        if(p.type==='royal'){c.fillStyle='#d9bb72';c.fillRect(-9,-p.r-6,18,7);}
        c.fillStyle='#263f3955';c.fillRect(-p.r,-p.r-12,p.r*2,3);c.fillStyle='#d6cf96';c.fillRect(-p.r,-p.r-12,p.r*2*Math.max(0,p.hp/p.maxHp),3);c.restore();
      }
    }
    for(const b of run.birds)if(b.alive)drawBirdShape(c,b.x,b.y,b.r,b);
    if(birdState.debug){
      c.font='10px monospace';c.textAlign='left';c.strokeStyle='#fbed6f';
      for(const b of run.world.bodies)if(b.alive&&!b.static){const box=BIRD_PHYSICS.bounds(b);c.strokeRect(box.minX,box.minY,box.maxX-box.minX,box.maxY-box.minY);c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x+b.vx*.1,b.y+b.vy*.1);c.stroke();c.fillStyle='#fff';c.fillText(`${b.material} ${Math.round(b.hp||0)} ${b.sleeping?'SLEEP':''}`,b.x,b.y-20);}
      for(const b of run.bonuses){c.fillStyle=b.placement==='corridor'?'#e6ff8e':'#ffc2c2';c.fillText(b.placement,b.x,b.y-32);}
      c.strokeStyle='#fbed6f88';c.beginPath();for(let t=0;t<run.plan.flightPlan.duration;t+=.04){const x=s.x+BIRD_CONFIG.flight.nominalVx*t,y=s.y+BIRD_CONFIG.flight.nominalVy*t+.5*BIRD_CONFIG.flight.gravity*t*t;if(t===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
    }
  }
  for(const p of birdState.particles){c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size);}c.globalAlpha=1;c.restore();
  if(birdState.debug&&run){c.fillStyle='#fff';c.font='12px monospace';c.textAlign='left';c.fillText(`seed ${run.plan.seed} · ${run.phase} · correction ${run.correctionDistance.toFixed(1)}`,20,515);}
  if(birdState.phase==='RESULT'&&run?.result){
    drawRoundedRect(c,300,180,360,125,20,'#152c35ef','#e3c89299');c.textAlign='center';c.fillStyle='#e9d7ae';c.font='700 16px system-ui';c.fillText(birdState.roundWin>0?'ROUND WIN':'NO WIN',480,212);c.font='800 35px system-ui';c.fillText(birdState.roundWin>0?'+'+birdMoney(birdState.roundWin):'0',480,253);c.font='13px system-ui';c.fillText(`${run.pigsDestroyed} PIGS · ${run.blocksDestroyed} BLOCKS · ×${run.multiplier}`,480,283);
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
