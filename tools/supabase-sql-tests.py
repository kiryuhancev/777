"""Execute migration and isolation/idempotency tests in a disposable PostgreSQL."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent
CONTAINER='vault-postgres-test'
def sql(text):
 r=subprocess.run(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-q'],input=text,text=True,capture_output=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout
sql('''do $$begin if not exists(select from pg_roles where rolname='anon') then create role anon nologin;end if;if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;end$$;
create schema if not exists auth;create table if not exists auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated;''')
migration=(ROOT/'supabase_schema.sql').read_text();sql(migration);sql(migration)
sql('''delete from auth.users;insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"username":"Alice"}'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"username":"Bob"}');
set role authenticated;select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
do $$begin
 if (select count(*) from public.profiles)<>1 or (select count(*) from public.wallets)<>1 or (select count(*) from public.user_settings)<>1 then raise exception 'RLS identity leak';end if;
 begin update public.wallets set balance=999999;raise exception 'Wallet update unexpectedly allowed';exception when insufficient_privilege then null;end;
 begin update public.profiles set xp=999999;raise exception 'XP update unexpectedly allowed';exception when insufficient_privilege then null;end;
 begin insert into public.game_rounds(round_id,user_id,game_id,bet) values(gen_random_uuid(),auth.uid(),'slot',0);raise exception 'Direct round insert allowed';exception when insufficient_privilege then null;end;
 update public.profiles set username='Alice Changed' where id=auth.uid();
 update public.profiles set username='Hacked' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
end$$;
select public.begin_game_round('11111111-1111-4111-8111-111111111111','poker',20,0,'{}','{}');
select public.begin_game_round('11111111-1111-4111-8111-111111111111','poker',20,0,'{}','{}');
select public.record_game_round('11111111-1111-4111-8111-111111111111','poker',20,25,1.25,'win','{}','settled','{}');
select public.record_game_round('11111111-1111-4111-8111-111111111111','poker',20,25,1.25,'win','{}','settled','{}');
do $$begin
 if (select balance from public.wallets)<>1000005 or (select revision from public.wallets)<>2 then raise exception 'Duplicate wallet application';end if;
 if (select rounds_played from public.game_stats)<>1 or (select xp from public.profiles)<>10 then raise exception 'Duplicate statistics/XP';end if;
 begin perform public.begin_game_round('22222222-2222-4222-8222-222222222222','slot',20,0,'{}','{}');raise exception 'Stale wallet accepted';exception when sqlstate 'P0001' then if sqlerrm<>'VAULT_WALLET_CONFLICT' then raise;end if;end;
 begin perform public.record_game_round('11111111-1111-4111-8111-111111111111','poker',20,50,2.5,'win','{}','settled','{}');raise exception 'Modified duplicate accepted';exception when sqlstate 'P0001' then if sqlerrm<>'VAULT_WALLET_CONFLICT' then raise;end if;end;
end$$;
select public.begin_game_round('33333333-3333-4333-8333-333333333333','bird',20,2,'{}','{}');
select public.record_game_round('33333333-3333-4333-8333-333333333333','bird',20,7,0.35,'interrupted','{}','cancelled','{}');
select public.record_game_round('33333333-3333-4333-8333-333333333333','bird',20,7,0.35,'interrupted','{}','cancelled','{}');
select public.save_vault_settings('{"sound":false,"bets":{"slot":4,"poker":3,"bird":2}}',clock_timestamp());
select public.save_vault_settings('{"sound":true}',now()-interval '1 day');
do $$begin if (select sound_enabled from public.user_settings)<>false then raise exception 'Stale settings overwrote new settings';end if;end$$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $$begin
 if (select username from public.profiles)<>'Bob' or (select balance from public.wallets)<>1000000 or (select count(*) from public.game_rounds)<>0 or (select count(*) from public.game_stats)<>0 then raise exception 'Cross-user leak/change';end if;
 begin perform public.record_game_round('11111111-1111-4111-8111-111111111111','poker',20,25,1.25,'win','{}','settled','{}');raise exception 'Other user round accepted';exception when sqlstate 'P0001' then if sqlerrm not like 'Round missing%' then raise;end if;end;
 begin perform public.begin_game_round('11111111-1111-4111-8111-111111111111','poker',20,0,'{}','{}');raise exception 'Other user UUID accepted';exception when sqlstate 'P0001' then if sqlerrm<>'Round mismatch' then raise;end if;end;
end$$;
set role anon;select set_config('request.jwt.claim.sub','',false);
do $$begin begin perform public.begin_game_round(gen_random_uuid(),'slot',20,0,'{}','{}');raise exception 'Anon RPC allowed';exception when insufficient_privilege then null;end;end$$;
reset role;do $$begin
 if (select balance from public.wallets where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>999992 then raise exception 'Cancelled round recovery wrong';end if;
 if (select count(*) from public.game_rounds)<>2 then raise exception 'Duplicate round rows';end if;
 if not (select bool_and(relrowsecurity) from pg_class where oid in ('public.profiles'::regclass,'public.wallets'::regclass,'public.game_rounds'::regclass,'public.game_stats'::regclass,'public.user_achievements'::regclass,'public.user_settings'::regclass)) then raise exception 'RLS missing';end if;
end$$;''')
report={'database':'PostgreSQL 17','passed':['migration and repeat application','trigger creates profile/wallet/settings','RLS A cannot read/update B','no direct wallet, XP or round writes','idempotent debit and payout','one stats/XP update','stale wallet revision rejected','mismatched duplicate rejected','interrupted payout credited exactly once','settings last write wins','anonymous RPC denied']}
(ROOT/'reports/supabase-sql.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
