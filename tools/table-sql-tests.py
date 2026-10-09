"""New table registry and DOUBLE transaction tests on disposable PostgreSQL, with RLS."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-q'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
migration=(root/'supabase_table_games.sql').read_text();sql(migration);sql(migration)
sql('''delete from auth.users;insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"username":"Alice"}'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"username":"Bob"}');
set role authenticated;select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select public.begin_game_round('11111111-1111-4111-8111-111111111111','blackjack',100,0);
select public.record_game_round('11111111-1111-4111-8111-111111111111','blackjack',200,400,2,'WIN','{"doubled":true}');
select public.record_game_round('11111111-1111-4111-8111-111111111111','blackjack',200,400,2,'WIN','{"doubled":true}');
do $$begin
 if (select balance from public.wallets)<>1000200 or (select revision from public.wallets)<>2 then raise exception 'Double debit/payout incorrect';end if;
 if (select total_wagered from public.game_stats)<>200 or (select rounds_played from public.game_stats)<>1 then raise exception 'Double stats incorrect';end if;
end$$;
select public.begin_game_round('22222222-2222-4222-8222-222222222222','blackjack',100,2);
select public.record_game_round('22222222-2222-4222-8222-222222222222','blackjack',200,0,0,'interrupted','{"doubled":true}','cancelled');
select public.record_game_round('22222222-2222-4222-8222-222222222222','blackjack',200,0,0,'interrupted','{"doubled":true}','cancelled');
do $$begin if (select balance from public.wallets)<>1000000 then raise exception 'Interrupted double refunded or charged twice';end if;end$$;
select public.begin_game_round('33333333-3333-4333-8333-333333333333','baccarat',100,4);
do $$begin
 begin perform public.record_game_round('33333333-3333-4333-8333-333333333333','baccarat',200,0,0,'test','{"doubled":true}');raise exception 'Non-blackjack extra wager allowed';exception when sqlstate 'P0001' then if sqlerrm<>'Round missing or mismatch' then raise;end if;end;
end$$;
select public.record_game_round('33333333-3333-4333-8333-333333333333','baccarat',100,195,1.95,'BANKER WINS');
select public.record_game_round('33333333-3333-4333-8333-333333333333','baccarat',100,195,1.95,'BANKER WINS');
select public.save_vault_settings('{"lastGame":"baccarat","bets":{"blackjack":3,"baccarat":4,"baccaratType":"BANKER"}}',clock_timestamp());
do $$begin
 if (select balance from public.wallets)<>1000095 or (select revision from public.wallets)<>6 then raise exception 'Baccarat transaction incorrect';end if;
 if (select last_game_id from public.user_settings)<>'baccarat' then raise exception 'Table screen preference lost';end if;
 if (select sum(rounds_played) from public.game_stats)<>3 then raise exception 'Duplicate table stats';end if;
end$$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $$begin if (select count(*) from public.game_rounds)<>0 or (select balance from public.wallets)<>1000000 then raise exception 'Table identity leak';end if;end$$;
reset role;''')
report={'database':'PostgreSQL 17','passed':['repeat-safe registry migration','one hand UUID with DOUBLE','atomic additional debit and return','duplicate settle is idempotent','interrupted DOUBLE consumes both stakes without refund','extra wager rejected outside Blackjack','Baccarat commission credited once','last-game/settings persistence','RLS isolates both new games']}
(root/'reports/table-sql.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
