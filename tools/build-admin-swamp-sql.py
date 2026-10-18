"""Compose one repeat-safe update for existing installations, including pending MINES enablement."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
base=(root/'supabase_mines.sql').read_text()
admin=(root/'admin/schema.sql').read_text()
s=base.replace('-- VAULT MINES incremental update. Run the ENTIRE file, from BEGIN through COMMIT.','-- VAULT admin + Swamp controls update (includes MINES). Execute this ENTIRE file, BEGIN through COMMIT.')
s=s.replace('begin;\n','begin;\n'+admin+'\n',1)
s=s.replace(" if exists(select 1 from public.game_rounds where user_id=u and game_id=p_game_id and status='started')", " if not public.vault_game_access() and not (p_bet=0 and ((p_game_id='slot' and coalesce((w.recovery->'slotBonus'->>'freeSpins')::integer,0)>0) or (p_game_id='swamp' and coalesce(p_metadata->>'freeSpin'='true',false) and coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)>0))) then raise exception 'VAULT_ACCOUNT_DISABLED';end if;\n if exists(select 1 from public.game_rounds where user_id=u and game_id=p_game_id and status='started')",1)
s=s.replace(" end if;\n if p_game_id='mines' then\n  perform", """ end if;
 if p_game_id='swamp' and p_metadata ? 'purchaseType' then
  if p_metadata->>'purchaseType' not in ('bonus','super') or coalesce((p_metadata->>'purchaseStake')::numeric,0)<=0
   or (p_metadata->>'purchaseCostX')::numeric is distinct from (case p_metadata->>'purchaseType' when 'bonus' then 77 else 350 end)::numeric
   or p_bet<>round((p_metadata->>'purchaseStake')::numeric*(p_metadata->>'purchaseCostX')::numeric,6)
   or (p_recovery->'swampBonus'->>'bet')::numeric is distinct from (p_metadata->>'purchaseStake')::numeric
   or p_recovery->'swampBonus'->>'featureId' is distinct from p_round_id::text
   or (p_recovery->'swampBonus'->>'remaining')::int is distinct from (case p_metadata->>'purchaseType' when 'bonus' then 10 else 20 end)
   or (p_recovery->'swampBonus'->>'collectors')::int is distinct from 0
   or (p_recovery->'swampBonus'->>'tier')::int is distinct from 0
   or (p_recovery->'swampBonus'->>'spinsPlayed')::int is distinct from 0
   or (p_recovery->'swampBonus'->>'totalWinX')::numeric is distinct from 0 then raise exception 'Invalid swamp purchase';end if;
 end if;
 if p_game_id='mines' then
  perform""",1)
s=s.replace("  if w.balance<p_bet-r.bet then", "  if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;\n  if w.balance<p_bet-r.bet then")
s=s.replace("select jsonb_build_object('version',1); $$;", "select jsonb_build_object('version',2,'purchaseVersion',1,'siteAdminVersion',1); $$;")
# One self-contained human-copyable script, never a fragment that starts with OR.
(root/'supabase_admin_swamp.sql').write_text(s);(root/'supabase_admin_swamp.txt').write_text(s)
full=(root/'supabase_schema.sql').read_text()
# Keep this generator idempotent: shared functions are refreshed; admin DDL is a marked block.
full=re.sub(r'-- BEGIN VAULT ADMIN SCHEMA[\s\S]*?-- END VAULT ADMIN SCHEMA\n?','',full)
full+='\n-- BEGIN VAULT ADMIN SCHEMA\n'+admin+'\n-- END VAULT ADMIN SCHEMA\n'
for function in ['begin_game_round','record_game_round']:
 pattern=rf'create or replace function public.{function}\([\s\S]*?end \$\$;'
 body=re.search(pattern,s)[0];full=re.sub(pattern,lambda _:body,full)
full=re.sub(r'create or replace function public.swamp_slot_capabilities\(\)[\s\S]*?\$\$;',re.search(r'create or replace function public.swamp_slot_capabilities\(\)[\s\S]*?\$\$;',s)[0],full)
(root/'supabase_schema.sql').write_text(full)
print('Built complete admin + Swamp + MINES migration')
