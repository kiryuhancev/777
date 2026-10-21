-- VAULT feature escrow. Apply after current game migrations. No credentials or reset.
begin;
create table if not exists public.vault_bonus_sessions(
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, game_id text not null check(game_id in ('slot','swamp','vault_heist','magnet','critter')),
 held_win numeric not null default 0 check(held_win>=0 and held_win<=1000000000000),
 status text not null default 'active' check(status in ('active','settled')),
 created_at timestamptz not null default now(),settled_at timestamptz,
 primary key(user_id,session_id),unique(session_id)
);
create unique index if not exists vault_bonus_one_active on public.vault_bonus_sessions(user_id,game_id) where status='active';
create table if not exists public.vault_bonus_events(
 user_id uuid not null,session_id uuid not null,event_key text not null,
 primary key(user_id,session_id,event_key),foreign key(user_id,session_id) references public.vault_bonus_sessions(user_id,session_id) on delete cascade
);
alter table public.vault_bonus_sessions enable row level security;
alter table public.vault_bonus_events enable row level security;
revoke all on public.vault_bonus_sessions,public.vault_bonus_events from public,anon,authenticated;
grant select on public.vault_bonus_sessions to authenticated;
drop policy if exists bonus_read_self on public.vault_bonus_sessions;
create policy bonus_read_self on public.vault_bonus_sessions for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.vault_bonus_capabilities() returns jsonb language sql stable set search_path='' as $$select '{"version":1}'::jsonb;$$;
revoke all on function public.vault_bonus_capabilities() from public,anon;
grant execute on function public.vault_bonus_capabilities() to authenticated;
create or replace function public.apply_bonus_checkpoint(p_action text,p_payload jsonb,p_session_id uuid,p_game_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;s public.vault_bonus_sessions;r jsonb;c jsonb:=p_payload->'p_checkpoint';rid uuid:=(p_payload->>'p_round_id')::uuid;key text;held numeric:=0;rev bigint;existing boolean;mirror jsonb;
begin
 if u is null or p_game_id not in ('slot','swamp','vault_heist','magnet','critter') or p_action not in ('begin','settle','critter','heist','magnet') or p_session_id is null or rid is null then raise exception 'Invalid bonus event';end if;
 if p_action in ('begin','settle') and p_payload->>'p_game_id' is distinct from p_game_id or p_action='critter' and p_game_id<>'critter' or p_action='heist' and p_game_id<>'vault_heist' or p_action='magnet' and p_game_id<>'magnet' then raise exception 'Bonus game mismatch';end if;
 select * into w from public.wallets where user_id=u for update;if not found then raise exception 'Wallet missing';end if;
 select * into s from public.vault_bonus_sessions where user_id=u and session_id=p_session_id;existing:=found;
 if existing and s.game_id<>p_game_id then raise exception 'Bonus identity mismatch';end if;
 key:=p_action||':'||rid::text||':'||coalesce(c->>'step','0');
 if exists(select 1 from public.vault_bonus_events where user_id=u and session_id=p_session_id and event_key=key) then return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);end if;
 if existing and s.status='settled' then raise exception 'Bonus already settled';end if;
 if not existing then
  if p_session_id<>rid then raise exception 'Bonus root missing';end if;
  if p_action='critter' and (c->'bonus' is null or c->'bonus'='null') or p_action='magnet' and coalesce((c->'bonus'->>'triggered')::boolean,false)=false or p_action='heist' and c->>'status'='SETTLED' and c->>'result'='base' then raise exception 'Bonus entitlement missing';end if;
  if p_action='settle' and (p_payload->'p_recovery'->(case when p_game_id='slot' then 'slotBonus' else 'swampBonus' end) is null or p_payload->'p_recovery'->(case when p_game_id='slot' then 'slotBonus' else 'swampBonus' end)='null') then raise exception 'Bonus checkpoint missing';end if;
 end if;
 rev:=case when existing then w.revision else (p_payload->>'p_expected_revision')::bigint end;
 if p_action='begin' then r:=public.begin_game_round(rid,p_game_id,(p_payload->>'p_bet')::numeric,rev,p_payload->'p_metadata',p_payload->'p_recovery');
 elsif p_action='settle' then r:=public.record_game_round(rid,p_game_id,(p_payload->>'p_bet')::numeric,(p_payload->>'p_payout')::numeric,(p_payload->>'p_multiplier')::numeric,p_payload->>'p_result',p_payload->'p_metadata',p_payload->>'p_status',p_payload->'p_recovery');if coalesce((p_payload->'p_metadata'->>'freeSpin')::boolean,false) then held:=(p_payload->>'p_payout')::numeric;end if;
 elsif p_action='critter' then r:=public.settle_critter_round(rid,rev,c);held:=greatest(0,(c->>'payout')::numeric-least((c->>'payout')::numeric,round((c->'base'->>'winX')::numeric*(c->>'bet')::numeric,6)));
 elsif p_action='heist' then r:=public.apply_heist_checkpoint(rid,(p_payload->>'p_previous_step')::integer,rev,c);if c->>'status'='SETTLED' then held:=(c->>'payout')::numeric;end if;
 elsif c->>'version'='2' then r:=public.apply_magnet_v2_checkpoint(rid,(p_payload->>'p_previous_step')::integer,rev,c);if c->>'status'='SETTLED' then held:=(c->>'payout')::numeric;end if;
 else r:=public.apply_magnet_checkpoint(rid,(p_payload->>'p_previous_step')::integer,rev,c);if c->>'status'='SETTLED' then held:=(c->>'payout')::numeric;end if;end if;
 if coalesce((r->>'duplicate')::boolean,false) then raise exception 'Legacy round already applied';end if;
 if not existing then insert into public.vault_bonus_sessions(user_id,session_id,game_id) values(u,p_session_id,p_game_id);end if;
 insert into public.vault_bonus_events values(u,p_session_id,key);
 update public.vault_bonus_sessions set held_win=held_win+held where user_id=u and session_id=p_session_id returning * into s;
 mirror:=jsonb_build_object('version',1,'id',s.session_id,'gameId',s.game_id,'status',s.status,'heldWin',s.held_win,'totalWin',s.held_win);
 -- Old RPC credit and escrow transfer are in one transaction; no intermediate credit is observable.
 update public.wallets set balance=balance-held,recovery=jsonb_set(recovery,'{bonusSessions}',coalesce(recovery->'bonusSessions','{}')||jsonb_build_object(p_game_id,mirror),true) where user_id=u returning * into w;
 return r||jsonb_build_object('balance',w.balance,'revision',w.revision,'bonusSession',mirror);
end $$;
revoke all on function public.apply_bonus_checkpoint(text,jsonb,uuid,text) from public,anon;
grant execute on function public.apply_bonus_checkpoint(text,jsonb,uuid,text) to authenticated;
create or replace function public.settle_bonus_session(p_session_id uuid,p_game_id text,p_expected_revision bigint,p_completion jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;s public.vault_bonus_sessions;c jsonb;terminal boolean:=false;mirror jsonb;
begin
 if u is null then raise exception 'Authentication required';end if;
 select * into w from public.wallets where user_id=u for update;
 select * into s from public.vault_bonus_sessions where user_id=u and session_id=p_session_id for update;
 if not found or s.game_id is distinct from p_game_id then raise exception 'Bonus session missing';end if;
 if s.status='settled' then return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);end if;
 if p_game_id='slot' then c:=w.recovery->'slotBonus';terminal:=c is not null and (c->>'freeSpins')::integer=0;
 elsif p_game_id='swamp' then c:=w.recovery->'swampBonus';terminal:=c->>'featureId'=p_session_id::text and c->>'phase'='complete';
 else c:=w.recovery->(case p_game_id when 'critter' then 'critterRound' when 'magnet' then 'magnetRound' else 'heistRound' end);terminal:=c->>'roundId'=p_session_id::text and c->>'status'='SETTLED';end if;
 if terminal is distinct from true then raise exception 'Bonus is not complete';end if;
 update public.vault_bonus_sessions set status='settled',settled_at=now() where user_id=u and session_id=p_session_id returning * into s;
 mirror:=jsonb_build_object('version',1,'id',s.session_id,'gameId',s.game_id,'status',s.status,'heldWin',s.held_win,'totalWin',s.held_win);
 update public.wallets set balance=balance+s.held_win,revision=revision+1,recovery=jsonb_set(recovery,'{bonusSessions}',coalesce(recovery->'bonusSessions','{}')||jsonb_build_object(p_game_id,mirror),true),updated_at=now() where user_id=u returning * into w;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'bonusSession',mirror);
end $$;
revoke all on function public.settle_bonus_session(uuid,text,bigint,jsonb) from public,anon;
grant execute on function public.settle_bonus_session(uuid,text,bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
