"""Compare actual normal grid-settled timing against the previously published engine."""
from pathlib import Path
import re,json,subprocess,statistics
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;out=root.parent/'output'
current=(out/'VAULT_Symbol_Drop_Preview.html').read_text();old=subprocess.check_output(['git','show','672dd07:slot-animation/engine.js'],cwd=root).decode()
previous=re.sub(r'<script>[\s\S]*?</script>',lambda m:'<script>'+old+'</script>',current,count=1)
values={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for version,html in [('previous',previous),('current',current)]:
  ctx=b.new_context();ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=html));pg=ctx.new_page();pg.goto('http://127.0.0.1:8777/tempo');pg.evaluate('Promise.all([...document.images].map(i=>i.decode()))');values[version]={}
  for mode in ['classic','premium','impact']:
   pg.select_option('#mode',mode);samples=[]
   for repeat in range(2):samples.append(pg.evaluate('''async()=>{const start=performance.now();await previewPlay();return VaultSymbolDrop.inspect().events.find(e=>e.hook==='onGridSettled'&&e.time>=start).elapsed;}'''))
   values[version][mode]=statistics.median(samples)
  ctx.close()
 b.close()
ratios={mode:values['current'][mode]/values['previous'][mode] for mode in ['classic','premium','impact']}
assert all(1.3<ratio<1.8 for ratio in ratios.values()),(values,ratios)
report={'baseline':'672dd07','gridSettleMs':values,'normalDurationRatios':ratios,'scope':'actual WAAPI timing on fixed15-cell grid, excludes settle pause; not a physical phone benchmark'}
(root/'reports/slot-tempo.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
