"""Atomic whole-round Critter settlement in isolated PostgreSQL; never live DB."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
def sql(text):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
protected="select pg_get_functiondef('public.apply_magnet_v2_checkpoint(uuid,integer,bigint,jsonb)'::regprocedure)||pg_get_functiondef('public.apply_heist_checkpoint(uuid,integer,bigint,jsonb)'::regprocedure)||pg_get_functiondef('public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb)'::regprocedure);"
before=sql(protected)
for i in range(2):sql((ROOT/'supabase_critter.txt').read_text())
assert before==sql(protected)
A='91919191-9191-4919-8919-191919191919';B='92929292-9292-4929-8929-292929292929'
for uid in [A,B]:sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"Critter\"}}','{uid}@example.test',now()) on conflict(id) do nothing;")
def auth(uid):return f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);"
script="""const M=require('./critter/model.js'),out={};for(let s=0;Object.keys(out).length<4&&s<20000;s++){const r=M.start({seed:s,bet:20,roundId:'11111111-1111-4111-8111-111111111111'});if(r.bonus)out.bonus??=r;else if(r.base.steps.some(s=>s.moves.length))out.running??=r;else if(r.base.steps.length)out.win??=r;else out.loss??=r;}console.log(JSON.stringify(out))"""
paths=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));checks=[]
for idx,(kind,c) in enumerate(paths.items()):
 rid=f'9191919{idx}-aaaa-4111-8111-111111111111';c['roundId']=rid;payload=json.dumps(c).replace("'","''")
 sql(f"delete from public.game_rounds where user_id='{A}' and game_id='critter';delete from public.game_stats where user_id='{A}' and game_id='critter';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
 call=f"select public.settle_critter_round('{rid}',0,'{payload}');";sql(auth(A)+call);sql(auth(A)+call)
 assert float(sql(f"select balance from public.wallets where user_id='{A}';").strip())==round(1000000-20+c['payout'],6)
 assert int(sql(f"select revision from public.wallets where user_id='{A}';").strip())==1
 assert int(sql(f"select rounds_played from public.game_stats where user_id='{A}' and game_id='critter';").strip())==1
 assert json.loads(sql(f"select recovery->'critterRound' from public.wallets where user_id='{A}';"))==c
 sql(auth(B)+f"do $$begin if exists(select 1 from public.game_rounds where round_id='{rid}') then raise exception 'RLS leak';end if;begin perform public.settle_critter_round('{rid}',0,'{payload}');raise exception 'FOREIGN_ACCEPTED';exception when others then if sqlerrm='FOREIGN_ACCEPTED' then raise;end if;end;end$$;")
 checks.append(kind+': bet+all cascades+bonus settle atomically, duplicate idempotency, exact checkpoint, one stats row, own-user RLS')
c=paths['loss'];c['roundId']='93939393-aaaa-4111-8111-111111111111';c['payout']+=1;payload=json.dumps(c)
sql(auth(A)+f"do $$begin begin perform public.settle_critter_round('{c['roundId']}',1,'{payload}');raise exception 'BAD_ACCEPTED';exception when others then if sqlerrm<>'Invalid Critter settlement' then raise;end if;end;end$$;")
c['payout']-=1;payload=json.dumps(c);sql(f"update public.vault_user_access set enabled=false where user_id='{A}';")
sql(auth(A)+f"do $$begin begin perform public.settle_critter_round('{c['roundId']}',1,'{payload}');raise exception 'BLOCK_ACCEPTED';exception when others then if sqlerrm<>'VAULT_ACCOUNT_DISABLED' then raise;end if;end;end$$;")
checks.append('Altered payout and blocked new bet rejected; migration repeat-safe; existing MAGNET/Heist/begin RPC byte-identical')
(ROOT/'reports/critter-sql.json').write_text(json.dumps({'mode':'isolated PostgreSQL only','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+s for s in checks))
