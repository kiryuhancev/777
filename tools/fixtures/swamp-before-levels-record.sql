CREATE OR REPLACE FUNCTION public.record_game_round(p_round_id uuid, p_game_id text, p_bet numeric, p_payout numeric, p_multiplier numeric, p_result text, p_metadata jsonb DEFAULT '{}'::jsonb, p_status text DEFAULT 'settled'::text, p_recovery jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();w public.wallets;r public.game_rounds;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_round_id is null or p_game_id is null or p_game_id not in ('slot','poker','bird','blackjack','baccarat','swamp','mines') or p_bet is null or p_bet<0 or p_status is null or p_payout is null or p_payout<0 or p_payout>1000000000000 or p_multiplier is null or p_multiplier<0
   or p_multiplier>1000000000000 or p_result is null or length(p_result)>200 or p_status not in ('settled','cancelled') then raise exception 'Invalid settlement';end if;
 perform public.vault_validate_payload(p_metadata,p_recovery);
 select * into w from public.wallets where user_id=u for update;
 select * into r from public.game_rounds where round_id=p_round_id and user_id=u for update;
 if not found or r.game_id<>p_game_id then raise exception 'Round missing or mismatch';end if;
 if r.status<>'started' then
  if r.bet<>round(p_bet,6) then raise exception 'Round missing or mismatch';end if;
  if r.payout<>round(p_payout,6) or r.status<>p_status then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',true,'status',r.status);
 end if;
 if p_game_id='mines' then
  perform public.vault_mines_multiplier(p_metadata->'mines');
  if not public.vault_mines_extends(r.metadata->'mines',p_metadata->'mines')
   or p_metadata->'mines'->>'status' not in ('CASHED_OUT','BUST')
   or p_status<>'settled' or p_recovery->'minesRound' is distinct from p_metadata->'mines'
   or (p_metadata->'mines'->>'payout')::numeric<>round(p_payout,6) then
    raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';
  end if;
 end if;
 -- DOUBLE adds exactly one original stake. Its debit joins the final wallet/round transaction.
 -- Client demo outcomes remain client-authoritative; no direct wallet write grant is added.
 if r.bet<>round(p_bet,6) then
  if p_game_id<>'blackjack' or p_bet<>r.bet*2 or p_metadata->>'doubled' is distinct from 'true' then raise exception 'Round missing or mismatch';end if;
  if not public.vault_game_access() then raise exception 'VAULT_ACCOUNT_DISABLED';end if;
  if w.balance<p_bet-r.bet then raise exception using message='VAULT_WALLET_CONFLICT',errcode='P0001';end if;
  update public.wallets set balance=balance-(p_bet-r.bet) where user_id=u;
  r.bet:=round(p_bet,6);
 end if;
 update public.game_rounds set bet=r.bet,payout=round(p_payout,6),multiplier=round(p_multiplier,6),result=p_result,metadata=metadata||p_metadata,status=p_status,settled_at=now() where round_id=p_round_id;
 update public.wallets set balance=balance+round(p_payout,6),revision=revision+1,recovery=case when p_game_id='slot' then recovery||jsonb_build_object('slotBonus',p_recovery->'slotBonus') when p_game_id='swamp' then recovery||jsonb_build_object('swampBonus',p_recovery->'swampBonus') when p_game_id='mines' then recovery||jsonb_build_object('minesRound',p_recovery->'minesRound') else recovery end,updated_at=now() where user_id=u returning * into w;
 insert into public.game_stats(user_id,game_id,rounds_played,total_wagered,total_won,biggest_win,biggest_multiplier)
 values(u,p_game_id,1,r.bet,round(p_payout,6),round(p_payout,6),round(p_multiplier,6))
 on conflict(user_id,game_id) do update set rounds_played=public.game_stats.rounds_played+1,
 total_wagered=public.game_stats.total_wagered+excluded.total_wagered,total_won=public.game_stats.total_won+excluded.total_won,
 biggest_win=greatest(public.game_stats.biggest_win,excluded.biggest_win),biggest_multiplier=greatest(public.game_stats.biggest_multiplier,excluded.biggest_multiplier),updated_at=now();
 update public.profiles set xp=xp+10,level=1+(xp+10)/1000 where id=u;
 return jsonb_build_object('balance',w.balance,'revision',w.revision,'duplicate',false,'status',p_status);
end $function$

