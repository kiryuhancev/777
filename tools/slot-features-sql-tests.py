"""Real PostgreSQL prices, once-only debit/payout/stats and legacy round compatibility."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
A='12121212-1212-4212-8212-121212121212'
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-qAt'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
sql((ROOT/'supabase_slot_features.sql').read_text());sql((ROOT/'supabase_slot_features.sql').read_text())
sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{A}','{{\"username\":\"Features\"}}','features@example.test',now()) on conflict(id) do nothing;")
identity=f"set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);"
script="""const M=require('./heist/model.js'),out={};for(const mode of ['legacy','boost','heist','super']){let r;for(let seed=1;seed<100000;seed++){r=M.start({seed,bet:20,roundId:'11111111-1111-4111-8111-111111111111',scatterBoost:mode==='boost',purchaseType:['heist','super'].includes(mode)?mode:null});if(M.active(r))break;}const a=[r];while(M.active(r)){r=M.advance(r,r.status==='STAGE'?'spin':r.stage>=2?'collect':'deeper');a.push(r);}out[mode]=a;}console.log(JSON.stringify(out));"""
paths=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));passed=[]
for i,(mode,path) in enumerate(paths.items()):
 rid=f'{i+10:08d}-aaaa-4111-8111-111111111111';sql(f"delete from public.game_rounds where round_id='{rid}';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';delete from public.game_stats where user_id='{A}' and game_id='vault_heist';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
 cost=path[0].get('cost',20)
 for j,c in enumerate(path):
  c['roundId']=rid;payload=json.dumps(c).replace("'","''");call=f"perform public.apply_heist_checkpoint('{rid}',{j-1},{j},'{payload}');"
  if j==0 and mode!='legacy':
   bad={**c,'cost':1};q=json.dumps(bad);sql(identity+f"do $$begin begin perform public.apply_heist_checkpoint('{rid}',-1,0,'{q}');raise exception 'BAD_COST_ACCEPTED';exception when others then if sqlerrm<>'Invalid Heist cost' then raise;end if;end;end$$;")
  sql(identity+f'do $$begin {call}{call}end$$;')
  if j==0:sql(f"update public.vault_user_access set enabled=false where user_id='{A}';")
  expected=round(1000000-cost+c['payout'],6)
  sql(f"do $$begin if (select balance from public.wallets where user_id='{A}')<>{expected} or (select revision from public.wallets where user_id='{A}')<>{j+1} then raise exception 'Wallet replay or cost mismatch';end if;end$$;")
 sql(f"do $$begin if (select total_wagered from public.game_stats where user_id='{A}' and game_id='vault_heist')<>{cost} or (select rounds_played from public.game_stats where user_id='{A}' and game_id='vault_heist')<>1 then raise exception 'Stats mismatch';end if;end$$;")
 passed.append(mode)
# Paid Swamp Boost costs 30 with base stake 20; wrong cost is rejected before mutation.
sql(f"update public.vault_user_access set enabled=true where user_id='{A}';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';delete from public.game_rounds where round_id='15151515-1515-4515-8515-151515151515';")
metadata=json.dumps({'baseBet':20,'scatterBoost':True,'freeSpin':False})
sql(identity+f"do $$begin begin perform public.begin_game_round('15151515-1515-4515-8515-151515151515','swamp',20,0,'{metadata}','{{}}');raise exception 'BAD_COST_ACCEPTED';exception when others then if sqlerrm<>'Invalid Swamp Scatter Boost cost' then raise;end if;end;end$$;")
sql(identity+f"select public.begin_game_round('15151515-1515-4515-8515-151515151515','swamp',30,0,'{metadata}','{{}}');select public.record_game_round('15151515-1515-4515-8515-151515151515','swamp',30,10,.5,'test','{{}}','settled','{{}}');")
sql(f"do $$begin if (select balance from public.wallets where user_id='{A}')<>999980 then raise exception 'Swamp Boost wrong debit';end if;end$$;")
print('PASS PostgreSQL upgrade twice; '+', '.join(passed)+' paths; idempotent actions/payouts/stats; correct paid costs; underpriced modes rejected; earned continuation after block; Swamp 1.5x debit')
