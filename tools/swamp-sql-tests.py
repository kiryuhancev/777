"""Swamp SQL on disposable PostgreSQL: owned entitlements, idempotency and namespaces."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-q'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
m=(root/'supabase_swamp_slot.sql').read_text();sql(m);sql(m)
sql('''delete from auth.users;insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"username":"Alice"}'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"username":"Bob"}');
set role authenticated;select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select public.swamp_slot_capabilities();
select public.begin_game_round('11111111-1111-4111-8111-111111111111','swamp',20,0,'{"freeSpin":false}','{"swampBonus":null}');
select public.record_game_round('11111111-1111-4111-8111-111111111111','swamp',20,5,0.25,'win','{}','settled','{"swampBonus":{"version":1,"featureId":"11111111-1111-4111-8111-111111111111","bet":20,"remaining":10,"collectors":0,"tier":0,"totalWinX":0.25,"spinsPlayed":0}}');
select public.record_game_round('11111111-1111-4111-8111-111111111111','swamp',20,5,0.25,'win','{}','settled','{"swampBonus":null}');
do $$begin if (select (recovery->'swampBonus'->>'remaining')::int from public.wallets)<>10 or (select balance from public.wallets)<>999985 then raise exception 'Duplicate payout/recovery overwrite';end if;end$$;
select public.begin_game_round('22222222-2222-4222-8222-222222222222','swamp',0,2,'{"freeSpin":true,"featureId":"11111111-1111-4111-8111-111111111111","freeSpinIndex":1}','{"swampBonus":{"version":1,"featureId":"11111111-1111-4111-8111-111111111111","bet":20,"remaining":9,"collectors":0,"tier":0,"totalWinX":0.25,"spinsPlayed":1}}');
select public.begin_game_round('22222222-2222-4222-8222-222222222222','swamp',0,2,'{"freeSpin":true,"featureId":"11111111-1111-4111-8111-111111111111","freeSpinIndex":1}','{}');
select public.record_game_round('22222222-2222-4222-8222-222222222222','swamp',0,200,10,'win','{"collectors":4}','settled','{"swampBonus":{"version":1,"featureId":"11111111-1111-4111-8111-111111111111","bet":20,"remaining":19,"collectors":4,"tier":1,"totalWinX":10.25,"spinsPlayed":1}}');
select public.record_game_round('22222222-2222-4222-8222-222222222222','swamp',0,200,10,'win','{}','settled','{"swampBonus":null}');
do $$begin
 if (select balance from public.wallets)<>1000185 or (select total_wagered from public.game_stats)<>20 or (select rounds_played from public.game_stats)<>2 then raise exception 'FS wallet/stat application incorrect';end if;
 begin perform public.begin_game_round(gen_random_uuid(),'swamp',20,4,'{"freeSpin":false}','{"swampBonus":null}');raise exception 'Paid spin bypassed pending bonus';exception when sqlstate 'P0001' then if sqlerrm<>'VAULT_WALLET_CONFLICT' then raise;end if;end;
 begin perform public.begin_game_round(gen_random_uuid(),'swamp',0,4,'{"freeSpin":true,"featureId":"11111111-1111-4111-8111-111111111111","freeSpinIndex":1}','{}');raise exception 'Old free action replayed';exception when sqlstate 'P0001' then if sqlerrm<>'VAULT_WALLET_CONFLICT' then raise;end if;end;
end$$;
reset role;
update public.wallets set recovery=jsonb_set(recovery,'{swampBonus,remaining}','1') where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set role authenticated;
select public.begin_game_round('33333333-3333-4333-8333-333333333333','swamp',0,4,'{"freeSpin":true,"featureId":"11111111-1111-4111-8111-111111111111","freeSpinIndex":2}','{"swampBonus":{"version":1,"featureId":"11111111-1111-4111-8111-111111111111","bet":20,"remaining":0,"collectors":4,"tier":1,"totalWinX":10.25,"spinsPlayed":2}}');
select public.record_game_round('33333333-3333-4333-8333-333333333333','swamp',0,0,0,'interrupted','{}','cancelled','{"swampBonus":{"version":1,"featureId":"11111111-1111-4111-8111-111111111111","bet":20,"remaining":0,"collectors":4,"tier":1,"totalWinX":10.25,"spinsPlayed":2}}');
do $$begin if (select (recovery->'swampBonus'->>'remaining')::int from public.wallets)<>0 then raise exception 'Interrupted FS replayed';end if;end$$;
select public.begin_game_round('44444444-4444-4444-8444-444444444444','poker',20,6,'{}','{"swampBonus":null}');
select public.record_game_round('44444444-4444-4444-8444-444444444444','poker',20,20,1,'push','{}','settled','{"swampBonus":null}');
do $$begin if (select recovery->'swampBonus' from public.wallets) is null or (select balance from public.wallets)<>1000185 then raise exception 'Another game overwrote swamp recovery or wallet';end if;end$$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $$begin
 if (select count(*) from public.game_rounds)<>0 or (select balance from public.wallets)<>1000000 then raise exception 'RLS identity leak';end if;
 begin perform public.begin_game_round(gen_random_uuid(),'swamp',0,0,'{"freeSpin":true,"featureId":"11111111-1111-4111-8111-111111111111","freeSpinIndex":1}','{}');raise exception 'Other account used feature';exception when sqlstate 'P0001' then if sqlerrm<>'VAULT_WALLET_CONFLICT' then raise;end if;end;
end$$;reset role;''')
report={'database':'PostgreSQL 17','passed':['repeat-safe migration','one paid debit/payout','free spin consumed once before payout','duplicate UUID cannot rewind bonus or payout','pending bonus blocks a new paid spin','stale free-spin index rejected','interrupted last FS remains consumed','other-game recovery namespace preserved','RLS prevents cross-account feature use']}
(root/'reports/swamp-sql.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
