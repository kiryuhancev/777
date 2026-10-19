"""Technical extraction of generated isolated sprite sheet. Input art is kept in assets/heist/sources."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent;a=root/'assets/heist';(a/'symbols').mkdir(exist_ok=True);(a/'sources').mkdir(exist_ok=True)
source=Image.open(a/'sources/symbols.png').convert('RGBA');w,h=source.size
names=['mask','gloves','flashlight','card','tablet','bag','cutter','override','gold','diamond','artifact','core','wild','scatter','grand','alarm']
for i,name in enumerate(names):
 c,r=i%4,i//4;im=source.crop((round(c*w/4),round(r*h/4),round((c+1)*w/4),round((r+1)*h/4)));# Keep the dominant object, excluding small pieces crossing a sheet-cell boundary.
 alpha=im.getchannel('A');pix=alpha.load();seen=set();largest=[]
 for y in range(im.height):
  for x in range(im.width):
   if (x,y) in seen or pix[x,y]<40:continue
   stack=[(x,y)];seen.add((x,y));component=[]
   while stack:
    px,py=stack.pop();component.append((px,py))
    for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
     if 0<=nx<im.width and 0<=ny<im.height and (nx,ny) not in seen and pix[nx,ny]>=40:seen.add((nx,ny));stack.append((nx,ny))
   if len(component)>len(largest):largest=component
 bbox=(max(0,min(x for x,y in largest)-3),max(0,min(y for x,y in largest)-3),min(im.width,max(x for x,y in largest)+4),min(im.height,max(y for x,y in largest)+4)) if largest else None
 if bbox:im=im.crop(bbox)
 im.thumbnail((256,256),Image.Resampling.LANCZOS);canvas=Image.new('RGBA',(280,280));canvas.alpha_composite(im,((280-im.width)//2,(280-im.height)//2));canvas.save(a/'symbols'/f'{name}.webp',quality=94,method=6)
