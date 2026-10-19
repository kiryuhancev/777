"""HEIST scene/controls in real Chromium and the pinned Auth SDK HTTP fixture.

No production calls and no synthetic model outcomes are saved. Screenshots use
the real initial scene or seeded rounds started through the actual SPIN button.
The timer override only pauses the automatic next stage spin for inspection.
"""
from pathlib import Path
import json


helpers = Path(__file__).with_name('heist-symbols-check.py')
namespace = {'__file__': str(helpers)}
exec(compile(helpers.read_text().split('\nwith sync_playwright() as playwright:')[0],
             str(helpers), 'exec'), namespace)
ROOT = namespace['ROOT']
HTML = namespace['HTML']
cloud = namespace['cloud']
route = namespace['fixture_route']  # Original capability version 1 is deliberate.
sync_playwright = namespace['sync_playwright']
geometry = namespace['geometry']
decoded = namespace['decoded']
SYMBOLS = namespace['SYMBOLS']
A = namespace['fixture_ns']['A']
OUTPUT = ROOT.parent / 'output'
OUTPUT.mkdir(exist_ok=True)

errors = []
console_errors = []
checks = []
viewport_results = []
screenshots = []


def settled(page):
    page.wait_for_function('!VaultHeist.isBusy')


def sync(page):
    page.evaluate('VaultSync.flush()')
    page.wait_for_function('!VaultStorage.inspect().data.queue.length && '
                           '!VaultStorage.inspect().conflict', timeout=20000)


def checkpoint(page):
    return page.evaluate('VaultHeist.getCheckpoint()')


def reload(page):
    page.reload()
    page.wait_for_function('VaultSession.ready && VaultHeist.inspect().ready')
    decoded(page)


def play(page, seed=None):
    if seed is None:
        page.locator('#heistSpin').click()
    else:
        # Only inject a test RNG seed; the actual button/model/bridge runs.
        page.evaluate('''seed=>{
            const original=crypto.getRandomValues.bind(crypto);
            crypto.getRandomValues=array=>{array[0]=seed;return array};
            document.getElementById('heistSpin').click();
            crypto.getRandomValues=original;
        }''', seed)


def shot(page, suffix):
    page.evaluate('window.scrollTo(0,0)')
    page.wait_for_function("()=>[...document.querySelectorAll('#heistApp img')]"
                           ".every(img=>img.complete&&img.naturalWidth)")
    name = 'heist-scene-' + suffix + '.png'
    page.screenshot(path=str(OUTPUT / name), full_page=True)
    screenshots.append(name)


def controls_geometry(page):
    """Check real interaction boxes, allowing deliberate mobile page scrolling."""
    page.evaluate('window.scrollTo(0,0)')
    boxes = page.evaluate('''()=>{
        const ids=['heistSettings','heistHelpOpen','heistMinus','heistPlus','heistAuto',
                   'heistMax','heistSpin','heistBuy'];
        return ids.map(id=>{
            const node=document.getElementById(id),r=node.getBoundingClientRect();
            const clipped=[];
            for(let p=node.parentElement;p&&p!==document.body;p=p.parentElement){
                const s=getComputedStyle(p),b=p.getBoundingClientRect();
                if(['hidden','clip'].includes(s.overflowX)&&
                   (r.left<b.left-1||r.right>b.right+1))clipped.push(p.className);
                if(['hidden','clip'].includes(s.overflowY)&&
                   (r.top<b.top-1||r.bottom>b.bottom+1))clipped.push(p.className);
            }
            return {id,x:r.x,y:r.y,width:r.width,height:r.height,clipped};
        });
    }''')
    width = page.viewport_size['width']
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), width
    for box in boxes:
        assert box['width'] >= 24 and box['height'] >= 24, box
        assert box['x'] >= -1 and box['x'] + box['width'] <= width + 1, box
        assert box['y'] >= -1 and not box['clipped'], box
    for i, first in enumerate(boxes):
        for second in boxes[i + 1:]:
            overlap_x = min(first['x'] + first['width'], second['x'] + second['width']) - max(first['x'], second['x'])
            overlap_y = min(first['y'] + first['height'], second['y'] + second['height']) - max(first['y'], second['y'])
            assert overlap_x <= 1 or overlap_y <= 1, (first, second)
    return boxes


def progress(page):
    nodes = page.locator('#heistProgress > div')
    assert nodes.count() == 6
    images = page.locator('#heistProgress img')
    assert images.count() == 6
    assert images.evaluate_all('images=>images.every(i=>i.complete&&i.naturalWidth===512)')
    assert page.locator('#heistProgress .current').count() <= 1


def heading_geometry(page):
    boxes = page.evaluate('''()=>{
        const selectors=['.heist-heading','#heistProgress','.heist-security'];
        const boxes=selectors.map(selector=>{
            const r=document.querySelector('#heistApp '+selector).getBoundingClientRect();
            return {selector,x:r.x,y:r.y,width:r.width,height:r.height};
        });
        const range=document.createRange();
        range.selectNodeContents(document.querySelector('#heistApp h1'));
        const r=range.getBoundingClientRect();
        boxes.push({selector:'title glyphs',x:r.x,y:r.y,width:r.width,height:r.height});
        return boxes;
    }''')
    width = page.viewport_size['width']
    for box in boxes:
        assert box['x'] >= -1 and box['x'] + box['width'] <= width + 1, box
    # The actual text glyphs (including nowrap overflow) must not enter ALARM.
    title, alarm = boxes[-1], boxes[2]
    overlap_x = min(title['x'] + title['width'], alarm['x'] + alarm['width']) - max(title['x'], alarm['x'])
    overlap_y = min(title['y'] + title['height'], alarm['y'] + alarm['height']) - max(title['y'], alarm['y'])
    assert overlap_x <= 1 or overlap_y <= 1, (title, alarm)
    for i, first in enumerate(boxes[:3]):
        for second in boxes[i + 1:3]:
            overlap_x = min(first['x'] + first['width'], second['x'] + second['width']) - max(first['x'], second['x'])
            overlap_y = min(first['y'] + first['height'], second['y'] + second['height']) - max(first['y'], second['y'])
            assert overlap_x <= 1 or overlap_y <= 1, (first, second)
    return boxes


def scene_geometry(page):
    decoded(page)
    assert page.locator('#heistReels .heist-cell').count() == 20
    ids = page.evaluate('''()=>[...document.querySelectorAll('#heistReels .heist-cell')]
        .map(cell=>[...cell.classList].find(name=>VAULT_HEIST_ASSETS[name]))''')
    assert len(ids) == 20 and all(symbol in SYMBOLS for symbol in ids), ids
    assert geometry(page, set(ids)) == 20
    saved = checkpoint(page)
    if saved:
        assert ids == [symbol for reel in saved['outcome']['grid'] for symbol in reel]
    progress(page)
    return ids


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',
                                        args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.route('https://**', lambda request: request.abort())
    context.route('https://vault-test.supabase.co/**', route)
    context.route('http://127.0.0.1:8777/**', lambda request:
                  request.fulfill(content_type='text/html', body=HTML))
    context.add_init_script('''const nativeTimeout=setTimeout;
        window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,
            ms===600?100000:ms,...args);''')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: console_errors.append(message.text)
            if message.type == 'error' else None)
    page.goto('http://127.0.0.1:8777/')
    page.wait_for_function('VaultSession.ready')
    page.evaluate('VaultAuth.signIn("alice@example.test","fixture-password")')
    page.wait_for_function('VaultSession.mode==="authenticated"&&VaultSession.ready')
    page.evaluate('VaultHeist.open()')
    page.wait_for_function('VaultHeist.inspect().ready')
    sync(page)
    assert checkpoint(page) is None
    assert not page.evaluate('VaultHeistBridge.featuresReady')
    assert not page.locator('#heistSpin').is_disabled()

    for width, height in ((1440, 1000), (1600, 1000), (1190, 900), (1024, 768),
                          (768, 1024), (390, 844), (320, 720)):
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(120)
        ids = scene_geometry(page)
        boxes = controls_geometry(page)
        heading = heading_geometry(page)
        viewport_results.append({'width': width, 'height': height,
                                 'cells': len(ids), 'controls': boxes,
                                 'heading': heading})
        if width == 1440:
            shot(page, 'desktop')
        elif width == 390:
            shot(page, 'mobile')
    checks.append('Seven viewports 1440/1600/1190/1024/768/390/320px: 20 real original symbols '
                  'use contain and preserve alpha silhouettes through the 1.075x pulse; '
                  'six progression icons decode; heading/progression/ALARM and controls '
                  'never overlap or clip horizontally')

    page.set_viewport_size({'width': 1440, 'height': 1000})
    index = page.evaluate('VaultHeist.betIndex')
    page.locator('#heistPlus').click()
    assert page.evaluate('VaultHeist.betIndex') == index + 1
    page.locator('#heistMinus').click()
    assert page.evaluate('VaultHeist.betIndex') == index
    page.locator('#heistMax').click()
    assert page.evaluate('VaultHeist.betIndex===BETS.length-1')
    # Restore the user's fixture stake through the same decrement button.
    while page.evaluate('VaultHeist.betIndex') > index:
        page.locator('#heistMinus').click()
    page.locator('#heistSettings').click()
    assert page.locator('#heistSettingsDialog').is_visible()
    fast = page.evaluate('state.fastGame')
    page.locator('#heistFast').click()
    assert page.evaluate('state.fastGame') != fast
    page.locator('#heistFast').click()
    page.locator('#heistSettingsClose').click()
    page.locator('#heistHelpOpen').click()
    assert page.locator('#heistHelp').is_visible()
    assert page.locator('#heistPaytable img').count() == 13
    page.locator('#heistHelpClose').click()
    page.locator('#heistAuto').click()
    assert page.locator('#heistAutoMenu').is_visible()
    assert page.locator('[data-heist-auto]').count() == 5
    page.locator('#heistAuto').click()
    assert page.locator('#heistAutoMenu').is_hidden()
    page.locator('#heistBuy').click()
    assert page.locator('#heistBonusShop').is_visible()
    assert page.locator('[data-heist-buy]').count() == 2
    assert page.locator('[data-heist-buy="heist"]').is_disabled()
    assert page.locator('#heistScatterBoost').is_disabled()
    page.locator('#heistShopClose').click()
    checks.append('Actual Settings/FAST toggle, help/paytable, AUTO count menu, BONUS menu '
                  'and bet +/-/MAX clicks work; capability v1 keeps ordinary play available '
                  'while safely disabling uninstalled purchase/boost features')

    seeds = page.evaluate('''()=>{
        const found={};
        for(let seed=1;seed<10000&&Object.keys(found).length<2;seed++){
            const round=VAULT_HEIST_MODEL.start({seed,bet:20,roundId:crypto.randomUUID()});
            if(round.status==='SETTLED'&&round.baseWinX>0&&round.outcome.wins.length)
                found.base??=seed;
            if(round.status==='STAGE')found.stage??=seed;
        }
        return found;
    }''')
    assert set(seeds) == {'base', 'stage'}, seeds
    before = page.evaluate('state.balance')
    play(page, seeds['base'])
    page.wait_for_selector('#heistWinBanner:not([hidden])')
    assert page.locator('.win-current').count() > 0
    assert 'WAYS' in page.locator('#heistWinBanner').inner_text()
    shot(page, 'winning')
    settled(page)
    sync(page)
    base = checkpoint(page)
    assert base['status'] == 'SETTLED' and base['payout'] > 0
    assert page.evaluate('state.balance') == round(before - base['bet'] + base['payout'], 6)
    scene_geometry(page)
    balance = page.evaluate('state.balance')
    rounds = cloud.stats[(A, 'vault_heist')]['rounds_played']
    reload(page)
    sync(page)
    assert checkpoint(page) == base
    assert page.evaluate('state.balance') == balance
    assert cloud.stats[(A, 'vault_heist')]['rounds_played'] == rounds
    checks.append('Real seeded base SPIN displays winning original symbols/WAYS and amount; '
                  'ordinary round on capability v1 debits/settles once and reload never pays twice')

    page.evaluate('state.fastGame=true;state.fastBonus=true')
    before = page.evaluate('state.balance')
    play(page, seeds['stage'])
    assert checkpoint(page)['status'] == 'STAGE'
    assert page.evaluate('state.balance') == before - checkpoint(page)['bet']
    # The paid triggering scene is committed before the reveal. Reload cancels
    # the visual transition and recovers the earned stable stage unchanged.
    stage = checkpoint(page)
    reload(page)
    sync(page)
    assert checkpoint(page) == stage
    assert page.evaluate('state.balance') == before - stage['bet']
    assert not page.locator('.heist-reel.rolling').count()
    assert page.locator('#heistProgress [aria-current="step"]').count() == 1
    scene_geometry(page)
    shot(page, 'stage')
    paid = page.evaluate('state.balance')
    for _ in range(3):
        play(page)
        settled(page)
        assert page.evaluate('state.balance') == paid
    sync(page)
    choice = checkpoint(page)
    assert choice['status'] == 'CHOICE'
    assert page.locator('#heistChoice').is_visible()
    assert page.locator('#heistCollect').is_visible()
    assert page.locator('#heistDeeper').is_visible()
    shot(page, 'choice')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(120)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for selector in ('#heistCollect', '#heistDeeper'):
        box = page.locator(selector).bounding_box()
        assert box and box['x'] >= -1 and box['x'] + box['width'] <= 391, box
    shot(page, 'choice-mobile')
    reload(page)
    sync(page)
    assert checkpoint(page) == choice
    assert page.locator('#heistChoice').is_visible()
    page.locator('#heistCollect').click()
    settled(page)
    sync(page)
    payout = checkpoint(page)['payout']
    assert page.evaluate('state.balance') == round(paid + payout, 6)
    rounds = cloud.stats[(A, 'vault_heist')]['rounds_played']
    reload(page)
    sync(page)
    assert page.evaluate('state.balance') == round(paid + payout, 6)
    assert cloud.stats[(A, 'vault_heist')]['rounds_played'] == rounds
    checks.append('Actual earned STAGE and CHOICE screenshots; F5 during reveal recovers '
                  'the same earned round with no second debit; all three stage spins free; '
                  'CHOICE survives reload and COLLECT payout/statistics happen once')

    assert page.evaluate('''()=>{
        const ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
        return ids.length===new Set(ids).size;
    }''')
    checks.append('Whole document has unique IDs; screenshots never install a fake scene '
                  'or synthetic checkpoint; external network is blocked except local fixture routes')
    context.close()
    browser.close()

assert not errors, errors
assert not console_errors, console_errors
report = {'mode': 'Chromium + actual standalone HTML/pinned Supabase SDK HTTP fixture; '
                  'capability version 1; no live database',
          'passed': checks, 'viewports': viewport_results,
          'pageErrors': errors, 'consoleErrors': console_errors,
          'screenshots': screenshots}
(ROOT / 'reports/heist-scene-browser.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
