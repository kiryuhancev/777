CREATE OR REPLACE FUNCTION public.begin_game_round(p_round_id uuid, p_game_id text, p_bet numeric, p_expected_revision bigint, p_metadata jsonb DEFAULT '{}'::jsonb, p_recovery jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird','blackjack','baccarat','swamp','mines') or p_bet is null or p_bet<0 or p_bet>1000000000000 then raise exception 'Invalid round';end if;
 perform public.vault_validate_payload(p_metadata,p_recovery);
 select * into w from public.wallets where user_id=u for update;
 if not found then raise exception 'Wallet missing';end if;
 select * into r from public.game_rounds where round_id=p_round_id;
 if found then
  if r.user_id<>u or r.game_id<>p_game_id or r.bet<>round(p_bet,6) then raise exception 'Round mismatch';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true,'status',r.status);
 end if;
 if not public.vault_game_access() and not (p_bet=0 and ((p_game_id='slot' and coalesce((w.recovery->'slotBonus'->>'freeSpins')::integer,0)>0) or (p_game_id='swamp' and coalesce(p_metadata->>'freeSpin'='true',false) and coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)>0))) then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
 if exists(select 1 from public.game_rounds where user_id=u and game_id=p_game_id and status='started') then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 -- Free-spin entitlements cannot be reused across tabs/devices by rebasing a stale queue.
 if p_game_id='swamp' then
  if p_metadata->>'freeSpin'='true' then
   if p_bet<>0 or coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)<1
    or p_metadata->>'featureId' is distinct from w.recovery->'swampBonus'->>'featureId'
    or (p_metadata->>'freeSpinIndex')::integer is distinct from (w.recovery->'swampBonus'->>'spinsPlayed')::integer+1
    or (p_recovery->'swampBonus'->>'remaining')::integer is distinct from (w.recovery->'swampBonus'->>'remaining')::integer-1
    or (p_recovery->'swampBonus'->>'spinsPlayed')::integer is distinct from (w.recovery->'swampBonus'->>'spinsPlayed')::integer+1
    or p_recovery->'swampBonus'->>'featureId' is distinct from w.recovery->'swampBonus'->>'featureId'
    or (p_recovery->'swampBonus'->>'bet')::numeric is distinct from (w.recovery->'swampBonus'->>'bet')::numeric
    or p_recovery->'swampBonus'->>'collectors' is distinct from w.recovery->'swampBonus'->>'collectors'
    or p_recovery->'swampBonus'->>'tier' is distinct from w.recovery->'swampBonus'->>'tier'
    or (p_recovery->'swampBonus'->>'totalWinX')::numeric is distinct from (w.recovery->'swampBonus'->>'totalWinX')::numeric
   then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  elsif p_bet<=0 or coalesce((w.recovery->'swampBonus'->>'remaining')::integer,0)>0 then
   raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';
  end if;
 end if;
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
 if p_game_id='swamp' and p_metadata->>'scatterBoost'='true' then
  if p_metadata->>'freeSpin'='true' or p_metadata ? 'purchaseType' or coalesce((p_metadata->>'baseBet')::numeric,0)<=0
   or p_bet is distinct from round((p_metadata->>'baseBet')::numeric*1.5,6) then raise exception 'Invalid Swamp Scatter Boost cost';end if;
 end if;
 if p_game_id='mines' then
  perform public.vault_mines_multiplier(p_metadata->'mines');
  if p_bet<=0 or p_metadata->'mines'->>'status'<>'PLAYING' or jsonb_array_length(p_metadata->'mines'->'opened')<>0
   or (p_metadata->'mines'->>'roundId')::uuid<>p_round_id or (p_metadata->'mines'->>'bet')::numeric<>round(p_bet,6)
   or p_recovery->'minesRound' is distinct from p_metadata->'mines' then raise exception 'Invalid Mines start';end if;
 end if;
 if p_expected_revision is null or w.revision<>p_expected_revision then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 if w.balance<p_bet then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
 insert into public.game_rounds(round_id,user_id,game_id,bet,metadata) values(p_round_id,u,p_game_id,round(p_bet,6),p_metadata);
 update public.wallets set balance=balance-round(p_bet,6),revision=revision+1,recovery=case when p_game_id='slot' then recovery||jsonb_build_object('slotBonus',p_recovery->'slotBonus') when p_game_id='swamp' then recovery||jsonb_build_object('swampBonus',p_recovery->'swampBonus') when p_game_id='mines' then recovery||jsonb_build_object('minesRound',p_recovery->'minesRound') else recovery end,updated_at=now() where user_id=u returning * into w;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false,'status','started');
end $function$

