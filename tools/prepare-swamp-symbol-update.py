"""Prepare user-requested cropped reel/progress versions; approved PNG originals stay intact."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
A=ROOT/'assets/swamp/updated_symbols'
source=Image.open(A/'collector_fisherman_updated.png').convert('RGBA')
# Compose original character/lantern-net detail above the original COLLECTOR plaque.
# These are literal source crops, with no painted replacement character or typography.
reel=Image.new('RGBA',(400,400))
body=source.crop((235,20,1020,760));body.thumbnail((355,335),Image.Resampling.LANCZOS)
reel.alpha_composite(body,(0,0))
net=source.crop((925,180,1235,740));net.thumbnail((145,255),Image.Resampling.LANCZOS)
reel.alpha_composite(net,(255,28))
plaque=source.crop((65,710,1215,1060));plaque.thumbnail((398,122),Image.Resampling.LANCZOS)
reel.alpha_composite(plaque,((400-plaque.width)//2,278))
reel.save(A/'collector_fisherman_reel.webp',quality=95,method=6)
progress=source.crop((320,22,885,645));progress.thumbnail((150,166),Image.Resampling.LANCZOS)
progress.save(A/'collector_progress_icon.webp',quality=95,method=6)
contact=Image.new('RGB',(720,440),(20,36,29))
for im,pos in [(reel,(10,15)),(progress,(460,15))]:contact.paste(im,pos,im)
contact.save('/tmp/swamp-collector-crops.png')
# Optional transparent Scatter exported by the image editor (the supplied source is RGB).
# python tools/prepare-swamp-symbol-update.py /path/to/transparent-scatter.png
import sys
if len(sys.argv)>1:
    scatter=Image.open(sys.argv[1]).convert('RGBA')
    if scatter.getchannel('A').getextrema()[0]!=0:
        raise ValueError('Scatter must have true transparent exterior pixels')
    scatter.thumbnail((400,400),Image.Resampling.LANCZOS)
    scatter.save(A/'scatter_fish_reel.webp',quality=95,method=6)
