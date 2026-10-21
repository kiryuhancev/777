"""Actual PostgreSQL escrow and idempotency checks. Isolated local DB only."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parents[1]
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout.strip()
for _ in range(2):sql((ROOT/'supabase_bonus_sessions.sql').read_text())
A='83838383-8383-4383-8383-838383838383';B='84848484-8484-4484-8484-848484848484'
for uid in [A,B]:sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{uid}','{{\"username\":\"Escrow\"}}','{uid}@example.test',now()) on conflict(id) do nothing;")
def auth(uid):return f"set role authenticated;select set_config('request.jwt.claim.sub','{uid}',false);"
def call(action,payload,sid,game):return f"select public.apply_bonus_checkpoint('{action}','{json.dumps(payload)}','{sid}','{game}');"
def reset():sql(f"delete from public.vault_bonus_sessions where user_id='{A}';delete from public.game_rounds where user_id='{A}';delete from public.game_stats where user_id='{A}';update public.wallets set balance=10000000,revision=0,recovery='{{}}' where user_id='{A}';insert into public.vault_user_access(user_id,enabled) values('{A}',true) on conflict(user_id) do update set enabled=true;")
def wallet():return json.loads(sql(f"select json_build_object('balance',balance,'revision',revision,'recovery',recovery) from public.wallets where user_id='{A}';"))
script="""const C=require('./critter/model'),H=require('./heist/model'),M=require('./magnet/features-model'),id='83838383-aaaa-4383-8383-838383838383';const out={critter:[C.start({seed:63,bet:20,roundId:id,purchaseType:'super'})]};let h=H.start({seed:63,bet:20,roundId:id,purchaseType:'heist'}),hs=[h];for(let i=0;i<40&&H.active(h);i++){h=H.advance(h,h.status==='CHOICE'?'collect':'spin');hs.push(h);}out.heist=hs;let m;for(let seed=0;seed<10000;seed++){m=M.start({seed,bet:20,roundId:id});if(m.bonus.triggered)break;}const ms=[m];for(let i=0;i<20&&M.active(m);i++){m=M.advance(m);ms.push(m);}out.magnet=ms;console.log(JSON.stringify(out));"""
plans=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));passed=[]
for action,rounds in plans.items():
 reset();game={'critter':'critter','heist':'vault_heist','magnet':'magnet'}[action];sid=rounds[0]['roundId'];rev=0;cost=rounds[0].get('cost',rounds[0]['bet']);basecredit=0
 for i,c in enumerate(rounds):
  payload={'p_round_id':sid,'p_expected_revision':rev,'p_checkpoint':c}
  if action!='critter':payload['p_previous_step']=i-1
  command=call(action,payload,sid,game);sql(auth(A)+command);sql(auth(A)+command);rev+=1
  w=wallet();assert w['revision']==rev
  if action=='critter':basecredit=min(c['payout'],round(c['base']['winX']*c['bet'],6))
  assert w['balance']==round(10000000-cost+basecredit,6),(action,w)
 final=rounds[-1];held=round(final['payout']-basecredit,6)
 assert wallet()['recovery']['bonusSessions'][game]['heldWin']==held
 finish=f"select public.settle_bonus_session('{sid}','{game}',{rev},'{{\"complete\":true}}');"
 sql(auth(A)+finish);sql(auth(A)+finish);w=wallet();assert w['balance']==round(10000000-cost+final['payout'],6);assert w['revision']==rev+1
 assert int(sql(f"select rounds_played from public.game_stats where user_id='{A}' and game_id='{game}';"))==1
 sql(auth(B)+f"do $$begin if exists(select 1 from public.vault_bonus_sessions where session_id='{sid}') then raise exception 'RLS leak';end if;begin perform public.settle_bonus_session('{sid}','{game}',0,'{{}}');raise exception 'BAD';exception when others then if sqlerrm='BAD' then raise;end if;end;end$$;")
 passed.append(game+': no premature wallet credit, one final credit/revision/stat, duplicate calls safe, own-user RLS')
(ROOT/'reports/bonus-session-sql.json').write_text(json.dumps({'mode':'isolated local PostgreSQL','passed':passed},indent=2)+'\n');print('\n'.join('PASS '+s for s in passed))
