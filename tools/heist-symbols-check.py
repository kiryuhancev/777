"""Render the approved HEIST originals through the real auth/HTML fixture.

The showcase replaces DOM images only: it never creates a model outcome, starts
a round, calls crypto RNG or persists a synthetic reel scene. No live DB is used.
"""
from pathlib import Path
import base64
import json

from PIL import Image


fixture = Path(__file__).with_name('heist-browser-check.py')
fixture_ns = {'__file__': str(fixture)}
exec(compile(fixture.read_text().split('\nwith sync_playwright() as p:')[0],
             str(fixture), 'exec'), fixture_ns)
ROOT = fixture_ns['ROOT']
HTML = fixture_ns['HTML']
cloud = fixture_ns['cloud']
fixture_route = fixture_ns['route']
sync_playwright = fixture_ns['sync_playwright']

SYMBOLS = {
    'mask': 'mask', 'gloves': 'tactical_glove',
    'flashlight': 'flashlight', 'tablet': 'hacker_tablet',
    'card': 'access_card', 'bag': 'duffel_bag',
    'cutter': 'laser_cutter', 'override': 'override_module',
    'diamond': 'diamond', 'gold': 'gold_bar',
    'artifact': 'artifact_capsule', 'core': 'vault_core',
    'wild': 'wild_master_key', 'scatter': 'scatter_vault_seal',
    'grand': 'grand_take',
}
OUTPUT = ROOT.parent / 'output'
OUTPUT.mkdir(exist_ok=True)
bounds = {}
for symbol, filename in SYMBOLS.items():
    path = ROOT / 'assets/heist/approved-symbols/isolated_webp' / (filename + '.webp')
    with Image.open(path) as image:
        assert image.size == (512, 512), (symbol, image.size)
        assert image.mode == 'RGBA', (symbol, image.mode)
        bounds[symbol] = image.getchannel('A').getbbox()
        assert bounds[symbol], symbol

errors = []
console_errors = []
checks = []


def route(request):
    name = request.request.url.split('/')[-1]
    if name in ('heist_capabilities', 'swamp_slot_capabilities'):
        return request.fulfill(
            content_type='application/json',
            body=json.dumps({'version': 2, 'purchaseVersion': 1,
                             'boostVersion': 1, 'siteAdminVersion': 1}),
            headers={'Access-Control-Allow-Origin': '*'})
    return fixture_route(request)


def decoded(page):
    page.wait_for_function('''()=>[...document.querySelectorAll(
        '#heistApp .heist-cell img')].every(n=>n.complete&&n.naturalWidth===512)''')


def geometry(page, expected_ids):
    """Map each source alpha bbox through contain + CSS scale and win pulse.

    Checking nontransparent pixels, rather than the deliberately padded 512px
    canvas, catches visible clipping without requiring any source-image crop.
    """
    rows = page.evaluate('''()=>[...document.querySelectorAll(
        '#heistApp .heist-cell img')].map(img=>{
          const style=getComputedStyle(img),rect=img.getBoundingClientRect(),
            cell=img.closest('.heist-cell').getBoundingClientRect(),
            reel=img.closest('.heist-reel').getBoundingClientRect();
          return {id:img.dataset.visualSymbol||img.closest('.heist-cell').classList[1],
            objectFit:style.objectFit,filter:style.filter,scale:style.scale,
            naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
            rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
            cell:{x:cell.x,y:cell.y,width:cell.width,height:cell.height},
            reel:{x:reel.x,y:reel.y,width:reel.width,height:reel.height}};
        })''')
    seen = set()
    for row in rows:
        symbol = row['id']
        assert symbol in SYMBOLS, row
        seen.add(symbol)
        assert row['naturalWidth'] == row['naturalHeight'] == 512, row
        assert row['objectFit'] == 'contain', row
        assert row['filter'] == 'none', row
        assert float(row['scale']) > 0, row
        rect, cell, reel = row['rect'], row['cell'], row['reel']
        side = min(rect['width'], rect['height'])
        source_x = rect['x'] + (rect['width'] - side) / 2
        source_y = rect['y'] + (rect['height'] - side) / 2
        left, top, right, bottom = bounds[symbol]
        alpha = (source_x + left / 512 * side,
                 source_y + top / 512 * side,
                 source_x + right / 512 * side,
                 source_y + bottom / 512 * side)
        center_x = rect['x'] + rect['width'] / 2
        center_y = rect['y'] + rect['height'] / 2
        # Current winner pulse is scale(1.075); the approved art must still fit.
        alpha = (center_x + (alpha[0] - center_x) * 1.075,
                 center_y + (alpha[1] - center_y) * 1.075,
                 center_x + (alpha[2] - center_x) * 1.075,
                 center_y + (alpha[3] - center_y) * 1.075)
        for box in (cell, reel):
            assert alpha[0] >= box['x'] - .5, (symbol, alpha, box)
            assert alpha[1] >= box['y'] - .5, (symbol, alpha, box)
            assert alpha[2] <= box['x'] + box['width'] + .5, (symbol, alpha, box)
            assert alpha[3] <= box['y'] + box['height'] + .5, (symbol, alpha, box)
    assert set(expected_ids) <= seen, (expected_ids, seen)
    return len(rows)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',
                                        args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1080})
    context.route('https://**', lambda request: request.abort())
    context.route('https://vault-test.supabase.co/**', route)
    context.route('http://127.0.0.1:8777/**', lambda request:
                  request.fulfill(content_type='text/html', body=HTML))
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
    page.evaluate('VaultSync.flush()')
    page.wait_for_function('!VaultStorage.inspect().data.queue.length&&!VaultStorage.inspect().conflict')
    page.wait_for_timeout(350)
    decoded(page)
    assert page.locator('.heist-cell').count() == 20
    assert page.locator('#heistApp').is_visible()
    assert page.evaluate('VaultHeist.getCheckpoint()') is None
    baseline = page.evaluate('({balance:state.balance,round:VaultHeist.getCheckpoint()})')

    sources = page.evaluate('ids=>Object.fromEntries(ids.map(id=>[id,VAULT_HEIST_ASSETS[id]]))',
                            list(SYMBOLS))
    for symbol, source in sources.items():
        raw = base64.b64decode(source.split(',', 1)[1])
        path = ROOT / 'assets/heist/approved-symbols/isolated_webp' / (SYMBOLS[symbol] + '.webp')
        assert raw == path.read_bytes(), symbol
    page.evaluate('''async ids=>{await Promise.all(ids.map(async id=>{
        const image=new Image();image.src=VAULT_HEIST_ASSETS[id];await image.decode();
        if(image.naturalWidth!==512||image.naturalHeight!==512)throw Error(id);
    }))}''', list(SYMBOLS))
    checks.append('All 15 original RGBA WebP sources decode at 512x512 and remain byte-identical in the standalone HTML')

    geometry(page, list(SYMBOLS)[:12])
    page.screenshot(path=str(OUTPUT / 'heist-approved-symbols-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(100)
    geometry(page, list(SYMBOLS)[:12])
    page.screenshot(path=str(OUTPUT / 'heist-approved-symbols-mobile.png'), full_page=True)
    checks.append('Actual authenticated starting scene uses the approved symbols on desktop and mobile')

    page.locator('#heistHelpOpen').click()
    page.wait_for_function('''()=>[...document.querySelectorAll(
        '#heistPaytable img')].every(n=>n.complete&&n.naturalWidth===512)''')
    paytable = page.locator('#heistPaytable img').evaluate_all('''images=>images.map(img=>({
        width:img.naturalWidth,height:img.naturalHeight,
        original:img.classList.contains('heist-symbol'),
        fit:getComputedStyle(img).objectFit,filter:getComputedStyle(img).filter
    }))''')
    assert len(paytable) == 13, paytable
    assert all(image == {'width': 512, 'height': 512, 'original': True,
                         'fit': 'contain', 'filter': 'none'} for image in paytable), paytable
    page.locator('#heistHelpClose').click()
    checks.append('Existing paytable opens with all 13 regular/Grand Take original images decoded and using the shared contain renderer without color filters')

    # Only the DOM is touched. This must never enter gameplay or recovery data.
    page.evaluate('''ids=>{
        const labels=['MASK','TACTICAL GLOVE','FLASHLIGHT','HACKER TABLET',
          'ACCESS CARD','DUFFEL BAG','LASER CUTTER','OVERRIDE MODULE','DIAMOND',
          'GOLD BAR','ARTIFACT CAPSULE','VAULT CORE','WILD','SCATTER','GRAND TAKE'];
        const cells=[...document.querySelectorAll('#heistApp .heist-cell')];
        // DOM order is reel-major. Use row-major showcase order for reading.
        for(let i=0;i<cells.length;i++){
          const order=Math.floor(i/4)+i%4*5,id=ids[order%ids.length],cell=cells[i];
          cell.className='heist-cell '+id;cell.replaceChildren();
          const image=document.createElement('img');image.className='heist-symbol';
          image.src=VAULT_HEIST_ASSETS[id];image.alt=labels[order%ids.length];
          image.dataset.visualSymbol=id;image.draggable=false;
          image.style.setProperty('--heist-symbol-scale',VAULT_HEIST_SYMBOL_SCALE[id]);
          cell.append(image);
        }
        document.getElementById('heistMessage').textContent='SYMBOL PREVIEW · VISUAL CHECK ONLY';
    }''', list(SYMBOLS))
    decoded(page)
    for width, height in ((1440, 1080), (1024, 768), (768, 1024), (390, 844), (320, 720)):
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(100)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), width
        assert geometry(page, SYMBOLS) == 20
        if width == 1440:
            page.screenshot(path=str(OUTPUT / 'heist-approved-symbols-all.png'), full_page=True)
    checks.append('All 15 symbols fit five viewport sizes including 320px, including the full 1.075x win pulse; contain preserves proportions and no image filter changes colors')

    assert page.evaluate('''()=>{const ids=[...document.querySelectorAll('[id]')]
        .map(node=>node.id);return new Set(ids).size===ids.length}''')
    assert page.evaluate('({balance:state.balance,round:VaultHeist.getCheckpoint()})') == baseline
    assert not cloud.rounds and not cloud.stats
    assert not any(name in ('apply_heist_checkpoint', 'begin_game_round', 'record_game_round')
                   for _, name, _ in cloud.calls)
    checks.append('Showcase leaves wallet/checkpoint/round history unchanged; no RNG round is created or saved; unique DOM IDs')
    context.close()
    browser.close()

assert not errors, errors
assert not console_errors, console_errors
report = {'mode': 'Chromium + actual standalone HTML/Supabase SDK HTTP fixture; no live DB',
          'passed': checks, 'pageErrors': errors, 'consoleErrors': console_errors,
          'screenshots': ['heist-approved-symbols-desktop.png',
                          'heist-approved-symbols-mobile.png',
                          'heist-approved-symbols-all.png']}
(ROOT / 'reports/heist-approved-symbols-browser.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
