"""Real isolated PostgreSQL: v2 settlement and v1 compatibility, never production."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
def sql(text):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
sql((ROOT/'supabase_magnet.sql').read_text())
protected="select pg_get_functiondef('public.apply_magnet_checkpoint(uuid,integer,bigint,jsonb)'::regprocedure)||pg_get_functiondef('public.apply_heist_checkpoint(uuid,integer,bigint,jsonb)'::regprocedure)||pg_get_functiondef('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)'::regprocedure);"
before=sql(protected)
for i in range(2):sql((ROOT/'supabase_magnet_v2.sql').read_text())
assert before==sql(protected)
A='71717171-7171-4717-8717-171717171717';B='81818181-8181-4818-8818-181818181818'
for uid in [A,B]:sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"MagnetV2\"}}','{uid}@example.test',now()) on conflict(id) do nothing;")
def auth(uid):return f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);"
script="""const M=require('./magnet/features-model.js'),out={};for(let seed=0;Object.keys(out).length<3&&seed<10000;seed++){let r=M.start({seed,bet:20,roundId:'11111111-1111-4111-8111-111111111111'}),key=M.active(r)?'chamber':r.magneticPlan.wheel?'wheel':'base';if(!out[key]){const a=[r];while(M.active(r)){r=M.advance(r);a.push(r)}out[key]=a}}console.log(JSON.stringify(out))"""
paths=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));checks=[]
for index,(kind,path) in enumerate(paths.items()):
 rid=f'7777777{index}-aaaa-4111-8111-111111111111'
 sql(f"delete from public.game_rounds where user_id='{A}' and game_id='magnet';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';delete from public.game_stats where user_id='{A}' and game_id='magnet';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
 for step,c in enumerate(path):
  c['roundId']=rid;payload=json.dumps(c).replace("'","''");call=f"select public.apply_magnet_v2_checkpoint('{rid}',{step-1},{step},'{payload}'::jsonb);"
  sql(auth(A)+call);sql(auth(A)+call)
  expected=round(1000000-20+c['payout'],6)
  assert float(sql(f"select balance from public.wallets where user_id='{A}';").strip())==expected
  assert int(sql(f"select revision from public.wallets where user_id='{A}';").strip())==step+1
  assert json.loads(sql(f"select recovery->'magnetRound' from public.wallets where user_id='{A}';"))==c
  if kind=='chamber' and step==0:sql(f"update public.vault_user_access set enabled=false where user_id='{A}';")
 assert int(sql(f"select rounds_played from public.game_stats where user_id='{A}' and game_id='magnet';").strip())==1
 sql(auth(B)+f"do $$begin if exists(select 1 from public.vault_magnet_events where round_id='{rid}') then raise exception 'RLS leaked';end if;begin perform public.apply_magnet_v2_checkpoint('{rid}',{step-1},{step},'{payload}');raise exception 'WRONG_OWNER_ACCEPTED';exception when others then if sqlerrm='WRONG_OWNER_ACCEPTED' then raise;end if;end;end$$;")
 checks.append(kind+': one wager/payout/statistics; every request duplicated; exact cross-device checkpoint; own-row RLS')
c=paths['base'][0];c['roundId']='99999999-aaaa-4111-8111-111111111111';c['payout']+=1;payload=json.dumps(c)
sql(auth(A)+f"do $$begin begin perform public.apply_magnet_v2_checkpoint('{c['roundId']}',-1,0,'{payload}');raise exception 'BAD_ACCEPTED';exception when others then if sqlerrm<>'Invalid MAGNET v2 settlement' then raise;end if;end;end$$;")
checks.append('Altered payout rejected; blocked user finishes earned bonus; repeat-safe migration; legacy MAGNET/Heist/common begin RPC unchanged')
(ROOT/'reports/magnet-v2-sql.json').write_text(json.dumps({'mode':'isolated PostgreSQL only','passed':checks},indent=2)+'\n')
print('\n'.join('PASS '+s for s in checks))
