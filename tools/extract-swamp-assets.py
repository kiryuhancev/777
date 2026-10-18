"""Literal sheet cropping requested by the asset specification; no repainting or alpha replacement."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parent.parent;src=ROOT/'assets/swamp';out=src/'symbols';out.mkdir(exist_ok=True)
names=['fish_01','bait_jar','lantern','bobber','hook','insect','tackle_box','spirit_lantern','catfish','rust_bobber','worm_jar','fish_03']
sheet=Image.open(src/'03_symbols/base_symbols_sheet.webp').convert('RGBA')
def save(im,path):
 # Remove detached snippets from adjacent sheet cells by cropping to the main object.
 alpha=im.getchannel('A');w,h=im.size;pixels=alpha.load();seen=set();largest=[]
 for y in range(h):
  for x in range(w):
   if (x,y) in seen or pixels[x,y]<32:continue
   stack=[(x,y)];seen.add((x,y));part=[]
   while stack:
    px,py=stack.pop();part.append((px,py))
    for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
     if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen and pixels[nx,ny]>=32:seen.add((nx,ny));stack.append((nx,ny))
   if len(part)>len(largest):largest=part
 box=(max(0,min(x for x,y in largest)-8),max(0,min(y for x,y in largest)-8),min(w,max(x for x,y in largest)+9),min(h,max(y for x,y in largest)+9)) if largest else None
 if box:im=im.crop(box)
 im=ImageOps.contain(im,(300,300));im.save(out/path,format='WEBP',quality=92,method=6)
for i,name in enumerate(names):save(sheet.crop(((i%4)*300,(i//4)*300,(i%4+1)*300,(i//4+1)*300)),name+'.webp')
sheet=Image.open(src/'04_money_fish/money_fish_sheet.webp').convert('RGBA')
for i in range(4):save(sheet.crop(((i%2)*600,(i//2)*450,(i%2+1)*600,(i//2+1)*450)),f'money_fish_{i+1}.webp')
for name,p in [('scatter','05_special/scatter.webp'),('collector','05_special/collector_wild_reference.webp')]:save(Image.open(src/p).convert('RGBA'),name+'.webp')
# Lobby art uses environment + one supplied fish, never the assembled slot reference.
bg=Image.open(src/'02_background/swamp_background.webp').convert('RGBA');bg=ImageOps.fit(bg,(960,540));fish=Image.open(out/'money_fish_1.webp');fish=ImageOps.contain(fish,(400,420));bg.alpha_composite(fish,(500,110));bg.convert('RGB').save(src/'lobby_card.webp',quality=90)
thumb=Image.new('RGBA',(1080,600),'#1a2118');draw=ImageDraw.Draw(thumb)
for i,p in enumerate(out.glob('*.webp')):
 im=ImageOps.contain(Image.open(p),(155,155));x=(i%6)*180;y=(i//6)*200;thumb.alpha_composite(im,(x+(180-im.width)//2,y));draw.text((x+8,y+160),p.stem,fill='#f3b55a')
Image.open(src/'01_reference/slot_scene_reference.webp').crop((300,84,900,109)).save(src/'wood_frame_strip.webp',quality=94)
thumb.save(ROOT.parent/'output/swamp-extracted-symbols.png')
print('Extracted',len(list(out.glob('*.webp'))),'alpha WebP sprites')
