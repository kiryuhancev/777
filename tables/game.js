/* Shared presentation adapter, independent rule/state machines. No direct database calls. */
const VaultTables=window.VaultTables=(()=>{
 const ids=['blackjack','baccarat'];
 const format=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:6});
 const states=Object.fromEntries(ids.map(id=>[id,{phase:'IDLE',betIndex:2,betType:'PLAYER',player:[],dealer:[],deck:[],baseBet:0,totalBet:0,roundId:null,revealed:false,result:'',doubled:false,generation:0}]));
 const node=(id,key)=>document.getElementById(`${id}-${key}`);
 const idle=s=>['IDLE','RESULT'].includes(s.phase);
 const wait=()=>new Promise(r=>setTimeout(r,state.fastGame?40:140));
 const bet=id=>BETS[states[id].betIndex];
 function renderHand(container,cards,hiddenIndex=-1){
  cards.forEach((card,i)=>{const hidden=i===hiddenIndex,key=`${i}:${card.id||card.label+card.suit}:${hidden?'back':'face'}`,old=container.children[i];if(old?.dataset.cardKey===key)return;
   const holder=document.createElement('div');holder.innerHTML=hidden?'<div class="dealer-hidden" role="img" aria-label="Hidden dealer card">VAULT</div>':renderPlayingCard(card);const next=holder.firstElementChild;next.dataset.cardKey=key;
   if(old){if(old.classList.contains('dealer-hidden')&&!hidden)next.classList.add('table-revealed');old.replaceWith(next);}else container.append(next);
  });while(container.children.length>cards.length)container.lastElementChild.remove();
 }
 function render(id){
  const s=states[id],bj=id==='blackjack',ready=idle(s),turn=s.phase==='PLAYER_TURN';
  renderHand(node(id,'player'),s.player);
  renderHand(node(id,'dealer'),s.dealer,bj&&!s.revealed?1:-1);
  const value=cards=>bj?(TABLE_RULES.getBlackjackHandValue(cards).blackjack?'BLACKJACK':`${TABLE_RULES.getBlackjackHandValue(cards).soft?'SOFT ':''}${TABLE_RULES.getBlackjackHandValue(cards).total}`):String(TABLE_RULES.getBaccaratHandTotal(cards));
  node(id,'playerTotal').textContent=s.player.length?value(s.player):'—';
  node(id,'dealerTotal').textContent=s.dealer.length?value(bj&&!s.revealed?s.dealer.slice(0,1):s.dealer):'—';
  node(id,'bet').textContent=format(bet(id));node(id,'totalBet').textContent=s.totalBet?`TOTAL BET ${format(s.totalBet)}`:'';
  node(id,'status').textContent=s.result|| (ready?bj?'BLACKJACK PAYS 3:2 · DEALER STANDS ON SOFT 17':`SELECTED: ${s.betType}`:turn?'HIT, STAND OR DOUBLE':'DEALING…');
  node(id,'deal').hidden=!ready;node(id,'deal').disabled=!ready||bet(id)>state.balance||!window.VaultRoundService?.tableSupport;
  node(id,'deal').textContent=`${s.phase==='RESULT'?'DEAL AGAIN':'DEAL'} · ${format(bet(id))}`;
  for(const key of ['minus','plus','max'])node(id,key).disabled=!ready;
  if(bj){node(id,'hit').hidden=!turn;node(id,'stand').hidden=!turn;node(id,'double').hidden=!turn||s.player.length!==2||!BLACKJACK_CONFIG.allowDouble;node(id,'double').disabled=s.baseBet>state.balance;}
  else for(const button of node(id,'zones').querySelectorAll('button')){button.disabled=!ready;button.setAttribute('aria-pressed',String(button.dataset.type===s.betType));}
 }
 async function open(id){if(!VaultSession.ready||VaultSession.mode!=='authenticated')return;currentGame=id;document.body.classList.remove('lobby-mode','slot-active','poker-active','bird-active');document.body.classList.add('game-mode','table-active');document.querySelectorAll('.vault-table').forEach(n=>n.hidden=n.id!==`${id}App`);VaultStorage.schedule();syncMusic();render(id);if(!VaultRoundService.tableSupport){node(id,'status').textContent='CONNECTING TO TABLE…';const supported=await VaultRoundService.checkTableSupport();render(id);if(!supported)node(id,'status').textContent='TABLE UNAVAILABLE · PLEASE TRY AGAIN LATER';}}
 function alive(id,g){return states[id].generation===g&&VaultRoundService.get(id)?.roundId===states[id].roundId;}
 function settle(id,result,payout,metadata){const s=states[id];if(s.phase==='RESULT'||!VaultRoundService.get(id))return;const profit=Math.round((payout-s.totalBet)*1e6)/1e6;VaultWalletService.applyDelta(payout,{gameId:id});VaultRoundService.finish(id,result,'settled',metadata);s.revealed=true;s.phase='RESULT';s.result=`${result}${payout===s.totalBet?' · BET RETURNED':profit>0?` · +${format(profit)}`:profit<0?` · −${format(-profit)}`:''}`;render(id);}
 function settleBlackjack(){const s=states.blackjack,result=TABLE_RULES.blackjackResult(s.player,s.dealer);settle('blackjack',result,TABLE_RULES.calculateBlackjackPayout(result,s.totalBet),{playerCards:s.player,dealerCards:s.dealer,playerTotal:TABLE_RULES.getBlackjackHandValue(s.player).total,dealerTotal:TABLE_RULES.getBlackjackHandValue(s.dealer).total,doubled:s.doubled,naturalBlackjack:TABLE_RULES.getBlackjackHandValue(s.player).blackjack});}
 async function dealerTurn(g){const s=states.blackjack;s.phase='DEALER_TURN';s.revealed=true;render('blackjack');await wait();if(!alive('blackjack',g))return;let d=TABLE_RULES.getBlackjackHandValue(s.dealer);while(d.total<17||(d.total===17&&d.soft&&BLACKJACK_CONFIG.dealerHitsSoft17)){s.dealer.push(s.deck.pop());render('blackjack');await wait();if(!alive('blackjack',g))return;d=TABLE_RULES.getBlackjackHandValue(s.dealer);}settleBlackjack();}
 async function deal(id){const s=states[id];if(!idle(s))return;const stake=bet(id),round=VaultRoundService.begin(id,stake,{betType:id==='baccarat'?s.betType:undefined});if(!round)return;Object.assign(s,{phase:'DEALING',player:[],dealer:[],deck:TABLE_RULES.shoe(id==='blackjack'?BLACKJACK_CONFIG.decks:BACCARAT_CONFIG.decks),baseBet:stake,totalBet:stake,roundId:round,revealed:id==='baccarat',result:'',doubled:false});const g=++s.generation;render(id);
  if(id==='blackjack'){for(const target of [s.player,s.dealer,s.player,s.dealer]){await wait();if(!alive(id,g))return;target.push(s.deck.pop());render(id);}if(TABLE_RULES.getBlackjackHandValue(s.player).blackjack||TABLE_RULES.getBlackjackHandValue(s.dealer).blackjack){settleBlackjack();return;}s.phase='PLAYER_TURN';render(id);}
  else{const outcome=TABLE_RULES.resolveBaccaratRound(s.deck);for(const [target,c] of [[s.player,outcome.player[0]],[s.dealer,outcome.banker[0]],[s.player,outcome.player[1]],[s.dealer,outcome.banker[1]],...(outcome.player[2]?[[s.player,outcome.player[2]]]:[]),...(outcome.banker[2]?[[s.dealer,outcome.banker[2]]]:[])]){await wait();if(!alive(id,g))return;target.push(c);render(id);}const payout=TABLE_RULES.calculateBaccaratPayout(s.betType,outcome.result,s.totalBet);settle(id,`${outcome.result==='TIE'?'TIE':outcome.result+' WINS'} · ${payout===s.totalBet?'PUSH':payout?'YOU WIN':'LOSE'}`,payout,{betType:s.betType,playerCards:s.player,bankerCards:s.dealer,playerTotal:outcome.playerTotal,bankerTotal:outcome.bankerTotal,natural:outcome.natural});}
 }
 async function action(action){const s=states.blackjack;if(s.phase!=='PLAYER_TURN')return;const g=s.generation;if(action==='stand')return dealerTurn(g);if(action==='double'){if(s.player.length!==2||s.doubled||!BLACKJACK_CONFIG.allowDouble)return;if(!VaultRoundService.addStake('blackjack',s.baseBet))return;s.doubled=true;s.totalBet=s.baseBet*2;}
  s.phase='DEALING';render('blackjack');await wait();if(!alive('blackjack',g))return;s.player.push(s.deck.pop());render('blackjack');if(TABLE_RULES.getBlackjackHandValue(s.player).busted){settleBlackjack();return;}if(action==='double')return dealerTurn(g);s.phase='PLAYER_TURN';render('blackjack');
 }
 function reset(){for(const id of ids){const s=states[id];s.generation++;Object.assign(s,{phase:'IDLE',player:[],dealer:[],deck:[],baseBet:0,totalBet:0,roundId:null,revealed:false,result:'',doubled:false});render(id);}}
 function preferences(){return {blackjack:states.blackjack.betIndex,baccarat:states.baccarat.betIndex,baccaratType:states.baccarat.betType};}
 function restore(p){for(const id of ids)states[id].betIndex=Number.isInteger(p?.[id])&&p[id]>=0&&p[id]<BETS.length?p[id]:2;states.baccarat.betType=['PLAYER','BANKER','TIE'].includes(p?.baccaratType)?p.baccaratType:'PLAYER';reset();}
 for(const id of ids){document.getElementById(`open${id==='blackjack'?'Blackjack':'Baccarat'}Game`).onclick=()=>open(id);node(id,'deal').onclick=()=>deal(id);for(const [key,delta] of [['minus',-1],['plus',1],['max',BETS.length]])node(id,key).onclick=()=>{if(!idle(states[id]))return;states[id].betIndex=Math.max(0,Math.min(BETS.length-1,key==='max'?BETS.length-1:states[id].betIndex+delta));render(id);VaultStorage.schedule();};render(id);}
 for(const a of ['hit','stand','double'])node('blackjack',a).onclick=()=>action(a);
 for(const button of node('baccarat','zones').querySelectorAll('button'))button.onclick=()=>{if(!idle(states.baccarat))return;states.baccarat.betType=button.dataset.type;render('baccarat');VaultStorage.schedule();};
 // Legacy navigation remains unchanged; leaving a table merely hides it.
 const observer=new MutationObserver(()=>{if(!ids.includes(currentGame)){if(document.body.classList.contains('table-active'))document.body.classList.remove('table-active');document.querySelectorAll('.vault-table').forEach(n=>n.hidden=true);}});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 return {open,reset,preferences,restore,render,states};
})();
