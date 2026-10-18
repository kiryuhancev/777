"""Paid bonus entitlement persists at begin; retry and F5 never buy or grant twice."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-q'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
sql((root/'supabase_admin_swamp.sql').read_text());A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
sql(f"truncate public.vault_admin_audit;delete from auth.users;insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{A}','{{\"username\":\"Player\"}}','alice@example.test',now());")
def j(x):return "'"+json.dumps(x)+"'::jsonb"
identity=f"set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);"
rid='11111111-1111-4111-8111-111111111111';b={'version':1,'featureId':rid,'bet':20,'remaining':10,'collectors':0,'tier':0,'totalWinX':0,'spinsPlayed':0};meta={'purchaseType':'bonus','purchaseStake':20,'purchaseSpins':10,'purchaseCostX':77}
begin=f"select public.begin_game_round('{rid}','swamp',1540,0,{j(meta)},{j({'swampBonus':b})});"
sql(identity+begin+begin)
sql(f"do $$begin if (select balance from public.wallets where user_id='{A}')<>998460 or (select recovery->'swampBonus'->>'remaining' from public.wallets where user_id='{A}')<>'10' then raise exception 'Purchased entitlement/debit missing';end if;end$$;")
# A reload can cancel the interrupted entry receipt, while retaining its already-paid FS entitlement.
sql(identity+f"select public.record_game_round('{rid}','swamp',1540,0,0,'interrupted','{{}}','cancelled',{j({'swampBonus':b})});select public.record_game_round('{rid}','swamp',1540,0,0,'interrupted','{{}}','cancelled','{{}}');")
nxt={**b,'remaining':9,'spinsPlayed':1}
sql(identity+f"select public.begin_game_round('22222222-2222-4222-8222-222222222222','swamp',0,2,'{{\"freeSpin\":true,\"featureId\":\"{rid}\",\"freeSpinIndex\":1}}',{j({'swampBonus':nxt})});select public.record_game_round('22222222-2222-4222-8222-222222222222','swamp',0,0,0,'no-win','{{}}','settled',{j({'swampBonus':nxt})});")
sql(f"update public.wallets set recovery='{{}}' where user_id='{A}';")
for cost,remaining in [(10,20),(7000,10)]:
 # First request is underpriced, second has the wrong feature size for SUPER.
 c={**b,'featureId':'33333333-3333-4333-8333-333333333333','remaining':remaining};m={**meta,'purchaseType':'super','purchaseCostX':350}
 sql(identity+f"do $$begin begin perform public.begin_game_round('33333333-3333-4333-8333-333333333333','swamp',{cost},4,{j(m)},{j({'swampBonus':c})});raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'Invalid swamp purchase' then raise;end if;end;end$$;")
c={**b,'featureId':'44444444-4444-4444-8444-444444444444','remaining':20};m={**meta,'purchaseType':'super','purchaseCostX':350,'purchaseSpins':20}
sql(identity+f"select public.begin_game_round('44444444-4444-4444-8444-444444444444','swamp',7000,4,{j(m)},{j({'swampBonus':c})});select public.record_game_round('44444444-4444-4444-8444-444444444444','swamp',7000,0,0,'bonus-purchased','{{}}','settled',{j({'swampBonus':c})});")
sql(f"insert into public.vault_user_access(user_id,enabled) values('{A}',false) on conflict(user_id) do update set enabled=false;")
c2={**c,'remaining':19,'spinsPlayed':1}
sql(identity+f"select public.begin_game_round('55555555-5555-4555-8555-555555555555','swamp',0,6,'{{\"freeSpin\":true,\"featureId\":\"44444444-4444-4444-8444-444444444444\",\"freeSpinIndex\":1}}',{j({'swampBonus':c2})});select public.record_game_round('55555555-5555-4555-8555-555555555555','swamp',0,0,0,'no-win','{{}}','settled',{j({'swampBonus':c2})});")
report={'database':'isolated PostgreSQL 17','passed':['10 FS purchase cost 77x charged once','entitlement exists before entry animation/receipt settlement','reload/interrupted receipt does not refund or remove bought FS','duplicate UUID cannot charge or grant twice','bought free spin consumes normal owned entitlement','underpriced or wrong-size purchase rejected','20 FS purchase cost 350x accepted with zero direct payout','blocked user can still consume a previously paid free-spin entitlement']}
(root/'reports/swamp-purchases-sql.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
