"""Owned, idempotent MAGNET checkpoint transactions in isolated PostgreSQL only."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
def sql(text):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
before=sql("select pg_get_functiondef('public.apply_heist_checkpoint(uuid,integer,bigint,jsonb)'::regprocedure)||pg_get_functiondef('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)'::regprocedure);")
for i in range(2):sql((ROOT/'supabase_magnet.sql').read_text())
assert before==sql("select pg_get_functiondef('public.apply_heist_checkpoint(uuid,integer,bigint,jsonb)'::regprocedure)||pg_get_functiondef('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)'::regprocedure);")
A='17171717-1717-4717-8717-171717171717';B='18181818-1818-4818-8818-181818181818'
for uid in (A,B):sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"Magnet\"}}','{uid}@example.test',now()) on conflict(id) do nothing;")
def auth(uid):return f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);"
script="""const M=require('./magnet/model.js'),out={};for(let seed=0;Object.keys(out).length<2&&seed<10000;seed++){let r=M.start({seed,bet:20,roundId:'11111111-1111-4111-8111-111111111111'});const key=M.active(r)?'overdrive':'base';if(!out[key]){const a=[r];while(M.active(r)){r=M.advance(r);a.push(r)}out[key]=a}}console.log(JSON.stringify(out));"""
paths=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));checks=[]
for index,(kind,path) in enumerate(paths.items()):
 rid=f'2222222{index}-aaaa-4111-8111-111111111111'
 sql(f"delete from public.game_rounds where user_id='{A}' and game_id='magnet';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';delete from public.game_stats where user_id='{A}' and game_id='magnet';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
 for step,c in enumerate(path):
  c['roundId']=rid;payload=json.dumps(c).replace("'","''");call=f"select public.apply_magnet_checkpoint('{rid}',{step-1},{step},'{payload}'::jsonb);"
  sql(auth(A)+call);sql(auth(A)+call)
  expected=round(1000000-20+(c['payout'] if c['status']=='SETTLED' else 0),6)
  sql(f"do $$begin if (select balance from public.wallets where user_id='{A}')<>{expected} or (select revision from public.wallets where user_id='{A}')<>{step+1} then raise exception 'Duplicate wallet transaction';end if;end$$;")
  stored=sql(f"select recovery->'magnetRound' from public.wallets where user_id='{A}';").strip();assert json.loads(stored)==c
  if kind=='overdrive' and step==0:sql(f"update public.vault_user_access set enabled=false where user_id='{A}';")
 sql(f"do $$begin if (select rounds_played from public.game_stats where user_id='{A}' and game_id='magnet')<>1 or (select total_wagered from public.game_stats where user_id='{A}' and game_id='magnet')<>20 then raise exception 'Duplicate stats';end if;end$$;")
 sql(auth(B)+f"do $$begin if exists(select 1 from public.vault_magnet_events where round_id='{rid}') then raise exception 'RLS leaked';end if;begin perform public.apply_magnet_checkpoint('{rid}',{step-1},{step},'{payload}');raise exception 'WRONG_OWNER_ACCEPTED';exception when others then if sqlerrm='WRONG_OWNER_ACCEPTED' then raise;end if;end;end$$;")
 checks.append(kind+': full stable path, every request duplicated, exact checkpoint restore, one wager/payout/statistics, RLS isolation')
c=paths['base'][0];c['roundId']='33333333-aaaa-4111-8111-111111111111';c['payout']+=1;payload=json.dumps(c)
sql(auth(A)+f"do $$begin begin perform public.apply_magnet_checkpoint('{c['roundId']}',-1,0,'{payload}');raise exception 'BAD_PAYOUT_ACCEPTED';exception when others then if sqlerrm<>'Invalid MAGNET settlement' then raise;end if;end;end$$;")
checks.append('Bad payout rejected; blocked account can finish earned Overdrive; migration repeat-safe; existing Heist/begin RPC definitions unchanged')
(ROOT/'reports/magnet-sql.json').write_text(json.dumps({'mode':'Isolated PostgreSQL, not production','passed':checks},indent=2)+'\n')
print('\n'.join('PASS '+c for c in checks))
