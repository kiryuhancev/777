"""Byte-level image extraction equivalence and generated-bundle integrity."""
from pathlib import Path
import subprocess,re,hashlib,base64,json,os
ROOT=Path(__file__).resolve().parent.parent
subprocess.run(['python','tools/build-site.py'],cwd=ROOT,check=True)
source=(ROOT/'index.html').read_text();site=ROOT/'_site';built=(site/'index.html').read_text();uris={}
def normalized_image(m):
 mime,data=m.groups();payload=base64.b64decode(data,validate=True);digest=hashlib.sha256(payload).hexdigest();ext={'png':'png','jpeg':'jpg','webp':'webp','gif':'gif','avif':'avif','svg+xml':'svg'}.get(mime)
 if not ext:return m[0]
 relative=f'assets/embedded/{digest}.{ext}';assert (site/relative).read_bytes()==payload;uris[relative]=m[0];return relative
expected=re.sub(r'data:image/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)',normalized_image,source)
assert built==expected,'Non-image program/markup changed during extraction'
assert 'data:application/javascript;base64,' in built,'UMD SDK contract changed'
assert hashlib.sha256((site/'index.html').read_bytes()).hexdigest()==json.loads((site/'version.json').read_text())['htmlSha256']
assert len(set(re.findall(r'assets/embedded/[a-f0-9]{64}\.\w+',built)))==len(uris)
# Embedding must be idempotent and fail without touching the last good source.
hash_before=hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest();script=(ROOT/'tools/embed-vault.py').read_text();failure=script.replace('temporary=p.with_suffix',"raise RuntimeError('intentional precommit failure')\ntemporary=p.with_suffix")
try:exec(compile(failure,'failed-embed','exec'),{'__file__':str(ROOT/'tools/embed-vault.py')});raise AssertionError('Failure injection missed')
except RuntimeError as e:assert str(e)=='intentional precommit failure'
assert hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest()==hash_before
# Runtime/model/math modules not in scope must remain byte-identical to published release.
protected=subprocess.check_output(['git','ls-tree','-r','--name-only','3a7185c'],cwd=ROOT,text=True).splitlines();protected=[p for p in protected if p.startswith(('bird/','critter/','heist/','magnet/','mines/','tables/','poker/','assets/','slot-animation/')) or p.endswith(('.sql','.txt'))]
protected.remove('bird/game.js')
for p in protected:assert subprocess.check_output(['git','show','3a7185c:'+p],cwd=ROOT)==(ROOT/p).read_bytes(),p
old_runtime=subprocess.check_output(['git','show','3a7185c:vault/runtime.js'],cwd=ROOT,text=True)
def mask_profile_update(s):return s[:s.index('    async update({username,avatar_url=null})')]+s[s.index('  function applyRemote'):]
current_runtime=(ROOT/'vault/runtime.js').read_text()
current_runtime=current_runtime.replace("if(uid===owner&&epoch===identityEpoch)status(","status(")
current_runtime=current_runtime.replace("    if(VaultSession.ready&&uid===owner){\n      const epoch=identityEpoch;", "    if(VaultSession.ready&&uid===owner){")
current_runtime=current_runtime.replace("if(owner!==uid||identityEpoch!==epoch)return;VaultSession.profile=remote.profile;", "VaultSession.profile=remote.profile;")
current_runtime=current_runtime.replace("catch(e){if(owner!==uid||identityEpoch!==epoch)return;console.error('VAULT reconnect pending',e);", "catch(e){console.error('VAULT reconnect pending',e);")
current_runtime=current_runtime.replace("        }catch(e){\n          if(owner!==uid||identityEpoch!==epoch)return;\n          console.error('VAULT sync failed',e);", "        }catch(e){\n          console.error('VAULT sync failed',e);")
assert mask_profile_update(old_runtime)==mask_profile_update(current_runtime),'Wallet/settlement/auth changed outside the explicit owner/epoch guards'
assert subprocess.check_output(['git','show','3a7185c:admin/service.js'],cwd=ROOT)==(ROOT/'admin/service.js').read_bytes()
assert subprocess.check_output(['git','show','3a7185c:slot-hud/hud.css'],cwd=ROOT)==(ROOT/'slot-hud/hud.css').read_bytes()
def embedded_unchanged(s):
 s=re.sub(r'<!-- BEGIN (VAULT RUNTIME|SLOT HUD MODULE|ADMIN MODULE) -->[\s\S]*?<!-- END \1 -->','',s)
 return re.sub(r'// BEGIN BIRD GAME V2[\s\S]*?// END BIRD GAME V2','',s)
assert embedded_unchanged(subprocess.check_output(['git','show','3a7185c:index.html'],cwd=ROOT,text=True))==embedded_unchanged(source),'Unrelated standalone games/markup changed'
old_bird=subprocess.check_output(['git','show','3a7185c:bird/game.js'],cwd=ROOT,text=True)
new_bird=(ROOT/'bird/game.js').read_text();assert old_bird.split('let birdAnimLast=')[0]==new_bird.split('let birdAnimLast=')[0];assert old_bird.split('function birdLoop(now){')[1].split('  requestAnimationFrame(birdLoop);')[0]==new_bird.split('function birdLoop(now){\n  birdFrame=null;')[1].split("  if(document.body.classList.contains('bird-active')&&!document.hidden)birdFrame=requestAnimationFrame(birdLoop);")[0], 'Bird physics/render loop body changed'
report={'sourceHtmlBytes':len(source.encode()),'webHtmlBytes':len(built.encode()),'uniqueImageBytes':sum((site/p).stat().st_size for p in uris),'uniqueImages':len(uris),'protectedFiles':len(protected),'checks':['Every extracted image byte-identical; all non-image code/markup byte-identical','UMD SDK data URL retained; published verifier hashes generated HTML','Interrupted embedding leaves last good standalone source intact','All other game controllers/math/art/SQL and animation engines unchanged; Bird active loop body byte-identical, only scheduling changes']};(ROOT/'reports/review-build.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
