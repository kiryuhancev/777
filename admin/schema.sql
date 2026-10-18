-- VAULT administrative authority stays in PostgreSQL. No client can grant itself a role.
create table if not exists public.vault_admin_members(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table if not exists public.vault_user_access(user_id uuid primary key references auth.users(id) on delete cascade,enabled boolean not null default true,updated_at timestamptz not null default now());
create table if not exists public.vault_user_presence(user_id uuid primary key references auth.users(id) on delete cascade,last_seen_at timestamptz not null default now());
create table if not exists public.vault_admin_audit(id uuid primary key default gen_random_uuid(),request_id uuid unique not null,actor_id uuid not null references auth.users(id),user_id uuid not null references auth.users(id),action text not null check(action in ('balance','access')),operation text,amount numeric(20,6),old_balance numeric(20,6),new_balance numeric(20,6),enabled boolean,reason text not null,created_at timestamptz not null default now());
create index if not exists vault_admin_audit_user_time on public.vault_admin_audit(user_id,created_at desc);
alter table public.vault_admin_members enable row level security;
alter table public.vault_user_access enable row level security;
alter table public.vault_user_presence enable row level security;
alter table public.vault_admin_audit enable row level security;
revoke all on public.vault_admin_members,public.vault_user_access,public.vault_user_presence,public.vault_admin_audit from anon,authenticated;
create or replace function public.vault_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vault_admin_members m join auth.users u on u.id=m.user_id where m.user_id=auth.uid() and lower(u.email)='al.kiryuhancev@yandex.ru' and u.email_confirmed_at is not null);
$$;
revoke all on function public.vault_is_admin() from public,anon,authenticated;
create or replace function public.vault_game_access() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce((select enabled from public.vault_user_access where user_id=auth.uid()),true);
$$;
revoke all on function public.vault_game_access() from public,anon,authenticated;
-- Only the confirmed, designated identity receives membership. Email changes revoke it.
create or replace function public.vault_sync_admin_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if lower(new.email)='al.kiryuhancev@yandex.ru' and new.email_confirmed_at is not null then
  insert into public.vault_admin_members(user_id) values(new.id) on conflict do nothing;
 else delete from public.vault_admin_members where user_id=new.id;end if;return new;
end $$;
revoke all on function public.vault_sync_admin_identity() from public,anon,authenticated;
drop trigger if exists vault_admin_identity on auth.users;
create trigger vault_admin_identity after insert or update of email,email_confirmed_at on auth.users for each row execute function public.vault_sync_admin_identity();
insert into public.vault_admin_members(user_id) select id from auth.users where lower(email)='al.kiryuhancev@yandex.ru' and email_confirmed_at is not null on conflict do nothing;
delete from public.vault_admin_members m where not exists(select 1 from auth.users u where u.id=m.user_id and lower(u.email)='al.kiryuhancev@yandex.ru' and u.email_confirmed_at is not null);
create or replace function public.vault_admin_context() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('isAdmin',public.vault_is_admin());$$;
create or replace function public.vault_presence_heartbeat() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required';end if;
 insert into public.vault_user_presence(user_id,last_seen_at) values(u,now()) on conflict(user_id) do update set last_seen_at=excluded.last_seen_at where public.vault_user_presence.last_seen_at<now()-interval '20 seconds';
 return jsonb_build_object('enabled',public.vault_game_access());
end $$;
create or replace function public.vault_admin_users(p_search text default '',p_limit integer default 30,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 if p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 100000 or length(coalesce(p_search,''))>100 then raise exception 'VAULT_ADMIN_INVALID';end if;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into result from (
 select u.id user_id,u.email,p.username,w.balance,w.revision,coalesce(x.enabled,true) enabled,
 exists(select 1 from public.vault_admin_members am where am.user_id=u.id) is_admin,u.last_sign_in_at,
 h.last_seen_at,coalesce(h.last_seen_at>now()-interval '2 minutes',false) online,
 (select max(created_at) from public.game_rounds r where r.user_id=u.id) last_round_at,
 (select coalesce(sum(rounds_played),0) from public.game_stats gs where gs.user_id=u.id) rounds_played
 from auth.users u join public.profiles p on p.id=u.id join public.wallets w on w.user_id=u.id
 left join public.vault_user_access x on x.user_id=u.id left join public.vault_user_presence h on h.user_id=u.id
 where coalesce(p_search,'')='' or u.email ilike '%'||p_search||'%' or p.username ilike '%'||p_search||'%'
 order by u.created_at desc,u.id limit p_limit offset p_offset
 ) a;return result;
end $$;
create or replace function public.vault_admin_activity(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rounds jsonb;audit jsonb;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into rounds from (select round_id,game_id,bet,payout,multiplier,result,status,created_at,settled_at from public.game_rounds where user_id=p_user_id order by created_at desc,round_id desc limit 25) a;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into audit from (select actor_id,action,operation,amount,old_balance,new_balance,enabled,reason,created_at from public.vault_admin_audit where user_id=p_user_id order by created_at desc,id desc limit 25) a;
 return jsonb_build_object('rounds',rounds,'audit',audit);
end $$;
create or replace function public.vault_admin_balance(p_request_id uuid,p_user_id uuid,p_operation text,p_amount numeric,p_reason text,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();w public.wallets;a public.vault_admin_audit;next_balance numeric;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 if p_request_id is null or p_user_id is null or p_operation is null or p_operation not in ('credit','debit','set') or p_amount is null or p_amount<0 or p_amount>1000000000000 or p_amount::text in ('NaN','Infinity','-Infinity') or p_reason is null or length(trim(p_reason)) not between 3 and 200 or p_expected_revision is null then raise exception 'VAULT_ADMIN_INVALID';end if;
 -- Account lock serializes admin changes with every game begin/settlement.
 select * into w from public.wallets where user_id=p_user_id for update;
 if not found then raise exception 'VAULT_ADMIN_INVALID';end if;
 select * into a from public.vault_admin_audit where request_id=p_request_id;
 if found then
  if a.actor_id<>actor or a.user_id<>p_user_id or a.action<>'balance' or a.operation<>p_operation or a.amount<>round(p_amount,6) or a.reason<>trim(p_reason) then raise exception 'VAULT_ADMIN_INVALID';end if;
  return jsonb_build_object('duplicate',true,'balance',w.balance,'revision',w.revision);
 end if;
 if w.revision<>p_expected_revision then raise exception 'VAULT_ADMIN_REVISION';end if;
 if exists(select 1 from public.game_rounds where user_id=p_user_id and status='started') then raise exception 'VAULT_ADMIN_ACTIVE_ROUND';end if;
 next_balance:=round(case p_operation when 'credit' then w.balance+p_amount when 'debit' then w.balance-p_amount else p_amount end,6);
 if next_balance<0 then raise exception 'VAULT_ADMIN_FUNDS';end if;
 if next_balance>1000000000000 then raise exception 'VAULT_ADMIN_INVALID';end if;
 insert into public.vault_admin_audit(request_id,actor_id,user_id,action,operation,amount,old_balance,new_balance,reason) values(p_request_id,actor,p_user_id,'balance',p_operation,round(p_amount,6),w.balance,next_balance,trim(p_reason));
 update public.wallets set balance=next_balance,revision=revision+1,updated_at=now() where user_id=p_user_id returning * into w;
 return jsonb_build_object('duplicate',false,'balance',w.balance,'revision',w.revision);
end $$;
create or replace function public.vault_admin_access(p_request_id uuid,p_user_id uuid,p_enabled boolean,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();a public.vault_admin_audit;
begin
 if not public.vault_is_admin() then raise exception 'VAULT_ADMIN_FORBIDDEN';end if;
 if p_request_id is null or p_user_id is null or p_enabled is null or p_reason is null or length(trim(p_reason)) not between 3 and 200 then raise exception 'VAULT_ADMIN_INVALID';end if;
 if not p_enabled and exists(select 1 from public.vault_admin_members where user_id=p_user_id) then raise exception 'VAULT_ADMIN_SELF_BLOCK';end if;
 -- Same wallet lock order as balance mutations, including idempotent request replays.
 perform 1 from public.wallets where user_id=p_user_id for update;
 if not found then raise exception 'VAULT_ADMIN_INVALID';end if;
 select * into a from public.vault_admin_audit where request_id=p_request_id;
 if found then
  if a.actor_id<>actor or a.user_id<>p_user_id or a.action<>'access' or a.enabled<>p_enabled or a.reason<>trim(p_reason) then raise exception 'VAULT_ADMIN_INVALID';end if;
  return jsonb_build_object('duplicate',true,'enabled',a.enabled);
 end if;
 insert into public.vault_user_access(user_id,enabled) values(p_user_id,p_enabled) on conflict(user_id) do update set enabled=excluded.enabled,updated_at=now();
 insert into public.vault_admin_audit(request_id,actor_id,user_id,action,enabled,reason) values(p_request_id,actor,p_user_id,'access',p_enabled,trim(p_reason));
 return jsonb_build_object('duplicate',false,'enabled',p_enabled);
end $$;
revoke all on function public.vault_admin_context(),public.vault_presence_heartbeat(),public.vault_admin_users(text,integer,integer),public.vault_admin_activity(uuid),public.vault_admin_balance(uuid,uuid,text,numeric,text,bigint),public.vault_admin_access(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.vault_admin_context(),public.vault_presence_heartbeat(),public.vault_admin_users(text,integer,integer),public.vault_admin_activity(uuid),public.vault_admin_balance(uuid,uuid,text,numeric,text,bigint),public.vault_admin_access(uuid,uuid,boolean,text) to authenticated;
