"""Build the standalone game for static hosting; no external dependencies."""
from pathlib import Path
import hashlib
import json
import os
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
html = ROOT / 'index.html'
source = html.read_text()
scripts = re.findall(r'<script\b[^>]*>(.*?)</script>', source, re.S | re.I)
if not scripts or '<title>UT Cascade v45' not in source:
    raise SystemExit('Expected the v45 standalone game with embedded JavaScript')
Path('/tmp/football-cascade-release.js').write_text('\n'.join(scripts))
site = ROOT / '_site'
site.mkdir(exist_ok=True)
shutil.copyfile(html, site / 'index.html')
(site / '.nojekyll').touch()
commit = os.environ.get('GITHUB_SHA') or subprocess.check_output(
    ['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
(site / 'version.json').write_text(json.dumps({
    'version': 'v45', 'commit': commit,
    'htmlSha256': hashlib.sha256(html.read_bytes()).hexdigest(),
}, indent=2) + '\n')
print(f'Built {html.stat().st_size} bytes of standalone HTML in {site}')
output = os.environ.get('GITHUB_OUTPUT')
if output:
    with open(output, 'a') as stream:
        stream.write('html_sha256=' + hashlib.sha256(html.read_bytes()).hexdigest() + '\n')
