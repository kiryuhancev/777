'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const physics=require('./bird-physics.cjs').loadPhysics();const {createBody,createWorld,step,SETTINGS}=physics;
const report={checks:[],metrics:{}};
function test(name,fn){fn();report.checks.push(name);console.log('PASS',name);}
function advance(w,seconds){for(let i=0;i<Math.ceil(seconds/SETTINGS.DT);i++)step(w);}
function body(w,o){const b=createBody(o);w.bodies.push(b);return b;}
function hitBoard(material){const w=createWorld({ground:false,gravity:0}),board=body(w,{x:230,y:330,w:18,h:100,material}),bird=body(w,{shape:'circle',kind:'bird',material:'bird',x:100,y:309,r:14,vx:700});advance(w,.36);return {board,bird};}
test('off-centre hit rotates light board; bird remains dynamic after impact',()=>{
 const {board,bird}=hitBoard('lightWood');assert.ok(Math.abs(board.angularVelocity)>1);assert.ok(Math.hypot(bird.vx,bird.vy)>10);assert.ok(bird.alive&&!bird.static);report.metrics.light={speed:Math.hypot(board.vx,board.vy),omega:board.angularVelocity,birdSpeed:Math.hypot(bird.vx,bird.vy)};
});
test('same-size stone moves less than light wood and removes more forward bird velocity',()=>{
 const light=hitBoard('lightWood'),heavy=hitBoard('stone');assert.ok(Math.hypot(heavy.board.vx,heavy.board.vy)<Math.hypot(light.board.vx,light.board.vy));assert.ok(heavy.bird.vx<light.bird.vx);report.metrics.stone={speed:Math.hypot(heavy.board.vx,heavy.board.vy),omega:heavy.board.angularVelocity,birdVx:heavy.bird.vx};
});
test('density scales mass with area; rectangle inertia follows physical formula',()=>{
 const a=createBody({w:16,h:100,material:'wood'}),b=createBody({w:16,h:200,material:'wood'});assert.equal(b.mass,2*a.mass);assert.ok(Math.abs(a.inertia-a.mass*(16**2+100**2)/12)<1e-9);
});
test('stable tower sleeps; removing a support wakes it and tumbles the pig',()=>{
 let damage=0;const w=createWorld({onImpact:(a,b,j)=>{if([a,b].some(x=>x.kind==='pig')&&j>95)damage+=j;}});
 const left=body(w,{x:550,y:481,w:16,h:58}),right=body(w,{x:650,y:481,w:16,h:58});
 const beam=body(w,{x:600,y:445,w:132,h:14}),pig=body(w,{shape:'circle',kind:'pig',material:'pig',x:575,y:422,r:16});
 advance(w,2);assert.ok([left,right,beam,pig].every(b=>b.sleeping));assert.ok(Math.abs(beam.angle)<.01);
 left.alive=false;advance(w,5);assert.ok(pig.y>450);assert.ok(Math.abs(pig.angle)>.05);assert.ok(damage>0);report.metrics.collapse={pigY:pig.y,pigAngle:pig.angle,damage};
});
test('tangential bird/pig contact generates translation and angular motion',()=>{
 const w=createWorld({ground:false,gravity:0}),pig=body(w,{shape:'circle',kind:'pig',material:'pig',x:250,y:320,r:16});body(w,{shape:'circle',kind:'bird',material:'bird',x:100,y:300,r:14,vx:700});advance(w,.4);assert.ok(pig.vx>10);assert.ok(Math.abs(pig.angularVelocity)>.1);
});
test('bird rebounds from a wall and damages a second pig through another actual contact',()=>{
 let pigImpact=0;const w=createWorld({ground:false,gravity:0,onImpact:(a,b,j)=>{if(a.kind==='pig'||b.kind==='pig')pigImpact=Math.max(pigImpact,j);}});
 body(w,{static:true,material:'stone',x:240,y:300,w:16,h:100});const pig=body(w,{shape:'circle',kind:'pig',material:'pig',x:90,y:300,r:16});
 const bird=body(w,{shape:'circle',kind:'bird',material:'bird',x:160,y:300,r:14,vx:900});advance(w,.8);
 assert.ok(pigImpact>95+45/.22);assert.ok(bird.alive);assert.ok(pig.vx<0);report.metrics.secondContactImpulse=pigImpact;
});
test('falling stone beam delivers lethal impulse without a bird',()=>{
 let hp=45;const w=createWorld({onImpact:(a,b,j)=>{if(a.kind==='pig'||b.kind==='pig'){const floor=a.static||b.static,threshold=floor?200:95;hp-=Math.max(0,j-threshold)*.22;}}});
 body(w,{shape:'circle',kind:'pig',material:'pig',x:600,y:494,r:16});body(w,{material:'stone',x:600,y:300,w:110,h:18});advance(w,1);assert.ok(hp<=0);report.metrics.pigHpAfterStone=hp;
});
test('rotated rectangle contacts exchange momentum and angular impulse',()=>{
 const w=createWorld({ground:false,gravity:0}),a=body(w,{x:150,y:250,w:80,h:18,angle:.25,vx:500,linearDamping:0,angularDamping:0}),b=body(w,{x:260,y:260,w:18,h:90,angle:-.15,linearDamping:0,angularDamping:0});
 const before=a.mass*a.vx,energy=a.mass*a.vx*a.vx/2;advance(w,.35);
 const afterEnergy=[a,b].reduce((sum,x)=>sum+x.mass*(x.vx*x.vx+x.vy*x.vy)/2+x.inertia*x.angularVelocity*x.angularVelocity/2,0);assert.ok(afterEnergy<=energy*1.001);assert.ok(b.vx>0);assert.ok(Math.abs(a.angularVelocity)+Math.abs(b.angularVelocity)>.1);assert.ok(Math.abs(a.mass*a.vx+b.mass*b.vx-before)<1e-6);
});
test('bird bounces repeatedly on ground, then the contact island sleeps',()=>{
 const w=createWorld(),bird=body(w,{kind:'bird',shape:'circle',material:'bird',x:200,y:300,r:14});let bounces=0,last=0;
 for(let i=0;i<1800;i++){step(w);if(last>0&&bird.vy< -1)bounces++;last=bird.vy;assert.ok(bird.y+bird.r<=510.7);}
 assert.ok(bounces>=2);assert.ok(bird.sleeping);report.metrics.groundBounces=bounces;
});
test('fast bird cannot tunnel through a thin rotated plank',()=>{
 let impacts=0;const w=createWorld({ground:false,gravity:0,onImpact:()=>impacts++});body(w,{static:true,material:'stone',x:220,y:300,w:6,h:110,angle:.1});
 const bird=body(w,{shape:'circle',kind:'bird',material:'bird',x:100,y:300,r:14,vx:4000});advance(w,.08);assert.ok(impacts>0);assert.ok(bird.vx<0);
});
test('all body shapes stay above the ground and settle without energy growth',()=>{
 const w=createWorld();const objects=[body(w,{x:400,y:240,w:110,h:14,angle:.7}),body(w,{x:610,y:150,w:18,h:100,material:'stone',angle:-.3}),body(w,{shape:'circle',kind:'pig',material:'pig',x:800,y:130,r:20})];
 advance(w,15);for(const b of objects){assert.ok(Number.isFinite(b.angle+b.x+b.vx));assert.ok(physics.bounds(b).maxY<511);assert.ok(b.sleeping);}report.metrics.restingBodies=objects.length;
});
fs.writeFileSync('reports/bird-physics.json',JSON.stringify(report,null,2)+'\n');console.log(`${report.checks.length} physical scenarios passed`);
