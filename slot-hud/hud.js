/* Presentation adapters only. Existing controllers own every wager, outcome and settlement. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),q=(root,s)=>root.querySelector(s);
 const balanceFormats=new Map(),balanceLayouts=new WeakMap();let balanceLayoutVersion=0;
 window.addEventListener('resize',()=>{balanceLayoutVersion++;},{passive:true});
 const numberFormat=decimals=>{if(!balanceFormats.has(decimals))balanceFormats.set(decimals,new Intl.NumberFormat('ru-RU',{maximumFractionDigits:decimals}));return balanceFormats.get(decimals);};
 const text=(node,value)=>{value=String(value??'');if(node.textContent!==value)node.textContent=value;};
 // Read-only display formatting: never feeds a number back into the wallet.
 function parseBalance(value){if(typeof value==='number')return Number.isFinite(value)?value:null;const s=String(value).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');return /^\d+(\.\d+)?$/.test(s)?Number(s):null;}
 function formatBalanceForDisplay(value,{mobile=matchMedia('(max-width:760px)').matches,compact=false}={}){
  const n=parseBalance(value);if(n===null)return String(value??'—');
  if(compact){const d=n>=1e12?1e12:n>=1e9?1e9:n>=1e6?1e6:1e3,u=d===1e12?'T':d===1e9?'B':d===1e6?'M':'K';return numberFormat(2).format(n/d)+u;}
  let decimals=mobile?Math.max(0,9-Math.max(1,Math.trunc(n).toString().length)):4,result='';
  for(let i=0;i<3;i++){result=numberFormat(decimals).format(n);const integer=result.split(',')[0].replace(/\D/g,'').length,next=mobile?Math.max(0,9-integer):4;if(next===decimals)break;decimals=next;}
  return result;
 }
 window.formatBalanceForDisplay=formatBalanceForDisplay;
 function balanceDisplay(node,value){
  const mobile=matchMedia('(max-width:760px)').matches,previous=balanceLayouts.get(node),raw=String(value);
  if(previous?.value===raw&&previous.mobile===mobile&&previous.version===balanceLayoutVersion&&previous.text===node.textContent)return;
  text(node,formatBalanceForDisplay(value,{mobile}));node.title=String(value);node.dataset.fullBalance=String(value);node.style.fontSize='';
  if(mobile&&node.scrollWidth>node.clientWidth+1){node.style.setProperty('font-size','10px','important');if(node.scrollWidth>node.clientWidth+1)text(node,formatBalanceForDisplay(value,{mobile:true,compact:true}));}
  balanceLayouts.set(node,{value:raw,mobile,version:balanceLayoutVersion,text:node.textContent});
 }
 window.BalanceDisplay={format:formatBalanceForDisplay,render:balanceDisplay};
 const configs=[
  {id:'slot',name:'Digital Derby',root:'.app',scene:'.arena-inner',frame:'.derby-stage',fallback:'.field-wrap',bar:'.controls',top:'.hud',minus:'betMinus',plus:'betPlus',bet:'betValue',max:'maxBetBtn',spin:'spinBtn',auto:'autoBtn',buy:'buyBtn',shop:'bonusShopModal',win:'lastWin',choices:'#autoPopover [data-auto-count]',count:'autoCount',hide:['.bonus-total-hud'],pay:null},
  {id:'swamp',name:'Swamp Fishing',root:'#swampApp',scene:'.swamp-scene',frame:'.swamp-frame',bar:'.swamp-controls',top:'.swamp-result',minus:'swampBetMinus',plus:'swampBetPlus',bet:'swampBetValue',max:'swampMaxBet',spin:'swampSpin',auto:'swampAuto',buy:'swampBuy',shop:'swampBonusShop',win:'swampLastWin',choices:'[data-swamp-auto]',count:'swampAuto',help:'.swamp-info-body',pay:'swampPaytable'},
  {id:'vault_heist',name:'VAULT Heist',root:'#heistApp',scene:'.heist-scene',frame:'.heist-frame',bar:'.heist-controls',top:'.heist-hud',minus:'heistMinus',plus:'heistPlus',bet:'heistBet',max:'heistMax',spin:'heistSpin',auto:'heistAuto',buy:'heistBuy',shop:'heistBonusShop',win:'heistBaseWin',choices:'[data-heist-auto]',count:'heistAuto',help:'#heistHelp',pay:'heistPaytable',hide:['#heistHelpOpen']},
  {id:'magnet',name:'MAGNET',root:'#magnetApp',scene:'.magnet-scene',frame:'.magnet-apparatus',bar:'.magnet-controls',top:'.magnet-readout',minus:'magnetMinus',plus:'magnetPlus',bet:'magnetBet',max:'magnetMax',spin:'magnetSpin',auto:'magnetAuto',win:'magnetWin',choices:'[data-magnet-auto]',count:'magnetAuto',help:'#magnetHelp',pay:'magnetPaytable',hide:['.magnet-result','.magnet-v2-balance','#magnetHelpOpen']},
  {id:'critter',name:'Critter Chaos',root:'#critterApp',scene:'.critter-scene',frame:'.critter-frame',bar:'.critter-controls',top:'.critter-readout',minus:'critterMinus',plus:'critterPlus',bet:'critterBet',max:'critterMax',spin:'critterSpin',auto:'critterAuto',buy:'critterBuy',shop:'critterBonusShop',win:'critterWin',choices:'[data-critter-auto]',count:'critterAuto',help:'#critterHelp',pay:'critterPaytable',hide:['.critter-wallet','#critterHelpOpen']}
 ];
 const controllers={swamp:()=>window.VaultSwamp,vault_heist:()=>window.VaultHeist,magnet:()=>window.VaultMagnet,critter:()=>window.VaultCritter};
 function snapshot(c){
  const originalAuto=$(c.auto),autoLabel=originalAuto.textContent,autoplayRemaining=/STOP/.test(autoLabel)?autoLabel.replace(/STOP\s*[·]?\s*/,''):0;
  const controller=controllers[c.id]?.(),details=controller?.getHudState?.(),round=details?.round,bonus=details?.bonus;
  const busy=c.id==='slot'?state.busy:!!controller?.isBusy;
  const feature=c.id==='slot'?state.bonus:c.id==='swamp'?!!bonus&&bonus.remaining>0:!!round&&round.status!=='SETTLED';
  let statusText=busy?'SPINNING':feature?'BONUS ACTIVE':'BASE GAME',featureInfo='';
  if(c.id==='slot'){statusText=state.cascade?`CASCADE ${state.cascade}`:statusText;featureInfo=state.bonus?`${state.freeSpins} FREE SPINS · ${state.sticky.size} WILDS`:'';}
  if(c.id==='swamp')featureInfo=bonus?`${bonus.remaining} FREE SPINS · ${$('swampCurrentMultiplier').textContent}`:'';
  if(c.id==='vault_heist'){statusText=round?.status==='CHOICE'?'COLLECT OR GO DEEPER':busy?'RESOLVING':feature?'HEIST ACTIVE':'BASE GAME';featureInfo=feature?`${$('heistStageLabel').textContent} · ${$('heistLoot').textContent}`:'';}
  if(c.id==='magnet'){statusText=$('magnetPhaseLabel').textContent||statusText;featureInfo=feature?`${$('magnetCounter').textContent} · ${$('magnetMultiplier').textContent}`:'';}
  if(c.id==='critter'){const inBonus=busy&&$('critterMode').textContent.includes('BONUS SPIN');statusText=inBonus?'BONUS GAME':busy?($('critterStatus').textContent.includes('CASCADE')?'RESOLVING':'SPINNING'):'BASE GAME';featureInfo=inBonus?$('critterMode').textContent:busy?$('critterCascade').textContent:details?.scatterBoost?'CHANCE BOOST · SPIN '+Number(details.spinCost).toLocaleString('ru-RU'):'';}
  const canChangeBet=!$(c.minus).disabled&&!busy;
  const insufficient=c.id==='critter'?details?.spinCost>state.balance:!feature&&BETS[c.id==='slot'?state.betIndex:controller?.betIndex||0]>state.balance;
  return {balance:VaultWalletService.formatBalance(),bet:c.id==='slot'?bet():BETS[controller?.betIndex||0],betSteps:BETS,win:c.id==='vault_heist'&&round?.status==='SETTLED'?Number(round.payout).toLocaleString('ru-RU'):$(c.win).textContent,state:busy?'SPINNING':feature?'BONUS_ACTIVE':autoplayRemaining?'AUTOPLAY':insufficient?'INSUFFICIENT_BALANCE':$(c.spin).disabled?'DISABLED':'IDLE',autoplayRemaining,canSpin:!$(c.spin).disabled,canChangeBet,canBuyBonus:!!c.buy&&!$(c.buy).disabled,statusText,featureInfo,busy,feature};
 }
 const instances=[];
 function create(c){
  const root=document.querySelector(c.root),scene=q(root,c.scene),legacy=q(root,c.bar);
  if(!root||!scene||!legacy)throw Error('Slot HUD adapter missing: '+c.id);
  root.dataset.slotSkin=c.id;
  const upper=document.createElement('section');upper.className='slot-top-status';upper.dataset.slotHud='';upper.setAttribute('aria-label',c.name+' status');
  upper.innerHTML='<div class="slot-status-win"><small>LAST WIN</small><strong>0</strong></div><div class="slot-status-mode"><strong>BASE GAME</strong><small>GOOD LUCK</small></div><div class="slot-status-feature" hidden><small>FEATURE INFO</small><strong></strong></div>';
  const before=(c.id==='swamp'?q(root,'.swamp-feature-bar'):null)||q(root,c.top)||q(root,c.frame)||scene.firstChild;before.parentNode.insertBefore(upper,before);
  const hud=document.createElement('footer');hud.className='slot-bottom-controls';hud.dataset.slotHud='';hud.setAttribute('aria-label',c.name+' controls');
  hud.innerHTML='<button data-action="settings" aria-label="Settings">⚙</button><div class="slot-balance" data-control="balance"><small>BALANCE</small><strong>—</strong></div><div data-mount="minus"></div><button class="slot-bet-value" data-action="bet" aria-label="Choose bet"><small>BET</small></button><div data-mount="plus"></div><button data-action="auto">AUTO</button><div data-mount="max"></div><div data-mount="spin"></div>'+(c.buy?'<div data-mount="buy"></div>':'');
  legacy.before(hud);
  for(const [key,control] of [['minus','bet-minus'],['plus','bet-plus'],['max','max'],['spin','spin'],['buy','bonus']]){
   if(!c[key])continue;const node=$(c[key]);node.dataset.control=control;node.setAttribute('aria-label',control==='spin'?'Spin':control==='bonus'?'Buy bonus':control==='max'?'Maximum bet':control==='bet-minus'?'Decrease bet':'Increase bet');q(hud,`[data-mount="${key}"]`).replaceWith(node);
  }
  const betDisplay=document.createElement('strong');q(hud,'[data-action="bet"]').append(betDisplay);
  q(hud,'[data-action="settings"]').dataset.control='settings';q(hud,'[data-action="auto"]').dataset.control='auto';q(hud,'[data-action="bet"]').dataset.control='bet';
  legacy.classList.add('slot-hud-source');
  for(const selector of [c.top,...c.hide||[]])q(root,selector)?.classList.add('slot-hud-source');
  // Remove duplicate permanent settings/help surfaces; controller targets remain mounted.
  if(c.id==='swamp')q(root,'.swamp-info').classList.add('slot-hud-source');
  if(c.id==='slot')$('slotHelp').classList.add('slot-hud-source');
  const modal=document.createElement('dialog');modal.className='slot-shared-modal';modal.dataset.slotSkin=c.id;modal.setAttribute('aria-label',c.name+' menu');
  modal.innerHTML='<header><div><small>VAULT · '+c.name+'</small><h2></h2></div><button data-close aria-label="Close">×</button></header><div class="slot-modal-body"></div>';
  root.append(modal);const body=q(modal,'.slot-modal-body');let popup='',focus=null;
  function close(){modal.close();popup='';focus?.focus({preventScroll:true});}
  q(modal,'[data-close]').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal){const b=modal.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();}});
  modal.addEventListener('close',()=>{popup='';});
  function show(kind,title){focus=document.activeElement;popup=kind;text(q(modal,'h2'),title);body.replaceChildren();modal.dataset.popup=kind;if(!modal.open)modal.showModal();}
  function button(label,action){const n=document.createElement('button');n.textContent=label;n.onclick=action;body.append(n);return n;}
  function info(tab='SYMBOLS'){
   show('info','PAYTABLE & INFO');
   const tabs=document.createElement('nav');tabs.className='slot-info-tabs';tabs.setAttribute('aria-label','Info sections');body.append(tabs);
   const content=document.createElement('section');body.append(content);
   for(const name of ['SYMBOLS','RULES','FEATURES','PAYOUTS']){const n=document.createElement('button');n.textContent=name;n.setAttribute('aria-pressed',String(name===tab));n.onclick=()=>info(name);tabs.append(n);}
   const help=c.help?q(root,c.help):null;
   if(tab==='PAYOUTS'||tab==='SYMBOLS'){
    const source=c.pay?$(c.pay):$('symbolList');
    if(source){const copy=source.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));copy.querySelectorAll('button').forEach(n=>n.remove());copy.hidden=false;copy.classList.add('slot-info-copy');content.append(copy);}
    else content.textContent='5+ connected identical symbols pay according to the existing Digital Derby paytable.';
   }else{
    const paragraphs=help?[...help.querySelectorAll('p')].map(n=>n.textContent):c.id==='slot'?['Digital Derby: 5+ matching symbols connected by sides form a paying cluster. Cascades refill the field. Winning Wilds stay for the cascade sequence.','Scatter symbols trigger Weekend League Free Spins. The BONUS menu lists the existing offers and Scatter Boost price.']:[];
    for(const value of paragraphs.filter(p=>tab==='FEATURES'?/bonus|wild|scatter|free spin|chamber|collect|wheel|dumpster|overdrive|бонус|множител/i.test(p):true)){const p=document.createElement('p');p.textContent=value;content.append(p);}
    if(c.id==='magnet'){const manual=$('magnetModernManual');if(manual&&tab==='FEATURES'){const copy=manual.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));content.append(copy);}}
   }
  }
  function settings(){
   show('settings','SETTINGS');
   for(const [key,label] of [['sound','Sound'],['music','Music'],['fastGame','Quick Spin'],['fastBonus','Quick Bonus']]){const n=button(label+' · '+(state[key]?'ON':'OFF'),()=>{toggleSetting(key);settings();});n.setAttribute('aria-pressed',String(!!state[key]));}
   const motion=button('Reduced Motion · '+(document.body.classList.contains('slot-reduced-motion')?'ON':'OFF'),()=>{document.body.classList.toggle('slot-reduced-motion');try{localStorage.setItem('vault:v1:hud',JSON.stringify({version:1,reducedMotion:document.body.classList.contains('slot-reduced-motion')}));}catch{}settings();});motion.setAttribute('aria-pressed',String(document.body.classList.contains('slot-reduced-motion')));
   for(const [label,tab] of [['Paytable','PAYOUTS'],['Rules','RULES'],['Info','FEATURES']])button(label,()=>info(tab));
  }
  const choices=[...root.querySelectorAll(c.choices)];
  function auto(){
   if(snapshot(c).autoplayRemaining){$(c.auto).click();render();return;}
   if($(c.auto).disabled)return;
   show('auto','AUTOPLAY');
   const counts=c.id==='slot'?[10,25,50,100,-1]:choices.map(n=>Number(n.dataset[c.count])).filter(n=>[10,25,50,100,-1].includes(n));
   for(const count of counts)button(count<0?'∞':String(count),()=>{if($(c.auto).disabled){close();return;}close();if(c.id==='slot')setAutoMode(count);else choices.find(n=>Number(n.dataset[c.count])===count)?.click();render();});
  }
  function setBet(value){if(!snapshot(c).canChangeBet)return;const index=BETS.indexOf(value);if(index<0)return;const target=c.id==='slot'?state:controllers[c.id]();target.betIndex=index;if(c.id==='slot')updateUI();VaultStorage.schedule();render();}
  q(hud,'[data-action="settings"]').onclick=settings;
  q(hud,'[data-action="auto"]').onclick=auto;
  q(hud,'[data-action="bet"]').onclick=()=>{if(!snapshot(c).canChangeBet)return;show('bet','CHOOSE BET');for(const value of BETS)button(Number(value).toLocaleString('ru-RU'),()=>{setBet(value);close();});};
  // Use the same dialog chrome for existing feature purchase bodies and handlers.
  if(c.shop){
   const shop=$(c.shop);shop.classList.add('slot-bonus-dialog');shop.dataset.slotSkin=c.id;
   if(shop.tagName==='DIALOG'){shop.addEventListener('click',e=>{if(e.target===shop){const r=shop.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)shop.close();}});}
   else{shop.setAttribute('role','dialog');shop.setAttribute('aria-modal','true');shop.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeBonusShop();$(c.buy).focus();}if(e.key==='Tab'){const all=[...shop.querySelectorAll('button:not(:disabled)')];if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0].focus();}}});$(c.buy).addEventListener('click',()=>{if(shop.classList.contains('show'))$('bonusShopClose').focus();});}
  }
  const closeFeature=()=>{if(!c.shop)return;const shop=$(c.shop);if(shop.tagName==='DIALOG')shop.close();else closeBonusShop();};
  const offers=()=>{
   const stake=snapshot(c).bet;
   if(c.id==='slot')return [{selector:'#buyNormalBonusBtn',type:'normal',label:'BONUS',price:stake*BONUS_BUY_MULT_NORMAL},{selector:'#buySuperBonusBtn',type:'super',label:'SUPER BONUS',price:stake*BONUS_BUY_MULT_SUPER}];
   if(c.id==='swamp')return SWAMP_CONFIG.purchases.map(o=>({selector:`[data-swamp-buy="${o.id}"]`,type:o.id,label:o.label,price:stake*o.costX}));
   if(c.id==='vault_heist')return VAULT_HEIST_CONFIG.purchases.map(o=>({selector:`[data-heist-buy="${o.id}"]`,type:o.id,label:o.label,price:stake*o.costX}));
   if(c.id==='critter'){const mode=q(root,'[name="critter-feature"]:checked')?.value;return mode&&mode!=='boost'?[{selector:'#critterShopConfirm',type:mode,label:mode==='super'?'SUPER BONUS':'BONUS',price:stake*CRITTER_CONFIG.features[mode+'Cost']}]:[];}
   return [];
  };
  const confirm=document.createElement('dialog');confirm.className='slot-shared-modal slot-purchase-confirmation';confirm.dataset.slotSkin=c.id;confirm.setAttribute('aria-label','Confirm bonus purchase');
  confirm.innerHTML='<header><h2>BUY BONUS?</h2><button data-dismiss aria-label="Close">×</button></header><small>PRICE</small><strong data-price></strong><small>CURRENT BET</small><strong data-stake></strong><p data-message role="status"></p><div class="slot-confirm-actions"><button data-no>NO</button><button data-yes>YES</button></div>';
  root.append(confirm);let quote=null,purchaseLocked=false,bypass=false;
  function cancelPurchase(){quote=null;purchaseLocked=false;if(confirm.open)confirm.close();}
  q(confirm,'[data-dismiss]').onclick=cancelPurchase;q(confirm,'[data-no]').onclick=cancelPurchase;
  confirm.addEventListener('cancel',()=>{quote=null;purchaseLocked=false;});
  confirm.addEventListener('click',e=>{e.stopPropagation();if(e.target===confirm){const b=confirm.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom){e.preventDefault();cancelPurchase();}}});
  q(confirm,'[data-yes]').onclick=()=>{
   if(purchaseLocked||!quote)return;purchaseLocked=true;q(confirm,'[data-yes]').disabled=true;
   const now=offers().find(o=>o.type===quote.type),s=snapshot(c);
   if(currentGame!==c.id||!s.canBuyBonus||s.busy||s.bet!==quote.bet||!now||now.price!==quote.price){text(q(confirm,'[data-message]'),'OFFER CHANGED — REOPEN BONUS MENU');return;}
   if(state.balance<quote.price){text(q(confirm,'[data-message]'),'INSUFFICIENT BALANCE');return;}
   const target=quote.target;quote=null;confirm.close();bypass=true;try{target.click();}finally{bypass=false;}
  };
  if(c.shop){const shop=$(c.shop);shop.addEventListener('click',e=>{
   if(bypass)return;const offer=offers().find(o=>e.target.closest(o.selector));
   if(offer){e.preventDefault();e.stopImmediatePropagation();if(!snapshot(c).canBuyBonus||e.target.closest(offer.selector).disabled)return;
    quote={...offer,bet:snapshot(c).bet,target:e.target.closest(offer.selector)};purchaseLocked=false;closeFeature();text(q(confirm,'h2'),'BUY '+offer.label+'?');text(q(confirm,'[data-price]'),formatBalanceForDisplay(offer.price,{mobile:false}));text(q(confirm,'[data-stake]'),formatBalanceForDisplay(quote.bet,{mobile:false}));text(q(confirm,'[data-message]'),'');q(confirm,'[data-yes]').disabled=false;confirm.showModal();return;
   }
   const boostSelector={slot:'#scatterBoostBtn',swamp:'#swampScatterBoost',vault_heist:'#heistScatterBoost',critter:'#critterShopConfirm'}[c.id];
   const target=boostSelector&&e.target.closest(boostSelector);if(!target||target.disabled||c.id==='critter'&&q(root,'[name="critter-feature"]:checked')?.value!=='boost')return;
   const before=c.id==='critter'?VaultCritter.scatterBoost:state.scatterBoost;
   setTimeout(()=>{const active=c.id==='critter'?VaultCritter.scatterBoost:state.scatterBoost;if(active===before)return;closeFeature();text(toast,active?'SCATTER BOOST ACTIVE':'SCATTER BOOST OFF');toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2400);},0);
  },true);}
  const toast=document.createElement('div');toast.className='slot-feature-toast';toast.setAttribute('role','status');toast.hidden=true;root.append(toast);let toastTimer;
  q(hud,'.slot-balance').setAttribute('role','button');q(hud,'.slot-balance').tabIndex=0;
  const showBalance=()=>{show('balance','BALANCE');const n=document.createElement('p');n.className='slot-full-balance';n.textContent=VaultWalletService.formatBalance();body.append(n);};
  q(hud,'.slot-balance').onclick=showBalance;q(hud,'.slot-balance').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showBalance();}};
  let lastWin='0';
  function render(){
   if(currentGame!==c.id){if(modal.open)close();cancelPurchase();return;}
   const s=snapshot(c);hud.dataset.state=s.state;
   balanceDisplay(q(hud,'.slot-balance strong'),s.balance);const headerBalance=document.querySelector('.lobby-balance strong');if(headerBalance)balanceDisplay(headerBalance,s.balance);text(betDisplay,Number(s.bet).toLocaleString('ru-RU'));q(hud,'[data-action="bet"]').disabled=!s.canChangeBet;
   const autoButton=q(hud,'[data-action="auto"]');text(autoButton,s.autoplayRemaining?'STOP · '+s.autoplayRemaining:'AUTO');autoButton.disabled=$(c.auto).disabled;autoButton.setAttribute('aria-pressed',String(!!s.autoplayRemaining));autoButton.setAttribute('aria-expanded',String(modal.open&&popup==='auto'));
   if(!s.busy)lastWin=s.win;text(q(upper,'.slot-status-win strong'),lastWin);
   text(q(upper,'.slot-status-mode strong'),s.statusText);text(q(upper,'.slot-status-mode small'),s.state==='INSUFFICIENT_BALANCE'?'INSUFFICIENT BALANCE':s.autoplayRemaining?'AUTOPLAY · '+s.autoplayRemaining:c.name.toUpperCase());
   const feature=q(upper,'.slot-status-feature');feature.hidden=!s.featureInfo;text(q(feature,'strong'),s.featureInfo);
   upper.classList.toggle('slot-has-feature',!!s.featureInfo);
   if(modal.open&&(popup==='bet'||popup==='auto')&&(s.busy||s.feature))close();
  }
  instances.push({id:c.id,root,hud,upper,modal,render,getState:()=>snapshot(c),actions:{spin:()=>$(c.spin).click(),setBet,startAutoplay:count=>{if(c.id==='slot')setAutoMode(count);else choices.find(n=>Number(n.dataset[c.count])===count)?.click();},stopAutoplay:()=>{if(snapshot(c).autoplayRemaining)$(c.auto).click();},openSettings:settings,openPaytable:info}});
 }
 function init(){
  try{const pref=JSON.parse(localStorage.getItem('vault:v1:hud'));if(pref?.version===1&&pref.reducedMotion===true)document.body.classList.add('slot-reduced-motion');}catch{}
  configs.forEach(create);
  window.BonusFeatureModal={open:id=>{const c=configs.find(c=>c.id===id);if(c?.buy)$(c.buy).click();},close:()=>{document.querySelectorAll('.slot-bonus-dialog').forEach(n=>{if(n.tagName==='DIALOG')n.close();else if(n.classList.contains('show'))closeBonusShop();});}};window.BonusPurchaseConfirmation={cancel:()=>document.querySelectorAll('.slot-purchase-confirmation[open]').forEach(n=>n.querySelector('[data-no]').click())};
  window.VaultSlotHud={states:Object.freeze(['IDLE','SPINNING','RESOLVING','FEATURE','BONUS_INTRO','BONUS_ACTIVE','BIG_WIN','AUTOPLAY','INSUFFICIENT_BALANCE','DISABLED']),instances,getState:id=>instances.find(n=>n.id===id)?.getState(),refresh:()=>instances.forEach(n=>n.render())};
  if(document.fonts)document.fonts.ready.then(()=>{balanceLayoutVersion++;VaultSlotHud.refresh();});
  if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{balanceLayoutVersion++;});for(const node of document.querySelectorAll('.slot-balance,.lobby-balance'))observer.observe(node);}
  VaultSlotHud.refresh();setInterval(()=>{if(!document.hidden)VaultSlotHud.refresh();},150);
 }
 init();
})();
