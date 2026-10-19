"""Additive upgrade: preserve all existing round UUIDs, feature checkpoints and grants."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
base=(root/'supabase_heist.sql').read_text();a=base.index('create or replace function public.apply_heist_checkpoint(');b=base.index('revoke all on function public.apply_heist_checkpoint',a);s=base[a:b]
s=s.replace('v_bet numeric;pay numeric;', 'v_bet numeric;v_cost numeric;expected_cost numeric;pay numeric;')
s=s.replace("if c->>'version' is distinct from '1'", "if c->>'version' is null or c->>'version' not in ('1','2')")
needle=' select * into w from public.wallets where user_id=u for update;'
mode=""" -- Version 1 checkpoints remain valid. Version 2 freezes stake, paid cost and mode.
 v_cost:=v_bet;
 if c->>'version'='2' then
  if not c ?& array['cost','purchaseType','scatterBoost'] or jsonb_typeof(c->'scatterBoost')<>'boolean' then raise exception 'Invalid Heist mode';end if;
  if c->>'purchaseType' is not null then
   if c->>'purchaseType' not in ('heist','super') or c->>'scatterBoost'<>'false' then raise exception 'Invalid Heist purchase';end if;
   expected_cost:=round(v_bet*case c->>'purchaseType' when 'heist' then 31.5 else 79 end,6);
   if bw<>0 then raise exception 'Purchased Heist cannot pay base win';end if;
  else expected_cost:=round(v_bet*case when c->>'scatterBoost'='true' then 1.5 else 1 end,6);end if;
  v_cost:=(c->>'cost')::numeric;
  if v_cost is null or v_cost is distinct from expected_cost then raise exception 'Invalid Heist cost';end if;
 elsif c ? 'cost' or c ? 'purchaseType' or c ? 'scatterBoost' then raise exception 'Invalid legacy Heist mode';end if;
"""
s=s.replace(needle,mode+needle)
s=s.replace("if not public.vault_game_access()", "if c->>'purchaseType' is not null and (terminal or loot is distinct from case c->>'purchaseType' when 'heist' then 23 else 70 end::numeric) then raise exception 'Invalid purchased Heist start';end if;\n  if not public.vault_game_access()")
s=s.replace('w.balance<v_bet','w.balance<v_cost').replace("values(p_round_id,u,'vault_heist',v_bet,", "values(p_round_id,u,'vault_heist',v_cost,").replace('balance=balance-v_bet','balance=balance-v_cost')
s=s.replace('or v_bet<>r.bet or bw<>', "or v_bet is distinct from (prev->>'bet')::numeric or c->'version' is distinct from prev->'version' or c->'cost' is distinct from prev->'cost' or c->'purchaseType' is distinct from prev->'purchaseType' or c->'scatterBoost' is distinct from prev->'scatterBoost' or bw<>")
s=s.replace("'heist',c,'baseWin',bw", "'heist',c,'purchaseType',c->'purchaseType','scatterBoost',coalesce((c->>'scatterBoost')::boolean,false),'baseBet',v_bet,'cost',v_cost,'baseWin',bw")
s=s.replace("values(u,'vault_heist',1,v_bet,pay", "values(u,'vault_heist',1,v_cost,pay")
old=(root/'supabase_admin_swamp.sql').read_text();a=old.index('create or replace function public.begin_game_round(');b=old.index('-- Idempotent finalization',a);begin=old[a:b]
needle=" if p_game_id='mines' then"
validation=""" if p_game_id='swamp' and p_metadata->>'scatterBoost'='true' then
  if p_metadata->>'freeSpin'='true' or p_metadata ? 'purchaseType' or coalesce((p_metadata->>'baseBet')::numeric,0)<=0
   or p_bet is distinct from round((p_metadata->>'baseBet')::numeric*1.5,6) then raise exception 'Invalid Swamp Scatter Boost cost';end if;
 end if;
"""
begin=begin.replace(needle,validation+needle)
text="""-- VAULT slot controls / Heist purchases / Scatter Boost upgrade.
-- Run this ENTIRE file after the existing VAULT HEIST migration. No rows/balances are reset.
begin;
"""+s+begin+"""
create or replace function public.heist_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',2,'purchaseVersion',1,'boostVersion',1); $$;
create or replace function public.swamp_slot_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('version',2,'purchaseVersion',1,'siteAdminVersion',1,'boostVersion',1); $$;
revoke all on function public.heist_capabilities(),public.swamp_slot_capabilities(),public.apply_heist_checkpoint(uuid,integer,bigint,jsonb),public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb) from public,anon;
grant execute on function public.heist_capabilities(),public.swamp_slot_capabilities(),public.apply_heist_checkpoint(uuid,integer,bigint,jsonb),public.begin_game_round(uuid,text,numeric,bigint,jsonb,jsonb) to authenticated;
commit;
"""
(root/'supabase_slot_features.sql').write_text(text);(root/'supabase_slot_features.txt').write_text(text)
p=root/'supabase_schema.sql';schema=p.read_text();marker='-- BEGIN SLOT FEATURES UPGRADE';schema=schema.split(marker)[0].rstrip();p.write_text(schema+'\n\n'+marker+'\n'+text+'-- END SLOT FEATURES UPGRADE\n')
