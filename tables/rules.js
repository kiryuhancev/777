/* Pure table rules. RNG chooses cards, never a target payout. */
const BLACKJACK_CONFIG=Object.freeze({decks:1,blackjackPayout:1.5,dealerHitsSoft17:false,allowDouble:true,allowSplit:false,allowInsurance:false});
const BACCARAT_CONFIG=Object.freeze({decks:6,bankerCommission:.05,tiePayout:8,playerPayout:1});
const TABLE_RULES=(()=>{
 const money=n=>Math.round(n*1e6)/1e6;
 function shoe(decks=1,rng=Math.random){
  const cards=[];
  for(let d=0;d<decks;d++)for(const [suit,suitName] of [['♠','spades'],['♥','hearts'],['♦','diamonds'],['♣','clubs']])for(let rank=2;rank<=14;rank++)cards.push({rank,label:rank<=10?String(rank):['J','Q','K','A'][rank-11],suit,suitName,color:suit==='♥'||suit==='♦'?'red':'black',id:`${d}:${rank}:${suit}`});
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;
 }
 function getBlackjackHandValue(cards){let total=0,aces=0;for(const c of cards){if(c.rank===14){total+=11;aces++;}else total+=Math.min(c.rank,10);}while(total>21&&aces){total-=10;aces--;}return {total,soft:aces>0,busted:total>21,blackjack:cards.length===2&&total===21};}
 function blackjackResult(player,dealer){const p=getBlackjackHandValue(player),d=getBlackjackHandValue(dealer);if(p.busted)return 'BUST';if(d.blackjack)return p.blackjack?'PUSH':'DEALER WIN';if(p.blackjack)return 'BLACKJACK';if(d.busted)return 'DEALER BUST';return p.total>d.total?'WIN':p.total===d.total?'PUSH':'DEALER WIN';}
 function calculateBlackjackPayout(result,totalBet,config=BLACKJACK_CONFIG){return money(result==='PUSH'?totalBet:result==='BLACKJACK'?totalBet*(1+config.blackjackPayout):['WIN','DEALER BUST'].includes(result)?totalBet*2:0);}
 const getBaccaratCardValue=c=>c.rank===14?1:c.rank>=10?0:c.rank;
 const getBaccaratHandTotal=cards=>cards.reduce((sum,c)=>sum+getBaccaratCardValue(c),0)%10;
 const isNatural=total=>total===8||total===9;
 const shouldPlayerDraw=total=>total<=5;
 function shouldBankerDraw(total,third=null){if(third===null)return total<=5;if(total<=2)return true;if(total===3)return third!==8;if(total===4)return third>=2&&third<=7;if(total===5)return third>=4&&third<=7;if(total===6)return third===6||third===7;return false;}
 function resolveBaccaratRound(deck){const draw=()=>{const c=deck.pop();if(!c)throw Error('Shoe exhausted');return c;};const player=[],banker=[];player.push(draw());banker.push(draw());player.push(draw());banker.push(draw());const p=getBaccaratHandTotal(player),b=getBaccaratHandTotal(banker);const natural=isNatural(p)||isNatural(b);if(!natural){if(shouldPlayerDraw(p))player.push(draw());if(shouldBankerDraw(b,player.length===3?getBaccaratCardValue(player[2]):null))banker.push(draw());}const playerTotal=getBaccaratHandTotal(player),bankerTotal=getBaccaratHandTotal(banker);return {player,banker,playerTotal,bankerTotal,natural,result:playerTotal>bankerTotal?'PLAYER':playerTotal<bankerTotal?'BANKER':'TIE'};}
 function calculateBaccaratPayout(type,result,bet,config=BACCARAT_CONFIG){if(!['PLAYER','BANKER','TIE'].includes(type)||!['PLAYER','BANKER','TIE'].includes(result))throw Error('Invalid baccarat outcome');return money(result==='TIE'&&type!=='TIE'?bet:type!==result?0:bet*(1+(type==='BANKER'?1-config.bankerCommission:type==='TIE'?config.tiePayout:config.playerPayout)));}
 return Object.freeze({shoe,getBlackjackHandValue,blackjackResult,calculateBlackjackPayout,getBaccaratCardValue,getBaccaratHandTotal,isNatural,shouldPlayerDraw,shouldBankerDraw,resolveBaccaratRound,calculateBaccaratPayout});
})();
if(typeof module!=='undefined'&&module.exports)module.exports={TABLE_RULES,BLACKJACK_CONFIG,BACCARAT_CONFIG};
