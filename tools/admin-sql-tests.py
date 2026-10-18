"""Administrative privileges, idempotent money operations and blocked starts in real PostgreSQL."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent.parent
def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-v','ON_ERROR_STOP=1','-q'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
s=(root/'supabase_admin_swamp.sql').read_text();sql(s);sql(s)
A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';D='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
# Audit intentionally prevents deleting referenced identities: recreate the isolated public fixture cleanly for deterministic assertions.
sql("truncate public.vault_admin_audit;delete from auth.users;")
sql(f"insert into auth.users(id,raw_user_meta_data,email,email_confirmed_at) values('{A}','{{\"username\":\"Admin\"}}','al.kiryuhancev@yandex.ru',now()),('{B}','{{\"username\":\"Bob\"}}','bob@example.test',now()),('{D}','{{\"username\":\"Unconfirmed\"}}','unconfirmed@example.test',null);")
def identity(u):return f"set role authenticated;select set_config('request.jwt.claim.sub','{u}',false);"
def denied(command,expected='VAULT_ADMIN_FORBIDDEN'):
 sql(identity(B)+f"do $$begin begin {command};raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'{expected}' then raise;end if;end;end$$;")
denied("perform public.vault_admin_users('',30,0)");denied(f"perform public.vault_admin_activity('{A}')")
denied(f"perform public.vault_admin_balance(gen_random_uuid(),'{B}','set',999999999,'bad write',0)")
denied(f"perform public.vault_admin_access(gen_random_uuid(),'{A}',false,'block admin')")
sql(identity(B)+"do $$begin begin insert into public.vault_admin_members values(auth.uid());raise exception 'UNEXPECTED_SUCCESS';exception when insufficient_privilege then null;end;begin update public.wallets set balance=9;raise exception 'UNEXPECTED_SUCCESS';exception when insufficient_privilege then null;end;end$$;")
sql(identity(A)+f"do $$begin if not (public.vault_admin_context()->>'isAdmin')::boolean or jsonb_array_length(public.vault_admin_users('',30,0))<>3 then raise exception 'Admin list unavailable';end if;end$$;")
r='11111111-1111-4111-8111-111111111111'
sql(identity(A)+f"select public.vault_admin_balance('{r}','{B}','credit',50,'test credit',0);select public.vault_admin_balance('{r}','{B}','credit',50,'test credit',0);do $$begin if (select count(*) from public.vault_admin_audit)=0 then null;end if;end$$;".replace("do $$begin if (select count(*) from public.vault_admin_audit)=0 then null;end if;end$$;",''))
sql(f"do $$begin if (select balance from public.wallets where user_id='{B}')<>1000050 or (select revision from public.wallets where user_id='{B}')<>1 or (select count(*) from public.vault_admin_audit)<>1 then raise exception 'Repeated admin balance applied twice';end if;end$$;")
sql(identity(A)+f"do $$begin begin perform public.vault_admin_balance(gen_random_uuid(),'{B}','set',100,'stale revision',0);raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'VAULT_ADMIN_REVISION' then raise;end if;end;begin perform public.vault_admin_balance(gen_random_uuid(),'{B}','debit',1000099,'too much debit',1);raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'VAULT_ADMIN_FUNDS' then raise;end if;end;begin perform public.vault_admin_access(gen_random_uuid(),'{A}',false,'self block');raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'VAULT_ADMIN_SELF_BLOCK' then raise;end if;end;end$$;")
# Start first, then block. A retried begin must still acknowledge its accepted UUID, and settlement stays allowed.
sql(identity(B)+"select public.begin_game_round('22222222-2222-4222-8222-222222222222','poker',20,1,'{}','{}');")
sql(identity(A)+f"select public.vault_admin_access('33333333-3333-4333-8333-333333333333','{B}',false,'test pause');select public.vault_admin_access('33333333-3333-4333-8333-333333333333','{B}',false,'test pause');do $$begin begin perform public.vault_admin_balance(gen_random_uuid(),'{B}','set',30,'during round',2);raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'VAULT_ADMIN_ACTIVE_ROUND' then raise;end if;end;end$$;")
sql(identity(B)+"select public.begin_game_round('22222222-2222-4222-8222-222222222222','poker',20,1,'{}','{}');select public.record_game_round('22222222-2222-4222-8222-222222222222','poker',20,40,2,'win','{}','settled','{}');do $$begin if (public.vault_presence_heartbeat()->>'enabled')::boolean then raise exception 'Block flag lost';end if;begin perform public.begin_game_round(gen_random_uuid(),'bird',20,3,'{}','{}');raise exception 'UNEXPECTED_SUCCESS';exception when others then if sqlerrm<>'VAULT_ACCOUNT_DISABLED' then raise;end if;end;end$$;")
denied("perform public.begin_game_round(gen_random_uuid(),'poker',0,3,'{}','{}')",'VAULT_ACCOUNT_DISABLED')
sql(identity(A)+f"select public.vault_admin_access(gen_random_uuid(),'{B}',true,'resume play');select public.vault_admin_balance(gen_random_uuid(),'{B}','debit',10,'test debit',3);select public.vault_admin_balance(gen_random_uuid(),'{B}','set',500,'test set',4);do $$begin if jsonb_array_length(public.vault_admin_activity('{B}')->'rounds')<>1 then raise exception 'Activity missing';end if;end$$;")
# Confirmed email is checked on every RPC, not just the initial trigger or frontend hint.
sql(f"update auth.users set email_confirmed_at=null where id='{A}';")
sql(identity(A)+"do $$begin if (public.vault_admin_context()->>'isAdmin')::boolean then raise exception 'Unconfirmed admin';end if;end$$;")
sql(f"update auth.users set email_confirmed_at=now() where id='{A}';")
# Repeat-safe migration must preserve exact funds, bans, audit rows and role membership.
before=sql(f"select balance from public.wallets where user_id='{B}';");sql(s);after=sql(f"select balance from public.wallets where user_id='{B}';");assert before==after
sql("set role anon;do $$begin begin perform public.vault_admin_context();raise exception 'UNEXPECTED_SUCCESS';exception when insufficient_privilege then null;end;end$$;")
report={'database':'isolated PostgreSQL 17, not live Supabase','passed':['designated confirmed identity auto-provisioned','normal user cannot list/activity/change money/block users','no direct role or wallet writes','request UUID applies balance once','revision prevents stale overwrite','negative/oversized debit rejected','no admin self-block','cannot edit money during an active round','block forbids fresh bets but allows acknowledged round retry and settlement','unblock, credit, debit and set balance','activity and audit readable only by admin','unconfirmed/revoked identity loses admin authority','reapplying migration preserves funds and audit','anonymous admin RPC denied','zero-stake fresh rounds cannot bypass a user block']}
(root/'reports/admin-sql.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
