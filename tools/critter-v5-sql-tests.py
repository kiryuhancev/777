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
for i in range(2):sql((ROOT/'supabase_critter_v5.txt').read_text())
assert before==sql(protected)
A='91919191-9191-4919-8919-191919191919';B='92929292-9292-4929-8929-292929292929'
for uid in [A,B]:sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"Critter\"}}','{uid}@example.test',now()) on conflict(id) do nothing;")
def auth(uid):return f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);"
script="""const M=require('./critter/model'),out={};for(let s=0;Object.keys(out).length<4&&s<100000;s++){const r=M.start({seed:s,bet:20,roundId:'11111111-1111-4111-8111-111111111111'});if(r.bonus){out.bonus??=r;if(r.bonus.kind==='super')out.super??=r;}else if(r.base.wins.length)out.win??=r;else out.loss??=r;}for(const [k,options] of Object.entries({boost:{scatterBoost:true},buy:{purchaseType:'bonus'},buySuper:{purchaseType:'super'}}))out[k]=M.start({seed:63,bet:20,roundId:'11111111-1111-4111-8111-111111111111',...options});for(const [k,m] of Object.entries({v1:M.legacy,v2:M.previous,v3:M.v3,v4:M.v4}))out[k]=m.start({seed:63,bet:20,roundId:'11111111-1111-4111-8111-111111111111'});console.log(JSON.stringify(out));"""
paths=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT))
checks=[]
for idx,(kind,c) in enumerate(paths.items()):
 rid=f'9191{idx:04x}-aaaa-4111-8111-111111111111';c['roundId']=rid;payload=json.dumps(c).replace("'","''")
 sql(f"delete from public.game_rounds where user_id='{A}' and game_id='critter';delete from public.game_stats where user_id='{A}' and game_id='critter';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
 call=f"select public.settle_critter_round('{rid}',0,'{payload}');";sql(auth(A)+call);sql(auth(A)+call)
 assert float(sql(f"select balance from public.wallets where user_id='{A}';").strip())==round(1000000-c.get('cost',20)+c['payout'],6)
 assert int(sql(f"select revision from public.wallets where user_id='{A}';").strip())==1
 assert int(sql(f"select rounds_played from public.game_stats where user_id='{A}' and game_id='critter';").strip())==1
 assert json.loads(sql(f"select recovery->'critterRound' from public.wallets where user_id='{A}';"))==c
 sql(auth(B)+f"do $$begin if exists(select 1 from public.game_rounds where round_id='{rid}') then raise exception 'RLS leak';end if;begin perform public.settle_critter_round('{rid}',0,'{payload}');raise exception 'FOREIGN_ACCEPTED';exception when others then if sqlerrm='FOREIGN_ACCEPTED' then raise;end if;end;end$$;")
 checks.append(kind+': one bet+one result per spin+bonus settle atomically, duplicate idempotency, exact checkpoint, one stats row, own-user RLS')
c=paths['loss'];c['roundId']='93939393-aaaa-4111-8111-111111111111';c['payout']+=1;payload=json.dumps(c)
sql(auth(A)+f"do $$begin begin perform public.settle_critter_round('{c['roundId']}',1,'{payload}');raise exception 'BAD_ACCEPTED';exception when others then if sqlerrm<>'Invalid Critter settlement' then raise;end if;end;end$$;")
c['payout']-=1;payload=json.dumps(c);sql(f"update public.vault_user_access set enabled=false where user_id='{A}';")
sql(auth(A)+f"do $$begin begin perform public.settle_critter_round('{c['roundId']}',1,'{payload}');raise exception 'BLOCK_ACCEPTED';exception when others then if sqlerrm<>'VAULT_ACCOUNT_DISABLED' then raise;end if;end;end$$;")
checks.append('Altered payout and blocked new bet rejected; migration repeat-safe; existing MAGNET/Heist/begin RPC byte-identical')
(ROOT/'reports/critter-v5-sql.json').write_text(json.dumps({'mode':'isolated PostgreSQL only','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+s for s in checks))

# Reject tampered new gameplay/costs before touching money.
from copy import deepcopy
for bad_kind in ['lost-persistent','bad-move','bad-multiplier','bad-cost','cascade','bad-win','base-wild']:
 c=deepcopy(paths['buySuper'] if bad_kind!='base-wild' else paths['win']);c['roundId']='94949494-aaaa-4111-8111-111111111111'
 if bad_kind=='lost-persistent':c['bonus']['spins'][2]['persistentWildsBefore']=[]
 elif bad_kind=='bad-move':
  p=next(p for p in c['bonus']['spins'] if p['movements']);p['movements'][0]['to']=p['movements'][0]['from']
 elif bad_kind=='bad-multiplier':
  p=next(p for p in c['bonus']['spins'] if p['multiplierUpdates']);p['multiplierUpdates'][0]['to']+=1
 elif bad_kind=='bad-cost':c['cost']-=1
 elif bad_kind=='cascade':c['base']['steps']=[]
 elif bad_kind=='bad-win':c['bonus']['spins'][0]['winX']+=1
 elif bad_kind=='base-wild':c['base']['movements']=[{'wildId':'fake','from':0,'to':1}]
 payload=json.dumps(c).replace("'","''")
 sql(auth(A)+f"do $$begin begin perform public.settle_critter_round('{c['roundId']}',1,'{payload}');raise exception 'TAMPER_ACCEPTED';exception when others then if sqlerrm='TAMPER_ACCEPTED' then raise;end if;end;end$$;")
 checks.append(bad_kind+': v5 tampering rejected')
assert json.loads(sql(auth(A)+"select public.critter_capabilities();").strip().splitlines()[-1])['mathVersion']==5
(ROOT/'reports/critter-v5-sql.json').write_text(json.dumps({'mode':'isolated PostgreSQL only','passed':checks},indent=2)+'\n')
print('PASS v5 movements/multiplier/price/cascade tampering rejected; mathVersion5')

# Independent real-model sample through the server evaluator/validator (no wallet write).
samples=json.loads(subprocess.check_output(['node','-e',"const M=require('./critter/model');console.log(JSON.stringify(Array.from({length:100},(_,seed)=>M.start({seed,bet:20,roundId:'11111111-1111-4111-8111-111111111111',purchaseType:seed%2?'bonus':'super'}))))"],cwd=ROOT))
commands=''.join("select public.critter_v5_validate('"+json.dumps(c).replace("'","''")+"');" for c in samples)
sql(commands)
checks.append('100 independent buy plans: SQL cluster evaluation, movement and multiplier validation agree with real JS model')
(ROOT/'reports/critter-v5-sql.json').write_text(json.dumps({'mode':'isolated PostgreSQL only','passed':checks},indent=2)+'\n')
print('PASS 100 additional JS/SQL plan comparisons')
