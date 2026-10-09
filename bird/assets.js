// Approved archive assets; embedded at build time, loaded/decoded once.
const VB_ASSET_MANIFEST={
  "player": {
    "src": "__VB_ASSET_units/player_projectile_sideview.webp__",
    "crop": [
      21,
      73,
      1055,
      909
    ],
    "file": "units/player_projectile_sideview.webp"
  },
  "sentinelBasic": {
    "src": "__VB_ASSET_units/enemy_spherical_guard_front.webp__",
    "crop": [
      2,
      58,
      1097,
      982
    ],
    "file": "units/enemy_spherical_guard_front.webp"
  },
  "sentinelScout": {
    "src": "__VB_ASSET_units/enemy_eye_guard_front.webp__",
    "crop": [
      52,
      52,
      995,
      974
    ],
    "file": "units/enemy_eye_guard_front.webp"
  },
  "beam": {
    "src": "__VB_ASSET_structures/industrial_beam.webp__",
    "crop": [
      8,
      387,
      1084,
      351
    ],
    "file": "structures/industrial_beam.webp"
  },
  "column": {
    "src": "__VB_ASSET_structures/support_column.webp__",
    "crop": [
      340,
      51,
      421,
      997
    ],
    "file": "structures/support_column.webp"
  },
  "container": {
    "src": "__VB_ASSET_structures/energy_container.webp__",
    "crop": [
      45,
      253,
      1019,
      711
    ],
    "file": "structures/energy_container.webp"
  },
  "armor": {
    "src": "__VB_ASSET_structures/armored_block.webp__",
    "crop": [
      85,
      96,
      933,
      912
    ],
    "file": "structures/armored_block.webp"
  },
  "split": {
    "src": "__VB_ASSET_bonuses/split_core_bonus.webp__",
    "crop": [
      75,
      127,
      951,
      844
    ],
    "file": "bonuses/split_core_bonus.webp"
  },
  "ricochet": {
    "src": "__VB_ASSET_bonuses/ricochet_sphere_bonus.webp__",
    "crop": [
      114,
      122,
      939,
      864
    ],
    "file": "bonuses/ricochet_sphere_bonus.webp"
  },
  "bomb": {
    "src": "__VB_ASSET_bonuses/bomb_core_bonus.webp__",
    "crop": [
      49,
      66,
      1003,
      968
    ],
    "file": "bonuses/bomb_core_bonus.webp"
  },
  "logo": {
    "src": "__VB_ASSET_branding/logo_vault_breakers.webp__",
    "crop": [
      0,
      0,
      1100,
      619
    ],
    "file": "branding/logo_vault_breakers.webp"
  }
};
const VB_ASSETS=Object.fromEntries(Object.entries(VB_ASSET_MANIFEST).map(([name,entry])=>[name,{...entry,image:null,status:'loading'}]));
const VB_ASSETS_READY=Promise.allSettled(Object.entries(VB_ASSETS).map(([name,asset])=>new Promise(resolve=>{
  const img=new Image();asset.image=img;
  img.onload=()=>{asset.status='ready';if(name==='logo'){const logo=document.getElementById('vbLogo');if(logo){logo.src=asset.src;logo.hidden=false;document.getElementById('vbTitle').hidden=true;}}resolve(true);};
  img.onerror=()=>{asset.status='failed';console.warn('VAULT BREAKERS asset unavailable:',asset.file);resolve(false);};
  img.src=asset.src;
})));
// Drawing preserves aspect ratio. Cover mode crops industrial panels to their OBB,
// while units use contain mode and independent simple colliders.
function drawVBSprite(c,name,x,y,w,h,mode='contain'){
  const asset=VB_ASSETS[name];if(!asset||asset.status!=='ready')return false;
  let [sx,sy,sw,sh]=asset.crop;
  if(mode==='cover'){
    const desired=w/h,ratio=sw/sh;
    if(ratio>desired){const width=sh*desired;sx+=(sw-width)/2;sw=width;}
    else{const height=sw/desired;sy+=(sh-height)/2;sh=height;}
    c.drawImage(asset.image,sx,sy,sw,sh,x,y,w,h);
  }else{
    const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
    c.drawImage(asset.image,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }
  if(birdState.debug){c.strokeStyle='#ffb656';c.lineWidth=.5;c.strokeRect(x,y,w,h);c.fillStyle='#ead5a8';c.font='8px monospace';c.textAlign='left';c.fillText(name,x,y-2);}
  return true;
}
