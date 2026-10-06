'use strict';
const fs=require('node:fs'),path=require('node:path');
function loadPhysics(file=path.join(__dirname,'..','index.html')){
 const html=fs.readFileSync(file,'utf8'),a=html.indexOf('// BIRD RIGID BODY ENGINE'),b=html.indexOf('// END BIRD RIGID BODY ENGINE',a);
 if(a<0||b<0)throw Error('Bird physics engine missing');
 return new Function(html.slice(a,b)+'\nreturn BIRD_PHYSICS;')();
}
module.exports={loadPhysics};
