"""Portable preview using real Swamp art and the actual analog renderer; no wagers."""
from pathlib import Path
import json,base64
root=Path(__file__).resolve().parent.parent;out=root.parent/'output'
paths={k:'symbols/'+k+'.webp' for k in ['bobber','hook','insect','bait_jar','lantern','tackle_box','fish_01','catfish']}
paths.update(scatter='updated_symbols/scatter_fish_reel.webp',collector='updated_symbols/collector_fisherman_reel.webp',money='symbols/money_fish_1.webp')
art={k:'data:image/webp;base64,'+base64.b64encode((root/'assets/swamp'/p).read_bytes()).decode() for k,p in paths.items()}
style='''*{box-sizing:border-box}body{margin:0;background:#101813;color:#f5dfb1;font:14px Arial}main{width:min(820px,100%);margin:20px auto;padding:18px}h1{font-size:24px;letter-spacing:.1em}p{line-height:1.6;color:#c1c8b8}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:18px 0}button,select{min-height:44px;border:1px solid #ba9259;border-radius:8px;background:#263024;color:#ffe8bc;padding:10px;font-weight:bold}button:disabled{opacity:.4}label{display:flex;align-items:center;gap:6px}.frame{padding:14px;background:linear-gradient(120deg,#433628,#151e16);border:4px solid #907449;box-shadow:inset 0 0 0 3px #101710;border-radius:17px}.swamp-reels{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;background:#09130f;border-radius:6px;overflow:hidden}.swamp-reel{display:grid;grid-template-rows:repeat(3,minmax(0,1fr));gap:3px;aspect-ratio:1.08 / 3;overflow:hidden;min-width:0}.swamp-cell{position:relative;min-height:0;display:grid;place-items:center;background:radial-gradient(ellipse,#293d2c,#101b15);border-bottom:1px solid #596a5533;overflow:hidden}.swamp-cell img{width:96%;height:96%;object-fit:contain;min-height:0;min-width:0}.swamp-value{position:absolute;bottom:6%;color:#ffffd5;text-shadow:0 2px 3px #000,2px 0 3px #000;font:bold clamp(11px,3vw,25px) Arial}output{display:block;white-space:pre-wrap;font:12px/1.6 monospace;margin:18px 0}.phases{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:10px 0}.phases span{padding:7px 2px;text-align:center;font:9px Arial;background:#1a291d;overflow-wrap:anywhere}.hint{font-size:12px}.bonus .frame{border-color:#91a753;box-shadow:0 0 20px #79cc3a22}@media(max-width:450px){main{margin:0 auto;padding:12px}h1{font-size:19px}.frame{padding:7px;border-width:3px}.phases span{font-size:7px}}'''
body='''<main><small>VAULT · SWAMP FISHING</small><h1>ANALOG REELS</h1><p>Непрерывная лента, механическая остановка. Фиксированный результат — без ставок и выплат.</p><div class="toolbar"><select id="speed" aria-label="Speed"><option value="normal">NORMAL</option><option value="quick">QUICK ×0.65</option><option value="turbo">TURBO ×0.4</option></select><label><input type="checkbox" id="anticipation">2 SCATTERS</label><label><input type="checkbox" id="bonus">FREE SPINS SCENE</label><label><input type="checkbox" id="reduced">REDUCED MOTION</label></div><div class="frame"><div id="reels" class="swamp-reels"></div></div><div class="phases" id="phases"></div><button id="play">SPIN PREVIEW ↻</button><output id="result">READY</output><p class="hint">START → ACCELERATION → FULL SPEED → DECELERATION → FINAL ALIGNMENT → SETTLED. Финальные символы находятся в ленте до начала вращения и докручиваются до своих мест; при остановке картинки не подменяются.</p></main>'''
script=r'''
const A=ART,regular=['bobber','hook','insect','bait_jar','lantern','tackle_box','fish_01','catfish'],root=document.getElementById('reels'),reels=[];
const cell=t=>'<div class="swamp-cell '+t.id+'" data-symbol="'+t.id+'"'+(t.valueX?' data-value="'+t.valueX+'"':'')+'><img src="'+A[t.id]+'" alt="'+t.id+'">'+(t.valueX?'<strong class="swamp-value">'+t.valueX+'×</strong>':'')+'</div>';
for(let c=0;c<5;c++){
 const reel=document.createElement('div');reel.className='swamp-reel';reel.innerHTML=[0,1,2].map(r=>cell({id:regular[(c*3+r)%8]})).join('');reels.push(reel);root.append(reel);
 const phase=document.createElement('span');phase.textContent='READY';document.getElementById('phases').append(phase);
}
function finalGrid(){
 const grid=Array.from({length:5},(_,c)=>[0,1,2].map(r=>({id:regular[(c+r*2+2)%8]})));
 if(document.getElementById('anticipation').checked){grid[0][1]={id:'scatter'};grid[1][2]={id:'scatter'};}
 if(document.getElementById('bonus').checked){grid[1][1]={id:'collector'};grid[3][0]={id:'money',valueX:25};grid[4][2]={id:'money',valueX:5};}
 return grid;
}
window.previewAnalog=async()=>{
 const button=document.getElementById('play');button.disabled=true;const bonus=document.getElementById('bonus').checked;document.body.classList.toggle('bonus',bonus);
 window.plannedGrid=finalGrid();document.getElementById('result').textContent='SPINNING · predetermined grid';
 try{const result=await VaultSymbolDrop.play('swamp',{root,reels,finalGrid:plannedGrid,renderCell:cell,decorativeSymbols:regular.map(id=>({id})),roundId:'fixed-preview',feature:bonus,hasWin:false,anticipation:true,speedProfile:document.getElementById('speed').value,reducedMotion:document.getElementById('reduced').checked});
 document.getElementById('result').textContent='ALL REELS SETTLED · '+Math.round(result.elapsed)+' ms | Same target nodes · No instant swap · No financial operations';
 }finally{button.disabled=false;}
};
document.getElementById('play').onclick=previewAnalog;
for(const [hook,label] of [['onReelStart','ACCELERATION'],['onReelFullSpeed','FULL SPEED'],['onReelDecelerate','DECELERATION'],['onReelStop','SETTLED']])VaultAnalogReels.on(hook,e=>{document.getElementById('phases').children[e.reelIndex].textContent=e.anticipation&&hook==='onReelDecelerate'?'ANTICIPATION':label;});
'''.replace('ART',json.dumps(art))
css=style+(root/'slot-animation/presentation.css').read_text()+(root/'slot-animation/analog.css').read_text()
html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VAULT · Swamp Analog Reels</title><style>'+css+'</style>'+body
html+='<script>let currentGame="swamp";</script><script>'+(root/'slot-animation/engine.js').read_text()+'</script><script>'+(root/'slot-animation/analog.js').read_text()+'</script><script>'+script+'</script></html>'
(out/'VAULT_Swamp_Analog_Preview.html').write_text(html)
print(out/'VAULT_Swamp_Analog_Preview.html')
