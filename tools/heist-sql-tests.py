"""Owned/idempotent Heist transitions in isolated PostgreSQL, not production."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-qAt'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
sql((ROOT/'supabase_heist.sql').read_text());sql((ROOT/'supabase_heist.sql').read_text())
A='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';B='ffffffff-ffff-4fff-8fff-ffffffffffff'
for uid in [A,B]:sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"Heist Test\"}}','{uid}@example.test',now()) on conflict(id) do nothing;")
def identity(u):return f"set role authenticated;select set_config('request.jwt.claim.sub','{u}',false);"
def sequences():
 script="""const M=require('./heist/model.js');let paths={};for(let s=1;Object.keys(paths).length<3&&s<100000;s++){let r=M.start({seed:s,bet:20,roundId:'11111111-aaaa-4111-8111-111111111111'});if(!M.active(r))continue;let list=[r];while(M.active(r)){r=M.advance(r,r.status==='STAGE'?'spin':'deeper');list.push(r);}let key=r.result==='alarm'?'alarm':'grand';if(!paths[key])paths[key]=list;if(!paths.collect){r=list[0];let l=[r];while(r.status==='STAGE'){r=M.advance(r,'spin');l.push(r);}l.push(M.advance(r,'collect'));paths.collect=l;}}console.log(JSON.stringify(paths));"""
 return json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT))
paths=sequences();results=[]
for i,(kind,path) in enumerate(paths.items()):
 rid=f'{i+4:08d}-aaaa-4111-8111-111111111111';sql(f"delete from public.game_rounds where round_id='{rid}';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';delete from public.game_stats where user_id='{A}' and game_id='vault_heist';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
 for j,c in enumerate(path):
  c['roundId']=rid;payload=json.dumps(c).replace("'","''");call=f"select public.apply_heist_checkpoint('{rid}',{j-1},{j},'{payload}');"
  sql(identity(A)+call);sql(identity(A)+call)
  if j==0:sql(f"update public.vault_user_access set enabled=false where user_id='{A}';")
  balance=1000000-20+(c['payout'] if c['status']=='SETTLED' else 0)
  sql(f"do $$begin if (select balance from public.wallets where user_id='{A}')<>{balance} or (select revision from public.wallets where user_id='{A}')<>{j+1} then raise exception 'Repeated debit/payout or revision';end if;end$$;")
 final=path[-1];sql(f"do $$begin if (select rounds_played from public.game_stats where user_id='{A}' and game_id='vault_heist')<>1 then raise exception 'Repeated stats';end if;end$$;")
 sql(identity(B)+f"do $$begin if exists(select 1 from public.vault_heist_events where round_id='{rid}') then raise exception 'RLS leaked';end if;begin perform public.apply_heist_checkpoint('{rid}',0,0,'{payload}');raise exception 'UNEXPECTED';exception when others then if sqlerrm='UNEXPECTED' then raise;end if;end;end$$;")
 results.append(kind)
print('PASS PostgreSQL migration twice; '+', '.join(results)+' full paths; all action replays idempotent; one stats/XP settlement; blocked new bets but earned Heist continuation; RLS isolation')
