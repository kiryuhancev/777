"""Incremental MINES migration on isolated PostgreSQL; RLS and atomic settlement."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-q'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
migration=(root/'supabase_mines.sql').read_text();sql(migration);sql(migration)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';rid='11111111-1111-4111-8111-111111111111'
c={'version':1,'roundId':rid,'seed':1,'bet':20,'mineCount':3,'minePositions':[1,2,3],'opened':[],'status':'PLAYING','multiplier':1,'payout':0}
one={**c,'opened':[0],'multiplier':.97*25/22};two={**one,'opened':[0,4],'multiplier':.97*25*24/(22*21)};final={**two,'status':'CASHED_OUT','payout':round(20*two['multiplier'],6)}
def j(x):return "'"+json.dumps(x)+"'::jsonb"
start=f"select public.begin_game_round('{rid}','mines',20,0,{j({'mines':c})},{j({'minesRound':c})});"
pick=lambda x:f"select public.save_mines_checkpoint('{rid}',{j(x)});"
settle=f"select public.record_game_round('{rid}','mines',20,{final['payout']},{round(final['payout']/20,6)},'cash-out',{j({'mines':final})},'settled',{j({'minesRound':final})});"
sql(f'''do $$begin if to_regclass('public.vault_admin_audit') is not null then execute 'truncate public.vault_admin_audit';end if;end$$;delete from auth.users;insert into auth.users(id,raw_user_meta_data) values('{A}','{{"username":"Alice"}}'),('{B}','{{"username":"Bob"}}');
set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);select public.mines_capabilities();
{start}{start}
do $$begin if (select balance from public.wallets)<>999980 then raise exception 'Duplicate debit';end if;end$$;
{pick(one)}{pick(one)}{pick(two)}{pick(one)}
do $$begin if (select revision from public.wallets)<>1 or (select jsonb_array_length(recovery->'minesRound'->'opened') from public.wallets)<>2 then raise exception 'Pick changed wallet or rewound board';end if;end$$;
{settle}{settle}
do $$begin if (select balance from public.wallets)<>{999980+final['payout']} or (select rounds_played from public.game_stats where game_id='mines')<>1 then raise exception 'Duplicate payout/stats';end if;end$$;
select public.save_vault_settings('{{"lastGame":"mines","bets":{{"mines":3,"minesCount":4}}}}',clock_timestamp());
select set_config('request.jwt.claim.sub','{B}',false);
do $$begin
 if (select count(*) from public.game_rounds)<>0 then raise exception 'RLS leak';end if;
 begin perform public.save_mines_checkpoint('{rid}',{j(two)});raise exception 'Foreign checkpoint accepted';exception when others then if sqlerrm<>'Round missing or mismatch' then raise;end if;end;
end$$;reset role;''')
# Use a fresh active round for prefix/placement changes, fake payout and zero-pick cashout.
rid2='22222222-2222-4222-8222-222222222222';c={**c,'roundId':rid2};one={**c,'opened':[0],'multiplier':.97*25/22};bad={**one,'opened':[4]};changed={**one,'minePositions':[2,3,4]};fake={**one,'status':'CASHED_OUT','payout':999};bust={**one,'opened':[0,1],'status':'BUST','multiplier':0,'payout':0}
sql(f"set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);select public.begin_game_round('{rid2}','mines',20,2,{j({'mines':c})},{j({'minesRound':c})});select public.save_mines_checkpoint('{rid2}',{j(one)});")
for candidate in [bad,changed]:
 sql(f"set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);do $$begin begin perform public.save_mines_checkpoint('{rid2}',{j(candidate)});raise exception 'Stale/changed board accepted';exception when sqlstate 'P0001' then if sqlerrm<>'VAULT_WALLET_CONFLICT' then raise;end if;end;end$$;")
for candidate in [fake,{**c,'status':'CASHED_OUT'},{}]:
 sql(f"do $$begin begin perform public.vault_mines_multiplier({j(candidate)});raise exception 'Invalid checkpoint accepted';exception when others then if sqlerrm='Invalid checkpoint accepted' then raise;end if;end;end$$;")
sql(f"set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);select public.record_game_round('{rid2}','mines',20,0,0,'bust',{j({'mines':bust})},'settled',{j({'minesRound':bust})});")
# Other games must preserve MINES recovery, and MINES must preserve their namespaces.
sql(f"update public.wallets set recovery=recovery||'{{\"swampBonus\":{{\"remaining\":7}},\"slotBonus\":{{\"freeSpins\":8}}}}' where user_id='{A}';set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);select public.begin_game_round('33333333-3333-4333-8333-333333333333','poker',20,4,'{{}}','{{\"minesRound\":null}}');select public.record_game_round('33333333-3333-4333-8333-333333333333','poker',20,20,1,'push','{{}}','settled','{{\"minesRound\":null}}');do $$begin if (select recovery->'minesRound'->>'status' from public.wallets)<>'BUST' or (select recovery->'swampBonus'->>'remaining' from public.wallets)<>'7' then raise exception 'Other game recovery overwritten';end if;end$$;")
report={'database':'isolated PostgreSQL 17, not live Supabase','passed':['repeat-safe migration','one debit per UUID','safe-pick checkpoint idempotent without wallet revision','old prefix cannot rewind picks','changed board or divergent prefix rejected','correct cashout once and stats once','zero-pick cashout/fake payout/corrupt checkpoint rejected','bust payout zero','RLS isolates accounts','settings accept MINES','other-game recovery namespaces preserved']}
(root/'reports/mines-sql.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
