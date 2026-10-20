"""Universal HUD integration with real SDK and owned HTTP fixtures; never live accounts."""
from pathlib import Path
source=Path(__file__).with_name('critter-browser-check.py');ns={'__file__':str(source)}
exec(compile(source.read_text().split('\nwith sync_playwright() as p:')[0],str(source),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
cloud=Cloud();errors=[];passed=[]
for value in list(globals().values()):
 if callable(value) and hasattr(value,'__globals__') and 'cloud' in value.__globals__:value.__globals__['cloud']=cloud
opens={'slot':'openSlotGame()','swamp':'VaultSwamp.open()','vault_heist':'VaultHeist.open()','magnet':'VaultMagnet.open()','critter':'VaultCritter.open()'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1100});ctx.route('https://**',lambda r:r.abort());ctx.route('https://vault-test.supabase.co/**',critter_route);ctx.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8777/');page.wait_for_function('VaultSession.ready');page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")')
 assert page.evaluate('VaultSlotHud.instances.length')==5
 for game,op in opens.items():
  page.evaluate(op);page.wait_for_timeout(350);page.evaluate('VaultSlotHud.refresh()')
  root=page.locator(f'[data-slot-skin="{game}"]').first;hud=root.locator('.slot-bottom-controls')
  order=hud.locator(':scope > [data-control]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.control)')
  expected=['settings','balance','bet-minus','bet','bet-plus','auto','max','spin']+(['bonus'] if game in ['slot','swamp','vault_heist'] else [])
  assert order==expected,(game,order)
  assert root.locator('.slot-status-feature').is_hidden()
  reel=root.locator({'slot':'.derby-stage','swamp':'.swamp-frame','vault_heist':'.heist-frame','magnet':'.magnet-apparatus','critter':'.critter-frame'}[game])
  if reel.count():assert root.locator('.slot-top-status').bounding_box()['y']<reel.bounding_box()['y'],game
  before=page.evaluate(f'VaultSlotHud.getState("{game}").bet');hud.locator('[data-control="bet-plus"]').click();page.wait_for_timeout(160);assert page.evaluate(f'VaultSlotHud.getState("{game}").bet')>before
  hud.locator('[data-control="bet-minus"]').click();page.wait_for_timeout(160);assert page.evaluate(f'VaultSlotHud.getState("{game}").bet')==before
  hud.locator('[data-control="max"]').click();assert page.evaluate(f'VaultSlotHud.getState("{game}").bet')==5000
  hud.locator('[data-control="bet"]').click();dialog=root.locator('.slot-shared-modal');dialog.locator('.slot-modal-body button').filter(has_text=re.compile('^50$')).click();assert page.evaluate(f'VaultSlotHud.getState("{game}").bet')==50
  hud.locator('[data-control="auto"]').click();assert dialog.is_visible();assert dialog.locator('.slot-modal-body button').all_text_contents()==['10','25','50','100','∞'];page.keyboard.press('Escape')
  hud.locator('[data-control="settings"]').click();assert dialog.is_visible();dialog.get_by_role('button',name='Sound ·',exact=False).click();assert page.evaluate('state.sound') is False;dialog.get_by_role('button',name='Sound ·',exact=False).click()
  dialog.get_by_role('button',name='Paytable',exact=True).click();assert dialog.locator('nav button').count()==4;dialog.get_by_role('button',name='RULES',exact=True).click();assert dialog.locator('.slot-modal-body section').inner_text().strip();page.keyboard.press('Escape');assert not dialog.is_visible()
  if game in ['slot','swamp','vault_heist']:
   hud.locator('[data-control="bonus"]').click();page.wait_for_timeout(100)
   if game=='slot':assert page.locator('#bonusShopModal').evaluate('(n)=>n.classList.contains("show")');page.keyboard.press('Escape')
   else:
    shop=page.locator('#swampBonusShop' if game=='swamp' else '#heistBonusShop');assert shop.is_visible();page.keyboard.press('Escape');assert not shop.is_visible()
  for width in [320,390,430,768,1440]:
   page.set_viewport_size({'width':width,'height':1100});page.wait_for_timeout(80)
   dimensions=hud.evaluate('n=>({w:n.clientWidth,s:n.scrollWidth,children:[...n.children].map(c=>({id:c.dataset.control,rect:c.getBoundingClientRect().toJSON()}))})')
   assert dimensions['s']<=dimensions['w']+2,(game,width,dimensions)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(game,width,'overflow')
   rects=[x['rect'] for x in dimensions['children'] if x['rect']['width']]
   for i,a in enumerate(rects):
    for b in rects[i+1:]:assert min(a['right'],b['right'])-max(a['left'],b['left'])<1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<1,(game,width,'overlap')
   if width in [390,1440]:page.screenshot(path=str(ROOT.parent/'output'/f'slot-hud-{game}-{width}.png'),full_page=True)
  passed.append(game+': shared order, real bet controls/quick choice, settings, info tabs, bonus support and responsive geometry')
 # Real running/stop contract and duplicate-click protection on the new game.
 page.evaluate('VaultCritter.open();state.fastGame=true');page.wait_for_timeout(200)
 hud=page.locator('#critterApp .slot-bottom-controls');hud.locator('[data-control="spin"]').click();page.evaluate('document.getElementById("critterSpin").click()');page.wait_for_function('!VaultCritter.isBusy',timeout=45000);page.evaluate('VaultSync.flush()');page.wait_for_function('!VaultStorage.inspect().data.queue.length')
 assert sum(1 for r in cloud.rounds.values() if r['p_game_id']=='critter')==1,cloud.rounds
 hud.locator('[data-control="auto"]').click();page.locator('#critterApp .slot-shared-modal .slot-modal-body button').filter(has_text=re.compile('^10$')).click();page.wait_for_timeout(200);hud.locator('[data-control="auto"]').click();page.wait_for_function('!VaultCritter.isBusy',timeout=45000);page.wait_for_timeout(1200);assert page.evaluate('VaultCritter.inspect().auto')==0
 ids=page.locator('[id]').evaluate_all('nodes=>nodes.map(n=>n.id)');assert len(ids)==len(set(ids))
 page.evaluate('toggleSetting("sound");VaultStorage.flush()');page.reload();page.wait_for_function('VaultSession.ready');assert page.evaluate('state.sound') is False
 assert page.evaluate('VaultSlotHud.getState("critter").bet')==50
 page.evaluate('openPokerGame()');assert page.locator('#pokerApp .slot-bottom-controls').count()==0
 assert not errors,errors
 passed.append('Shared wallet; single round after double click; AUTO stops future rounds; no duplicate IDs or JS errors; Poker untouched')
 ctx.close();browser.close()
print('\n'.join('PASS '+s for s in passed))
(ROOT/'reports/slot-hud.json').write_text(json.dumps({'mode':'real SDK + HTTP fixtures, not live backend','passed':passed,'pageErrors':errors},indent=2)+'\n')
