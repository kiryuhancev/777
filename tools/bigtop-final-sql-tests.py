from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout.strip()
for _ in range(2):sql((ROOT/'supabase_big_top_v3.txt').read_text())
A='81818181-8181-4181-8181-818181818181';B='82828282-8282-4282-8282-828282828282'
for u in [A,B]:sql(f"insert into auth.users(id,email,raw_user_meta_data) values('{u}','{u}@test.local','{{\"username\":\"BigTop\"}}') on conflict do nothing;insert into public.vault_user_access(user_id,enabled) values('{u}',true) on conflict(user_id) do update set enabled=true;")
script="""const fs=require('fs'),vm=require('vm');vm.runInThisContext(fs.readFileSync('big-top/config-v1.js','utf8')+'\\n'+fs.readFileSync('big-top/model-v1.js','utf8')+'\\n'+fs.readFileSync('big-top/config-v2.js','utf8')+'\\n'+fs.readFileSync('big-top/model-v2.js','utf8')+'\\n'+fs.readFileSync('big-top/config.js','utf8')+'\\n'+fs.readFileSync('big-top/model.js','utf8'));const M=BIG_TOP_MODEL,id='11111111-1111-4111-8111-111111111111',out={};for(let seed=0;seed<20000&&Object.keys(out).length<3;seed++){const r=M.start({seed,bet:20,roundId:id});if(r.bonus)out.bonus??=r;else if(r.payout)out.win??=r;else out.loss??=r;}out.legacy2=BIG_TOP_MODEL_V2.start({seed:25,bet:20,roundId:id,purchase:true});out.legacy=BIG_TOP_MODEL_V1.start({seed:25,bet:20,roundId:id,purchase:true});out.buy=M.start({seed:25,bet:20,roundId:id,purchase:true});console.log(JSON.stringify(out));"""
fixtures=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));checks=[]
def auth(u):return f"set role authenticated;select set_config('request.jwt.claim.sub','{u}',false);"
def lit(x):return "'"+json.dumps(x).replace("'","''")+"'::jsonb"
for idx,(kind,r) in enumerate(fixtures.items()):
 rid=f'81818181-000{idx}-4181-8181-818181818181';r=json.loads(subprocess.check_output(['node','-e',script.split("const M=BIG_TOP_MODEL")[0]+"console.log(JSON.stringify(BIG_TOP_MODEL.start("+json.dumps(dict(r,roundId=rid))+")));"],cwd=ROOT))
 sql(f"delete from public.vault_bonus_sessions where user_id='{A}';delete from public.game_rounds where user_id='{A}';delete from public.game_stats where user_id='{A}';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';")
 payload={'p_round_id':rid,'p_expected_revision':0,'p_checkpoint':r};call=f"select public.settle_big_top_round('{rid}',0,{lit(r)});"
 if r['bonus']:call=f"select public.apply_bonus_checkpoint('big_top',{lit(payload)},'{rid}','big_top');"
 sql(auth(A)+call);sql(auth(A)+call);w=json.loads(sql(f"select row_to_json(w) from public.wallets w where user_id='{A}';"));expected=round(1000000-r['cost'],6);assert w['balance']==expected,(kind,w['balance'],expected)
 sql(auth(A)+f"select public.credit_big_top_base('{rid}',1);");sql(auth(A)+f"select public.credit_big_top_base('{rid}',1);");assert float(sql(f"select balance from public.wallets where user_id='{A}';"))==round(1000000-r['cost']+r['baseWinX']*r['bet'],6)
 assert w['revision']==1;assert sql(f"select rounds_played from public.game_stats where user_id='{A}' and game_id='big_top';")=='1'
 if r['bonus']:
  sql(auth(A)+f"do $$begin begin perform public.settle_bonus_session('{rid}','big_top',2,'{{}}');raise exception 'EARLY';exception when others then if sqlerrm='EARLY' then raise;end if;end;end$$;")
  for n in range(r['bonus']['spinCount']+1):
   plans=r['bonus']['spins'][:n];last=plans[-1] if plans else {};p={'version':1,'roundId':rid,'baseDone':True,'introDone':True,'nextSpin':n,'totalWinX':round(min(r['bonusWinX'],sum(x['winX'] for x in plans)),6),'encore':last.get('encoreAfter',[]),'meter':last.get('meterAfter',0),'armed':last.get('armedAfter',False),'complete':False}
   if r['version']==3:p['persistentCurtains']=last.get('persistentAfter',[])
   sql(auth(A)+f"select public.save_big_top_progress('{rid}',{lit(p)});")
  sql(auth(A)+f"select public.settle_bonus_session('{rid}','big_top',2,'{{}}');");sql(auth(A)+f"select public.settle_bonus_session('{rid}','big_top',2,'{{}}');");assert float(sql(f"select balance from public.wallets where user_id='{A}';"))==round(1000000-r['cost']+r['payout'],6)
 sql(auth(B)+f"do $$begin if exists(select 1 from public.game_rounds where round_id='{rid}') then raise exception 'RLS';end if;begin perform public.save_big_top_progress('{rid}','{{}}');raise exception 'FOREIGN';exception when others then if sqlerrm='FOREIGN' then raise;end if;end;end$$;")
 checks.append(kind+': exact SQL Ways, single debit/stat, duplicate idempotency, escrow/end credit, progress identity/RLS')
# Independent server rejects forged persistent identity/position/open decisions and missing carry.
bonus=fixtures['buy']['bonus']['spins']
for i,plan in enumerate(bonus):
 if not plan['persistentBefore']:continue
 previous=bonus[i-1] if i else None
 tests=[]
 bad=json.loads(json.dumps(plan));bad['persistentAfter'][0]['multiplier']=10 if bad['persistentAfter'][0]['multiplier']!=10 else 1;tests.append(bad)
 bad=json.loads(json.dumps(plan));bad['curtainStates'][0]['participates']=not bad['curtainStates'][0]['participates'];tests.append(bad)
 bad=json.loads(json.dumps(plan));bad['persistentBefore'][0]['reelIndex']=(bad['persistentBefore'][0]['reelIndex']+1)%6;tests.append(bad)
 for bad in tests:
  sql(f"do $$begin begin perform public.big_top_v3_validate_plan({lit(bad)},true,{lit(previous)});raise exception 'FORGED_ACCEPTED';exception when others then if sqlerrm='FORGED_ACCEPTED' then raise;end if;end;end$$;")
 checks.append('Server rejects forged persistent multiplier, reel ownership and playing/open decisions')
 break
else:raise AssertionError('No persistence SQL fixture')
# Insufficient funds, direct bonus-credit bypass, tampered payout and account blocks.
r=fixtures['buy'];r=json.loads(subprocess.check_output(['node','-e',script.split("const M=BIG_TOP_MODEL")[0]+"console.log(JSON.stringify(BIG_TOP_MODEL.start("+json.dumps(dict(r,roundId='83838383-8383-4383-8383-838383838383'))+")));"],cwd=ROOT));sql(f"update public.wallets set balance=100,revision=0,recovery='{{}}' where user_id='{B}';")
payload={'p_round_id':r['roundId'],'p_expected_revision':0,'p_checkpoint':r}
sql(auth(B)+f"do $$begin begin perform public.apply_bonus_checkpoint('big_top',{lit(payload)},'{r['roundId']}','big_top');raise exception 'INSUFFICIENT_ACCEPTED';exception when others then if sqlerrm='INSUFFICIENT_ACCEPTED' then raise;end if;end;end$$;")
assert float(sql(f"select balance from public.wallets where user_id='{B}';"))==100;assert sql(f"select count(*) from public.game_rounds where round_id='{r['roundId']}';")=='0'
sql(auth(B)+f"do $$begin begin perform public.settle_big_top_round('{r['roundId']}',0,{lit(r)});raise exception 'BYPASS';exception when others then if sqlerrm<>'Bonus escrow required' then raise;end if;end;end$$;")
r=fixtures['loss'];r['roundId']='84848484-8484-4484-8484-848484848484';r['payout']+=1
sql(auth(B)+f"do $$begin begin perform public.settle_big_top_round('{r['roundId']}',0,{lit(r)});raise exception 'TAMPER';exception when others then if sqlerrm<>'Invalid Big Top settlement' then raise;end if;end;end$$;");r['payout']-=1
sql(f"update public.vault_user_access set enabled=false where user_id='{B}';")
sql(auth(B)+f"do $$begin begin perform public.settle_big_top_round('{r['roundId']}',0,{lit(r)});raise exception 'BLOCK';exception when others then if sqlerrm<>'VAULT_ACCOUNT_DISABLED' then raise;end if;end;end$$;")
checks.append('Insufficient buy has no partial debit/row; direct bonus credit bypass denied; payout tampering and blocked-account stakes denied')
(ROOT/'reports/bigtop-final-sql.json').write_text(json.dumps({'passed':checks},indent=2));print('\n'.join('PASS '+s for s in checks))
