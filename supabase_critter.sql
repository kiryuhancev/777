-- Critter Chaos v2 persistent Wild update. Run this WHOLE file on the existing VAULT database.
-- No existing account, wallet, game outcome or auth setting is reset.
begin;
alter table public.game_stats drop constraint if exists game_stats_game_id_check;
alter table public.game_stats add constraint game_stats_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
alter table public.game_rounds drop constraint if exists game_rounds_game_id_check;
alter table public.game_rounds add constraint game_rounds_game_id_check check(game_id in ('slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
alter table public.user_settings drop constraint if exists user_settings_last_game_id_check;
alter table public.user_settings add constraint user_settings_last_game_id_check check(last_game_id in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'));
create or replace function public.critter_capabilities() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('version',2);$$;
revoke all on function public.critter_capabilities() from public,anon;
grant execute on function public.critter_capabilities() to authenticated;
create or replace function public.settle_critter_round(p_round_id uuid,p_expected_revision bigint,p_checkpoint jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;c jsonb:=p_checkpoint;p jsonb;g jsonb;cell jsonb;s jsonb;win jsonb;idx integer;
 stake numeric;pay numeric;total numeric;computed numeric;base_win numeric;bonus_win numeric:=0;triggered boolean;sc integer;sum_win numeric;sum_raw numeric;step_win numeric;win_value numeric;bonus jsonb;plans jsonb[];v2 boolean;spin_plan jsonb;previous_grid jsonb;expected_multiplier numeric;pos integer;wild_cell jsonb;counts jsonb;expected_count integer;pay_rows jsonb;raw_expected numeric;size_index integer;
begin
 if u is null then raise exception 'Authentication required';end if;
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>2097152 or not c ?& array['version','roundId','gameId','seed','bet','status','base','bonus','winX','payout','result'] then raise exception 'Invalid Critter checkpoint';end if;
 stake:=(c->>'bet')::numeric;pay:=(c->>'payout')::numeric;total:=(c->>'winX')::numeric;bonus:=c->'bonus';triggered:=bonus<>'null'::jsonb;
 if coalesce(c->>'version','') not in ('1','2') or c->>'gameId' is distinct from 'critter' or c->>'status' is distinct from 'SETTLED' or (c->>'roundId')::uuid is distinct from p_round_id
  or (c->>'seed')::bigint is null or (c->>'seed')::bigint not between 0 and 4294967295
  or stake is null or stake<=0 or stake>1000000000 or stake::text in ('NaN','Infinity','-Infinity')
  or pay is null or pay<0 or pay>10000*stake or pay::text in ('NaN','Infinity','-Infinity')
  or total is null or total<0 or total>10000 or total::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid Critter values';end if;
 v2:=c->>'version'='2';plans:=array[c->'base'];
 if triggered then
  if v2 then
   if jsonb_typeof(bonus->'spins') is distinct from 'array' or jsonb_array_length(bonus->'spins')<>(case when (c->'base'->>'scatters')::integer>=4 then 20 else 10 end) or (bonus->>'spinCount')::integer is distinct from (case when (c->'base'->>'scatters')::integer>=4 then 20 else 10 end) or bonus->>'kind' is distinct from (case when (c->'base'->>'scatters')::integer>=4 then 'super' else 'normal' end) then raise exception 'Invalid persistent Wild bonus';end if;
   previous_grid:=null;
   for spin_plan in select value from jsonb_array_elements(bonus->'spins') loop
    if jsonb_typeof(spin_plan->'initialGrid') is distinct from 'array' or jsonb_array_length(spin_plan->'initialGrid')<>25 then raise exception 'Invalid bonus grid';end if;
    if previous_grid is not null then
     for pos in 0..24 loop
      if previous_grid->pos->>'symbol'='wild' and spin_plan->'initialGrid'->pos->>'symbol' is distinct from 'wild' then raise exception 'Lost persistent Wild';end if;
     end loop;
    end if;
    previous_grid:=spin_plan->'finalGrid';plans:=array_append(plans,spin_plan);
   end loop;
   if bonus->'persistentWilds' is distinct from (select coalesce(jsonb_agg(n-1 order by n),'[]'::jsonb) from jsonb_array_elements(previous_grid) with ordinality as t(v,n) where v->>'symbol'='wild') then raise exception 'Invalid persistent Wild positions';end if;
  else plans:=array_append(plans,bonus->'plan');end if;
 end if;
 foreach p in array plans loop
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'steps') is distinct from 'array' or jsonb_array_length(p->'steps')>12 then raise exception 'Invalid Critter plan';end if;
  foreach g in array array[p->'initialGrid',p->'finalGrid'] loop
   if jsonb_typeof(g) is distinct from 'array' or jsonb_array_length(g)<>25 or (select count(distinct (v->>'uid')::integer) from jsonb_array_elements(g) v)<>25 then raise exception 'Invalid Critter grid';end if;
   for cell in select value from jsonb_array_elements(g) loop
    if not cell ?& array['uid','symbol'] or (cell->>'uid')::integer is null or (cell->>'uid')::integer not between 0 and 9999 or cell->>'symbol' is null or cell->>'symbol' not in ('ten','jack','king','ace','cat','pigeon','possum','bulldog','wild','scatter') then raise exception 'Invalid Critter symbol';end if;
   end loop;
  end loop;
  sum_win:=0;sum_raw:=0;counts:='{}'::jsonb;
  if v2 then
   for cell in select value from jsonb_array_elements(p->'initialGrid') where value->>'symbol'='wild' loop
    if (cell->>'multiplier')::integer is distinct from 1 then raise exception 'Wild must start at x1';end if;
   end loop;
  end if;
  for s,idx in select value,(ordinality-1)::integer from jsonb_array_elements(p->'steps') with ordinality loop
   if (s->>'index')::integer is distinct from idx or jsonb_typeof(s->'wins') is distinct from 'array' or jsonb_array_length(s->'wins') not between 1 and 40 or jsonb_typeof(s->'grid') is distinct from 'array' or jsonb_array_length(s->'grid')<>25 then raise exception 'Invalid Critter cascade';end if;
   if idx=0 and s->'grid' is distinct from p->'initialGrid' then raise exception 'Invalid Critter initial cascade';end if;
   if idx>0 and s->'grid' is distinct from p->'steps'->(idx-1)->'nextGrid' then raise exception 'Invalid Critter cascade prefix';end if;
   if jsonb_typeof(s->'moves') is distinct from 'array' or jsonb_array_length(s->'moves')>25 then raise exception 'Invalid Critter running wilds';end if;
   if (select count(distinct v->>'uid') from jsonb_array_elements(s->'moves') v)<>jsonb_array_length(s->'moves') then raise exception 'Duplicate Critter Wild movement';end if;
   step_win:=0;
   if v2 then
    for cell in select value from jsonb_array_elements(s->'grid') where value->>'symbol'='wild' loop
     if (cell->>'multiplier')::numeric is distinct from coalesce((counts->>(cell->>'uid'))::numeric,1) then raise exception 'Invalid Wild multiplier progression';end if;
    end loop;
   end if;
   for win in select value from jsonb_array_elements(s->'wins') loop
    win_value:=(win->>'winX')::numeric;expected_multiplier:=1;
    if v2 then
     if jsonb_typeof(win->'positions') is distinct from 'array' then raise exception 'Invalid cluster positions';end if;
     if (select count(distinct value::integer) from jsonb_array_elements_text(win->'positions'))<>jsonb_array_length(win->'positions') then raise exception 'Duplicate cluster position';end if;
     for pos in select value::integer from jsonb_array_elements_text(win->'positions') loop
      if pos not between 0 and 24 then raise exception 'Invalid cluster position';end if;
      wild_cell:=s->'grid'->pos;
      if wild_cell->>'symbol'='wild' then expected_multiplier:=greatest(expected_multiplier,(wild_cell->>'multiplier')::numeric);
      elsif wild_cell->>'symbol' is distinct from win->>'symbol' then raise exception 'Wrong cluster symbol';end if;
     end loop;
     if (win->>'multiplier')::numeric is distinct from expected_multiplier then raise exception 'Invalid cluster multiplier';end if;
     pay_rows:='{"ten":[0.2,0.3,0.45,0.65,0.9,1.4,3],"jack":[0.25,0.4,0.55,0.8,1.2,1.8,4],"king":[0.3,0.45,0.7,1,1.5,2.2,5],"ace":[0.4,0.6,0.9,1.3,1.8,2.8,6],"cat":[0.6,0.9,1.3,1.8,2.5,4,8],"pigeon":[0.8,1.2,1.7,2.5,3.5,5,10],"possum":[1,1.5,2.2,3,4.5,7,15],"bulldog":[1.5,2.2,3,4.5,6,10,25],"wild":[1.5,2.2,3,4.5,6,10,25]}'::jsonb;
     size_index:=case when (win->>'size')::integer>=15 then 6 when (win->>'size')::integer>=10 then 5 else (win->>'size')::integer-5 end;
     raw_expected:=(pay_rows->(win->>'symbol')->>size_index)::numeric;
     if raw_expected is null or (win->>'rawWinX')::numeric is distinct from raw_expected then raise exception 'Invalid Critter paytable';end if;
    end if;
    if (win->>'size')::integer is null or (win->>'size')::integer not between 5 and 25 or jsonb_typeof(win->'positions') is distinct from 'array' or jsonb_array_length(win->'positions')<>(win->>'size')::integer
     or win_value is null or win_value<0 or win_value>1000000 or win_value::text in ('NaN','Infinity','-Infinity') or win_value is distinct from round(round((win->>'rawWinX')::numeric*(case when v2 then 0.000699792925918 else 3.7256 end),6)*expected_multiplier,6) then raise exception 'Invalid Critter cluster';end if;
    step_win:=step_win+win_value;
   end loop;
   if (s->>'winX')::numeric is distinct from round(step_win,6) or (s->>'rawWinX')::numeric is null or (s->>'rawWinX')::numeric<0 then raise exception 'Invalid Critter cascade payout';end if;
   if v2 then
    for cell in select distinct s->'grid'->(v.value::integer) from jsonb_array_elements(s->'wins') as award(value) cross join lateral jsonb_array_elements_text(award.value->'positions') v where s->'grid'->(v.value::integer)->>'symbol'='wild' loop
     counts:=jsonb_set(counts,array[cell->>'uid'],to_jsonb((cell->>'multiplier')::numeric*2));
    end loop;
    if p is distinct from c->'base' and jsonb_array_length(s->'moves')<>0 then raise exception 'Bonus Wild cannot run';end if;
    if s->'nextGrid'<>'null'::jsonb then
     for cell in select value from jsonb_array_elements(s->'nextGrid') where value->>'symbol'='wild' loop
      if (cell->>'multiplier')::numeric is distinct from coalesce((counts->>(cell->>'uid'))::numeric,1) then raise exception 'Invalid next Wild multiplier';end if;
     end loop;
     if p is distinct from c->'base' then
      for pos in 0..24 loop
       if s->'grid'->pos->>'symbol'='wild' and s->'nextGrid'->pos->>'symbol' is distinct from 'wild' then raise exception 'Bonus Wild moved';end if;
      end loop;
     end if;
    end if;
   end if;
   sum_win:=sum_win+step_win;sum_raw:=sum_raw+(s->>'rawWinX')::numeric;
  end loop;
  if (p->>'winX')::numeric is distinct from round(sum_win,6) or (p->>'rawWinX')::numeric is distinct from round(sum_raw,6) then raise exception 'Invalid Critter plan payout';end if;
  if jsonb_array_length(p->'steps')=0 then
   if p->'initialGrid' is distinct from p->'finalGrid' then raise exception 'Invalid Critter empty plan';end if;
  else
   s:=p->'steps'->(jsonb_array_length(p->'steps')-1);
   if p->'finalGrid' is distinct from (case when s->'nextGrid'='null'::jsonb then s->'grid' else s->'nextGrid' end) then raise exception 'Invalid Critter final grid';end if;
  end if;
 end loop;
 select count(*) into sc from jsonb_array_elements(c->'base'->'finalGrid') v where v->>'symbol'='scatter';
 if (c->'base'->>'scatters')::integer is distinct from sc or triggered is distinct from (sc>=3) then raise exception 'Invalid Critter bonus trigger';end if;
 if triggered and not v2 then
  if (bonus->>'cashX')::numeric is null or (bonus->>'cashX')::numeric not in (2,5,10,25) or (bonus->>'extraWilds')::integer is null or (bonus->>'extraWilds')::integer not in (3,4,5)
   or (bonus->>'multiplier')::integer is null or (bonus->>'multiplier')::integer not in (2,3,5) or (bonus->'plan'->>'scatters')::integer is distinct from 0 then raise exception 'Invalid Dumpster Dash';end if;
  bonus_win:=round(((bonus->>'cashX')::numeric+(bonus->'plan'->>'winX')::numeric)*(bonus->>'multiplier')::numeric,6);
  if (bonus->>'winX')::numeric is distinct from bonus_win then raise exception 'Invalid Dumpster payout';end if;
 end if;
 if triggered and v2 then
  select round(sum((value->>'winX')::numeric),6) into bonus_win from jsonb_array_elements(bonus->'spins');
  if (bonus->>'winX')::numeric is distinct from bonus_win or exists(select 1 from jsonb_array_elements(bonus->'spins') v where (v->>'scatters')::integer is distinct from 0) then raise exception 'Invalid persistent bonus payout';end if;
 end if;
 computed:=round(least(10000,(c->'base'->>'winX')::numeric+bonus_win),6);
 if total is distinct from computed or pay is distinct from round(total*stake,6) then raise exception 'Invalid Critter settlement';end if;
 select * into w from public.wallets where user_id=u for update;if not found then raise exception 'Wallet missing';end if;
 select * into r from public.game_rounds where round_id=p_round_id and user_id=u;
 if found then
  if r.game_id<>'critter' or r.status<>'settled' or r.metadata->'critter' is distinct from c then raise exception 'VAULT_WALLET_CONFLICT';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true);
 end if;
 if w.revision is distinct from p_expected_revision or w.balance<stake or exists(select 1 from public.game_rounds where round_id=p_round_id) then raise exception 'VAULT_WALLET_CONFLICT';end if;
 if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
 insert into public.game_rounds(round_id,user_id,game_id,bet,payout,multiplier,result,status,metadata,settled_at)
 values(p_round_id,u,'critter',stake,pay,total,c->>'result','settled',jsonb_build_object('critter',c,'seed',c->'seed','dumpsterDash',triggered),now());
 update public.wallets set balance=balance-stake+pay,revision=revision+1,recovery=recovery||jsonb_build_object('critterRound',c),updated_at=now() where user_id=u returning * into w;
 insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier) values(u,'critter',1,stake,pay,pay,total)
 on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
 update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false);
end $$;
revoke all on function public.settle_critter_round(uuid,bigint,jsonb) from public,anon;
grant execute on function public.settle_critter_round(uuid,bigint,jsonb) to authenticated;
-- Settings function keeps its existing timestamp semantics; add only the new screen ID.
create or replace function public.save_vault_settings(p_settings jsonb,p_updated_at timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.user_settings;
begin
 if u is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_settings)<>'object' or octet_length(p_settings::text)>4096 or p_updated_at is null then raise exception 'Invalid settings';end if;
 select * into s from public.user_settings where user_id=u for update;
 if p_updated_at<=s.updated_at then return to_jsonb(s);end if;
 update public.user_settings set sound_enabled=coalesce((p_settings->>'sound')::boolean,s.sound_enabled),music_enabled=coalesce((p_settings->>'music')::boolean,s.music_enabled),fast_mode=coalesce((p_settings->>'fastGame')::boolean,s.fast_mode),
 fast_bonus=coalesce((p_settings->>'fastBonus')::boolean,s.fast_bonus),scatter_boost=coalesce((p_settings->>'scatterBoost')::boolean,s.scatter_boost),
 last_game_id=case when p_settings->>'lastGame' in ('lobby','slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter') then p_settings->>'lastGame' else s.last_game_id end,
 selected_bets=coalesce(p_settings->'bets',s.selected_bets),updated_at=least(p_updated_at,clock_timestamp()) where user_id=u returning * into s;
 return to_jsonb(s);
end $$;
notify pgrst, 'reload schema';
commit;
