"""Reject a forked offline FS history rather than replaying free actions on another device."""
from pathlib import Path
fixture=Path(__file__).with_name('vault-auth-check.py');ns={'__file__':str(fixture)}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
errors=[];passed=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);offline={'value':False}
 def context(local=False,freeze=True):
  c=browser.new_context();c.route('https://**',lambda r:r.abort())
  def route(r):
   if local and offline['value'] and '/rest/v1/' in r.request.url:return r.abort('internetdisconnected')
   return cloud.route(r)
  c.route('https://vault-test.supabase.co/**',route);c.route('http://127.0.0.1:8777/**',lambda r:r.fulfill(content_type='text/html',body=HTML))
  if freeze:c.add_init_script('const nt=setTimeout;window.setTimeout=(fn,ms,...args)=>nt(fn,(ms===350||ms===80)?100000:ms,...args)')
  return c
 def login(ctx,uid='alice@example.test'):
  pg=ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto('http://127.0.0.1:8777/');pg.wait_for_function('VaultSession.ready');pg.evaluate('email=>VaultAuth.signIn(email,"fixture-password")',uid);pg.evaluate('VaultSwamp.open()');pg.evaluate('state.fastGame=true;state.fastBonus=true');return pg
 def sync(pg):pg.evaluate('VaultSync.flush()');pg.wait_for_function('!VaultStorage.inspect().conflict&&!VaultStorage.inspect().data.queue.length',timeout=20000)
 def play(pg,seed):
  pg.evaluate('''seed=>{const old=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=seed;return a};document.getElementById('swampSpin').click();crypto.getRandomValues=old;}''',seed);pg.wait_for_function('!VaultSwamp.isBusy')
 ctx=context(True);a=login(ctx);seed=a.evaluate("()=>{for(let i=1;i<20000;i++)if(SWAMP_MODEL.resolve(SWAMP_MODEL.generate(false,SWAMP_MODEL.seeded(i))).triggerSpins)return i}")
 play(a,seed);sync(a);other=context();b=login(other);initial=a.evaluate('VaultSwamp.inspect().bonus');offline['value']=True
 play(a,2);play(a,3)
 play(b,4);sync(b);remote_balance=cloud.rows[A]['wallets']['balance'];remote_bonus=dict(cloud.rows[A]['wallets']['recovery']['swampBonus']);remote_rounds=cloud.stats[(A,'swamp')]['rounds_played']
 offline['value']=False;sync(a)
 assert a.evaluate('state.balance')==remote_balance
 assert a.evaluate('VaultSwamp.inspect().bonus')==remote_bonus
 assert cloud.stats[(A,'swamp')]['rounds_played']==remote_rounds
 passed.append('Two stale offline free spins rejected after another device consumes their index; no payout duplication, no stuck sync')
 ctx.close();other.close()
 # Final-spin collector threshold: committed retrigger and next multiplier survive reload.
 fid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';cloud.rows[B]['wallets']['recovery']['swampBonus']={'version':1,'featureId':fid,'bet':20,'remaining':1,'collectors':3,'tier':0,'totalWinX':0,'spinsPlayed':0}
 ctx=context();pg=login(ctx,'bob@example.test');seed=pg.evaluate("()=>{for(let i=1;i<10000;i++)if(SWAMP_MODEL.evaluate(SWAMP_MODEL.generate(true,SWAMP_MODEL.seeded(i))).collectors.length===1)return i}")
 play(pg,seed);sync(pg);bonus=pg.evaluate('VaultSwamp.inspect().bonus');assert bonus['remaining']==10 and bonus['tier']==1 and bonus['collectors']==4
 balance=pg.evaluate('state.balance');rounds=cloud.stats[(B,'swamp')]['rounds_played'];pg.reload();pg.wait_for_function('VaultSession.ready');sync(pg)
 assert pg.evaluate('VaultSwamp.inspect().bonus')==bonus and pg.evaluate('state.balance')==balance
 assert cloud.stats[(B,'swamp')]['rounds_played']==rounds
 passed.append('Fourth Collector on last FS awards +10 and next x2; reload restores both once')
 ctx.close()
 # No timer freezing: automatic FS start without pressing SPIN; leaving pauses playback.
 cloud.rows[B]['wallets']['recovery']['swampBonus']={'version':1,'featureId':fid,'bet':20,'remaining':3,'collectors':0,'tier':0,'totalWinX':0,'spinsPlayed':0}
 ctx=context(freeze=False);pg=login(ctx,'bob@example.test');pg.wait_for_function('VaultSwamp.inspect().bonus?.spinsPlayed>=2',timeout=12000);pg.evaluate('openLobby()');n=pg.evaluate('VaultSwamp.inspect().bonus.spinsPlayed');pg.wait_for_timeout(700);assert pg.evaluate('VaultSwamp.inspect().bonus.spinsPlayed')==n
 passed.append('Free Spins start automatically; leaving for the lobby pauses future spins')
 ctx.close();browser.close()
assert not errors,errors
report={'mode':'Actual browser and SDK with HTTP fixtures','passed':passed,'pageErrors':errors};(ROOT/'reports/swamp-conflicts.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
