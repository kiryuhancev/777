/* VAULT data layer. Games keep their canonical state.balance and existing RNG.
 * Only explicit business checkpoints cross this boundary. No frame/DOM serialization. */
(() => {
  'use strict';
  const C=VAULT_CONFIG,NS=`vault:v${C.storageVersion}:`,games=['slot','poker','bird'],screens=['lobby',...games];
  const uuid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16);});
  const isId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  const amount=x=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=1e12?Math.round(Number(x)*1e6)/1e6:null;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const defaults=()=>({balance:C.guestStartingBalance,revision:0,walletConfirmed:false,settings:{sound:true,music:false,fastGame:false,fastBonus:false,scatterBoost:false},bets:{slot:2,poker:2,bird:1},lastGame:'lobby',settingsUpdatedAt:0,recovery:{slotBonus:null,openRounds:{}},rounds:[],stats:{},queue:[]});
  const VaultSession=window.VaultSession={mode:'guest',user:null,profile:null,ready:false};
  let authBusy=false;
  let owner='guest',data=defaults(),client=null,clientRevision=0,suppress=false,localTimer=null,syncTimer=null,syncing=null,identityEpoch=0,connecting=null,connectionUser=null,settingsFingerprint='',conflict=false,locked=false,releaseLock=null,lockHeld=false,storageAvailable=true,profileRemote=true;
  let canonicalBalance=state.balance,walletMutation=0,recovering=null;
  const byId=id=>document.getElementById(id);
  const status=text=>{if(!storageAvailable&&/сохран|Saved|Offline|pending/i.test(text))text='Сохранение недоступно — не перезагружайте страницу';const node=byId('vaultSyncStatus');if(node)node.textContent=text;};
  function configured(){
    if(typeof C.supabaseUrl!=='string'||typeof C.supabaseAnonKey!=='string')return false;
    if(!/^https:\/\/[\w.-]+(?::\d+)?\/?$/.test(C.supabaseUrl)||!C.supabaseAnonKey)return false;
    if(C.supabaseAnonKey.startsWith('sb_secret_'))return false;
    if(C.supabaseAnonKey.startsWith('sb_publishable_'))return true;
    try{return JSON.parse(atob(C.supabaseAnonKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}
  }
  function read(key){try{return JSON.parse(localStorage.getItem(NS+key)||'null');}catch{return null;}}
  function write(key,value){try{localStorage.setItem(NS+key,JSON.stringify(value));return true;}catch{storageAvailable=false;status('Сохранение недоступно');return false;}}
  function validSettings(input){const out=defaults().settings;for(const key of Object.keys(out))if(typeof input?.[key]==='boolean')out[key]=input[key];return out;}
  function validBets(input){const out={slot:2,poker:2,bird:1};for(const game of games){const n=input?.[game],max=game==='bird'?BIRD_BETS.length:BETS.length;if(Number.isInteger(n)&&n>=0&&n<max)out[game]=n;}return out;}
  function validBonus(b){
    if(!b||!['normal','super'].includes(b.type)||!Number.isInteger(b.size)||b.size<5||b.size>8||!Number.isInteger(b.freeSpins)||b.freeSpins<0||b.freeSpins>5000)return null;
    const entries=Array.isArray(b.sticky)?b.sticky.filter(entry=>Array.isArray(entry)&&entry.length===2).filter(([k,v])=>typeof k==='string'&&/^\d,\d$/.test(k)&&SYMBOLS[v]&&v.startsWith('wild')&&k.split(',').every(n=>Number(n)<b.size)):[];
    return {type:b.type,size:b.size,freeSpins:b.freeSpins,level:Math.max(0,Math.min(3,Number(b.level)||0)),progress:Math.max(0,Math.min(2,Number(b.progress)||0)),spins:Math.max(0,Math.min(5000,Number(b.spins)||0)),totalWin:amount(b.totalWin)||0,cascades:Math.max(0,Math.min(100000,Number(b.cascades)||0)),purchaseCost:amount(b.purchaseCost)||0,sticky:entries};
  }
  function validRound(r){return r&&isId(r.roundId)&&games.includes(r.gameId)&&['started','settled','cancelled'].includes(r.status)&&amount(r.bet)!==null&&amount(r.payout)!==null&&amount(r.stake)!==null&&r.metadata&&typeof r.metadata==='object'&&!Array.isArray(r.metadata);}
  function loadBucket(id){
    const raw=read(id==='guest'?'guest':`user:${id}`),out=defaults();
    if(!raw||raw.version!==C.storageVersion||amount(raw.data?.balance)===null)return out;
    const x=raw.data;out.walletConfirmed=x.walletConfirmed===true;out.balance=amount(x.balance);out.revision=Number.isSafeInteger(x.revision)&&x.revision>=0?x.revision:0;
    out.settings=validSettings(x.settings);out.bets=validBets(x.bets);out.lastGame=screens.includes(x.lastGame)?x.lastGame:'lobby';out.settingsUpdatedAt=Number.isFinite(x.settingsUpdatedAt)?x.settingsUpdatedAt:0;
    out.recovery.slotBonus=validBonus(x.recovery?.slotBonus);
    for(const game of games){const r=x.recovery?.openRounds?.[game];if(validRound(r)&&r.gameId===game&&r.status==='started')out.recovery.openRounds[game]=copy(r);}
    out.rounds=Array.isArray(x.rounds)?x.rounds.filter(validRound).slice(-C.maxLocalRounds):[];
    out.stats=x.stats&&typeof x.stats==='object'?x.stats:{};
    // Versioned, owner-bound queue; reject unknown RPCs and corrupt envelope data.
    out.queue=Array.isArray(x.queue)?x.queue.filter(e=>e&&e.userId===id&&isId(e.id)&&['begin','settle','settings'].includes(e.type)&&e.payload&&typeof e.payload==='object').slice(0,C.maxPendingEvents):[];
    return out;
  }
  function capturePreferences(){
    const settings={sound:state.sound,music:state.music,fastGame:state.fastGame,fastBonus:state.fastBonus,scatterBoost:state.scatterBoost};
    const bets={slot:state.betIndex,poker:pokerState.betIndex,bird:birdState.betIndex};
    const fingerprint=JSON.stringify({settings,bets,lastGame:currentGame});
    if(fingerprint!==settingsFingerprint){settingsFingerprint=fingerprint;data.settings=settings;data.bets=bets;data.lastGame=screens.includes(currentGame)?currentGame:'lobby';data.settingsUpdatedAt=Date.now();
      if(VaultSession.mode==='authenticated')enqueue('settings',{settings:{...settings,bets,lastGame:data.lastGame},updatedAt:new Date(data.settingsUpdatedAt).toISOString()});
    }
  }
  const VaultStorage=window.VaultStorage={
    get namespace(){return NS;},get available(){return storageAvailable;},get owner(){return owner;},
    loadLocalState:()=>loadBucket(owner),
    saveLocalState({preferences=true}={}){
      if(suppress||locked||!VaultSession.ready||(owner!=='guest'&&!profileRemote))return false;
      if(preferences)capturePreferences();data.balance=canonicalBalance;
      return write(owner==='guest'?'guest':`user:${owner}`,{version:C.storageVersion,updatedAt:Date.now(),data});
    },
    schedule(){clearTimeout(localTimer);localTimer=setTimeout(()=>this.saveLocalState(),C.localDebounceMs);},
    flush(){clearTimeout(localTimer);this.saveLocalState();},
    inspect(){return copy({owner,data,conflict,locked});},
  };
  function refreshBalanceUI(){syncLobbyBalance();for(const id of ['balance','pokerBalance','birdBalance'])byId(id).textContent=VaultWalletService.formatBalance();}
  const VaultWalletService=window.VaultWalletService={
    getBalance:()=>canonicalBalance,
    formatBalance:()=>owner!=='guest'&&!data.walletConfirmed?'—':fmt(canonicalBalance),
    setLocalBalance(value){const n=amount(value);if(n===null)throw Error('Invalid wallet value');canonicalBalance=n;data.balance=n;walletMutation++;if(!suppress){VaultStorage.saveLocalState({preferences:false});refreshBalanceUI();}return n;},
    applyDelta(delta,{gameId}={}){
      if(!Number.isFinite(delta)||amount(canonicalBalance+delta)===null)throw Error('Invalid wallet delta');
      const round=data.recovery.openRounds[gameId];
      if(delta>0&&gameId&&!round)return canonicalBalance; // An interrupted/settled round cannot pay again.
      if(round&&delta>0)round.payout=amount(round.payout+delta);
      return this.setLocalBalance(canonicalBalance+delta);
    },
    change(delta,options){return this.applyDelta(delta,options);},
    restore:value=>VaultWalletService.setLocalBalance(value),
    load:async()=>(await VaultProfileService.load()).wallet,sync:()=>VaultSync.flush(),
  };
  Object.defineProperty(state,'balance',{configurable:false,enumerable:true,get:()=>canonicalBalance,set:value=>VaultWalletService.setLocalBalance(value)});
  function enqueue(type,payload){
    if(owner==='guest')return;
    if(type==='settings')data.queue=data.queue.filter(e=>e.type!=='settings');
    if(data.queue.length>=C.maxPendingEvents){status('Sync pending — очередь заполнена');return false;}
    data.queue.push({id:uuid(),userId:owner,type,payload:copy(payload)});scheduleSync();return true;
  }
  function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>VaultSync.flush(),C.syncDebounceMs);}
  function stableRecovery(){return {slotBonus:data.recovery.slotBonus};}
  function localStats(round){
    const s=data.stats[round.gameId]||{rounds_played:0,total_wagered:0,total_won:0,biggest_win:0,biggest_multiplier:0};
    s.rounds_played++;s.total_wagered=amount(s.total_wagered+round.bet);s.total_won=amount(s.total_won+round.payout);s.biggest_win=Math.max(s.biggest_win,round.payout);s.biggest_multiplier=Math.max(s.biggest_multiplier,round.multiplier);data.stats[round.gameId]=s;
  }
  const VaultStatsService=window.VaultStatsService={
    recordRound(round){
      if(!validRound(round)||round.status==='started'||data.rounds.some(r=>r.roundId===round.roundId))return false;
      data.rounds.push(copy(round));data.rounds=data.rounds.slice(-C.maxLocalRounds);localStats(round);
      if(owner!=='guest')enqueue('settle',{p_round_id:round.roundId,p_game_id:round.gameId,p_bet:round.bet,p_payout:round.payout,p_multiplier:round.multiplier,p_result:round.result,p_metadata:round.metadata||{},p_status:round.status,p_recovery:stableRecovery()});
      clientRevision++;return true;
    },
    load:()=>copy(data.stats),
  };
  const VaultRoundService=window.VaultRoundService={
    canPlay(game){
      if(VaultSession.mode!=='authenticated'){toast('Войдите в аккаунт, чтобы начать игру');return false;}
      if(conflict){recoverWallet();status('Восстанавливаем кошелёк…');return false;}
      if(authBusy||!VaultSession.ready||locked||(!profileRemote&&owner!=='guest')||data.queue.length>C.maxPendingEvents-6){toast(locked?'Игра открыта в другой вкладке':'Sync pending — игра временно недоступна');return false;}
      return games.includes(game);
    },
    begin(gameId,betValue,{stake=betValue,...metadata}={}){
      if(!this.canPlay(gameId))return false;
      if(data.recovery.openRounds[gameId])this.finish(gameId,'restarted','cancelled');
      const wager=amount(betValue);if(wager===null||wager>canonicalBalance)return false;
      const round={roundId:uuid(),gameId,status:'started',bet:wager,stake:amount(stake)||0,payout:0,result:'',metadata,startedAt:Date.now()};
      data.recovery.openRounds[gameId]=round;
      suppress=true;VaultWalletService.applyDelta(-wager,{gameId});suppress=false;
      // A consumed free spin/purchased entitlement is checkpointed before the first await.
      if(gameId==='slot')VaultRecovery.checkpointSlot({save:false});
      if(owner!=='guest')enqueue('begin',{p_round_id:round.roundId,p_game_id:gameId,p_bet:wager,p_expected_revision:clientRevision,p_metadata:metadata,p_recovery:stableRecovery()});
      clientRevision++;VaultStorage.saveLocalState();refreshBalanceUI();return round.roundId;
    },
    finish(gameId,result='completed',statusValue='settled',metadata={}){
      const round=data.recovery.openRounds[gameId];if(!round)return false;
      round.status=statusValue;round.result=String(result).slice(0,200);round.metadata={...round.metadata,...metadata};round.multiplier=round.stake?amount(round.payout/round.stake)||0:0;round.settledAt=Date.now();
      delete data.recovery.openRounds[gameId];VaultStatsService.recordRound(round);VaultStorage.saveLocalState();return true;
    },
    get:game=>copy(data.recovery.openRounds[game]||null),
    anyActive:()=>!locked&&(state.busy||birdState.active||(pokerState.phase!=='idle'&&!pokerState.resolved)||state.bonusAutoRunning||Object.keys(data.recovery.openRounds).length>0),
  };
  const VaultRecovery=window.VaultRecovery={
    checkpointSlot({save=true}={}){
      data.recovery.slotBonus=state.bonus?{type:state.bonusType,size:state.size,freeSpins:state.freeSpins,level:state.bonusLevel,progress:state.scatterProgress,spins:state.bonusSpinsPlayed,totalWin:amount(state.bonusTotalWin)||0,cascades:state.bonusCascades,purchaseCost:amount(state.bonusPurchaseCost)||0,sticky:[...state.sticky].map(([k,v])=>[k.replace(':',','),v])}:null;
      if(save)VaultStorage.saveLocalState();
    },
    restore(){
      // No refunds, no delayed payout replay, no reused draft/tactical action or physical body.
      const slotOpen=data.recovery.openRounds.slot;
      if(['normal','super'].includes(slotOpen?.metadata?.purchaseType)&&!data.recovery.slotBonus){
        const type=slotOpen.metadata.purchaseType,m=SLOT_MATH.newBonus(type,rand);
        data.recovery.slotBonus={type,size:m.size,freeSpins:m.freeSpins,level:m.level,progress:m.progress,spins:0,totalWin:0,cascades:0,purchaseCost:slotOpen.bet,sticky:[]};
      }
      if(!locked)for(const game of games)this.cancelInterrupted(game);
      state.busy=false;state.activeSpinFast=null;state.bonusAutoRunning=false;state.bonusAutoNotBefore=0;autoState.active=false;autoState.remaining=0;
      clearTimeout(autoState.timer);clearTimeout(bonusAutoTimer);bonusAutoTimer=null;
      pokerState.deck=[];pokerState.discard=[];pokerState.player=[];pokerState.dealer=[];pokerState.community=[];pokerState.choice=[];pokerState.phase='idle';pokerState.resolved=false;pokerState.winner='';pokerState.result='';pokerState.playerEval=null;pokerState.dealerEval=null;pokerState.peekUntil=0;pokerState.dealerHiddenRevealed=false;pokerState.tacticalUsed=false;pokerState.spent=0;
      resetBirdRecovery();
      const b=validBonus(data.recovery.slotBonus);
      state.bonus=!!b&&b.freeSpins>0;state.bonusType=b?.type||'normal';state.slotProfile=state.bonus?b.type:'base';state.size=state.bonus?b.size:5;state.freeSpins=state.bonus?b.freeSpins:0;state.bonusLevel=state.bonus?b.level:0;state.scatterProgress=state.bonus?b.progress:0;state.bonusSpinsPlayed=state.bonus?b.spins:0;state.bonusTotalWin=state.bonus?b.totalWin:0;state.bonusCascades=state.bonus?b.cascades:0;state.bonusPurchaseCost=state.bonus?b.purchaseCost:0;state.sticky=new Map(state.bonus?b.sticky.map(([k,v])=>[k.replace(',',':'),v]):[]);state.grid=blankGrid(state.size);state.cascade=0;state.lastWin=0;state.pendingBonusPurchaseCost=0;
      document.body.classList.toggle('bonus',state.bonus);fillGrid();render();
    },
    cancelInterrupted(game){const r=data.recovery.openRounds[game];if(r)VaultRoundService.finish(game,'interrupted','cancelled',{recovery:'safe-reset-no-refund'});},
  };
  function restorePreferences(){Object.assign(state,data.settings);state.betIndex=data.bets.slot;pokerState.betIndex=data.bets.poker;birdState.betIndex=data.bets.bird;settingsFingerprint=JSON.stringify({settings:data.settings,bets:data.bets,lastGame:data.lastGame});}
  function showSavedScreen(){if(VaultSession.mode!=='authenticated'){openLobby();return;}const open={lobby:openLobby,slot:openSlotGame,poker:openPokerGame,bird:openBirdGame};open[data.lastGame]();updateUI();updatePokerUI();updateBirdUI();drawBirdGame();updateSettingsUI();}
  function renderIdentity(){
    const signedIn=VaultSession.mode==='authenticated';byId('vaultProfileMenu').open=false;document.body.classList.toggle('vault-signed-out',!signedIn);
    document.querySelector('.lobby .lobby-balance').hidden=!signedIn;
    if(signedIn){if(byId('vaultAuthDialog').open)byId('vaultAuthDialog').close();}else if(!byId('vaultAuthDialog').open)openAuth('signin');
    byId('vaultGuestActions').hidden=VaultSession.mode==='authenticated';byId('vaultUserActions').hidden=VaultSession.mode!=='authenticated';
    const username=VaultSession.profile?.username||VaultSession.user?.user_metadata?.username||'Player';byId('vaultUsername').textContent=username;byId('vaultInitials').textContent=username.slice(0,1).toUpperCase();
    const avatar=VaultSession.profile?.avatar_url,node=byId('vaultAvatar');if(typeof avatar==='string'&&/^https:\/\//.test(avatar)){node.src=avatar;node.hidden=false;byId('vaultInitials').hidden=true;}else{node.removeAttribute('src');node.hidden=true;byId('vaultInitials').hidden=false;}
    byId('vaultConflictButton').hidden=true;byId('vaultReloadAccount').hidden=!signedIn||profileRemote;
  }
  async function acquireLock(){
    releaseLock?.();releaseLock=null;lockHeld=false;locked=false;
    if(!navigator.locks)return true;
    return new Promise(resolve=>{
      navigator.locks.request(NS+owner,{ifAvailable:true},lock=>{
        if(!lock){locked=true;status('Открыто в другой вкладке');resolve(false);return;}
        lockHeld=true;resolve(true);return new Promise(release=>{releaseLock=()=>{lockHeld=false;release();};});
      }).catch(()=>resolve(true));
    });
  }
  function rememberSession(){if(owner==='guest'){try{localStorage.removeItem(NS+'session');}catch{}return;}write('session',{user:VaultSession.user,profile:VaultSession.profile,project:C.supabaseUrl});}
  const VaultProfileService=window.VaultProfileService={
    async load({previewWallet=false}={}){
      const mutation=walletMutation,epoch=identityEpoch;
      if(!client||!VaultSession.user)throw Error('No authenticated session');
      const uid=VaultSession.user.id;
      const responses=await Promise.all([client.from('profiles').select('*').eq('id',uid).single(),client.from('wallets').select('*').eq('user_id',uid).single(),client.from('user_settings').select('*').eq('user_id',uid).single(),client.from('game_stats').select('*').eq('user_id',uid),client.from('game_rounds').select('round_id,game_id,bet,status').eq('user_id',uid).eq('status','started')]);
      // A failed optional/profile query must not hide a successfully loaded personal wallet.
      const walletResponse=responses[1];
      if(previewWallet&&mutation===walletMutation&&epoch===identityEpoch&&!walletResponse.error&&uid===owner&&amount(walletResponse.data?.balance)!==null&&!data.queue.length&&!Object.keys(data.recovery.openRounds).length){
        canonicalBalance=amount(walletResponse.data.balance);data.balance=canonicalBalance;data.walletConfirmed=true;data.revision=Number(walletResponse.data.revision)||0;clientRevision=data.revision;refreshBalanceUI();
      }
      const names=['профиль','кошелёк','настройки','статистика','история раундов'];
      for(let i=0;i<responses.length;i++)if(responses[i].error){
        const error=responses[i].error;console.error('VAULT account load failed: '+names[i],error);
        status('Не удалось загрузить: '+names[i]+'. Проверьте SQL-настройку Supabase.');
        throw Object.assign(Error('Could not load account data'),{vaultComponent:/fetch|network/i.test(error.message||'')?null:names[i],cause:error});
      }
      const [profile,wallet,settings,stats,rounds]=responses.map(r=>r.data);
      if(amount(wallet.balance)===null)throw Error('Invalid remote wallet');
      return {profile,wallet,settings,stats,rounds};
    },
    async update({username,avatar_url=null}){
      if(!client||owner==='guest')return {error:'Could not update profile'};
      if(typeof username!=='string'||username.trim().length<1||username.length>40||avatar_url!==null&&!/^https:\/\//.test(avatar_url))return {error:'Invalid profile'};
      try{const {data:profile,error}=await client.from('profiles').update({username:username.trim(),avatar_url}).eq('id',owner).select().single();if(error)throw error;VaultSession.profile=profile;rememberSession();renderIdentity();return {data:profile};}catch(e){console.error('VAULT profile update failed',e);return {error:'Could not update profile'};}
    },
  };
  function applyRemote(remote,{wallet=true}={}){
    VaultSession.profile=remote.profile;profileRemote=true;
    if(wallet&&remote.rounds.length){conflict=true;status('Восстанавливаем раздачу…');}
    if(wallet){canonicalBalance=amount(remote.wallet.balance);data.balance=canonicalBalance;data.walletConfirmed=true;data.revision=Number(remote.wallet.revision)||0;clientRevision=data.revision;data.recovery.slotBonus=validBonus(remote.wallet.recovery?.slotBonus);}
    const s=remote.settings,ts=Date.parse(s.updated_at)||0;
    if(ts>=data.settingsUpdatedAt){data.settings={sound:s.sound_enabled,music:s.music_enabled,fastGame:s.fast_mode,fastBonus:s.fast_bonus,scatterBoost:s.scatter_boost};data.bets=validBets(s.selected_bets);data.lastGame=screens.includes(s.last_game_id)?s.last_game_id:'lobby';data.settingsUpdatedAt=ts;}
    if(wallet)data.stats=Object.fromEntries(remote.stats.map(s=>[s.game_id,s]));rememberSession();
  }
  // Rebase business events automatically at a stable boundary, never midway through gameplay.
  function recoverWallet(){
    if(recovering)return recovering;
    if(conflict&&!state.busy&&!data.recovery.openRounds.slot){if(autoState.active)stopAutoplay();if(state.bonusAutoRunning){state.bonusAutoRunning=false;clearTimeout(bonusAutoTimer);bonusAutoTimer=null;}}
    if(!conflict||!client||owner==='guest'||locked||!navigator.onLine||VaultRoundService.anyActive())return;
    const uid=owner,epoch=identityEpoch;
    recovering=(async()=>{
      try{
        if(syncing)await syncing;
        if(owner!==uid||identityEpoch!==epoch||VaultRoundService.anyActive())return;
        const events=copy(data.queue),ids=[...new Set(events.filter(e=>e.type!=='settings').map(e=>e.payload.p_round_id))];
        const queries=[client.from('wallets').select('*').eq('user_id',uid).single(),client.from('game_rounds').select('round_id,game_id,bet,payout,status').eq('user_id',uid).eq('status','started')];
        if(ids.length)queries.push(client.from('game_rounds').select('round_id,game_id,bet,payout,status').eq('user_id',uid).in('round_id',ids));
        const results=await Promise.all(queries);for(const r of results)if(r.error)throw r.error;
        if(owner!==uid||identityEpoch!==epoch||VaultRoundService.anyActive())return;
        let wallet=results[0].data;const known=new Map([...(results[1].data||[]),...(results[2]?.data||[])].map(r=>[r.round_id,r]));
        // A previous-device/reload round without local business events is abandoned: no refund or new payout.
        for(const round of results[1].data||[]){
          if(ids.includes(round.round_id))continue;
          const result=await client.rpc('record_game_round',{p_round_id:round.round_id,p_game_id:round.game_id,p_bet:round.bet,p_payout:0,p_multiplier:0,p_result:'automatic-recovery',p_metadata:{recovery:'safe-reset-no-refund'},p_status:'cancelled',p_recovery:wallet.recovery||{}});
          if(result.error)throw result.error;if(owner!==uid||identityEpoch!==epoch)return;
          wallet={...wallet,...result.data};
        }
        let balance=amount(wallet.balance),revision=Number(wallet.revision);if(balance===null||!Number.isSafeInteger(revision))throw Error('Invalid remote wallet');
        const rejected=new Set(),accepted=new Set([...known].filter(([,r])=>r.status==='started').map(([id])=>id));
        const next=[];
        for(const event of data.queue){
          if(event.userId!==uid)throw Error('Queue identity mismatch');
          if(event.type==='settings'){next.push(event);continue;}
          const payload=event.payload,id=payload.p_round_id,round=known.get(id);
          if(round&&round.status!=='started')continue; // Server already settled this UUID; never repeat its payout.
          if(event.type==='begin'){
            if(!accepted.has(id)){
              if(amount(payload.p_bet)===null||payload.p_bet>balance){rejected.add(id);continue;}
              payload.p_expected_revision=revision;balance=amount(balance-payload.p_bet);revision++;accepted.add(id);
            }
            next.push(event);
          }else{
            if(rejected.has(id))continue;
            if(!accepted.has(id))throw Error('Round missing during automatic recovery');
            balance=amount(balance+payload.p_payout);if(balance===null)throw Error('Invalid settlement');revision++;next.push(event);
          }
        }
        if(events.some(e=>e.payload?.p_game_id==='slot'&&rejected.has(e.payload.p_round_id))){data.recovery.slotBonus=validBonus(wallet.recovery?.slotBonus);suppress=true;VaultRecovery.restore();suppress=false;}
        data.queue=next;data.rounds=data.rounds.filter(r=>!rejected.has(r.roundId));canonicalBalance=balance;data.balance=balance;data.walletConfirmed=true;data.revision=Number(wallet.revision);clientRevision=revision;walletMutation++;conflict=false;
        VaultStorage.saveLocalState({preferences:false});refreshBalanceUI();renderIdentity();status('Сохраняем прогресс…');scheduleSync();
      }catch(e){console.error('VAULT automatic recovery failed',e);status('Соединение нестабильно — повторим автоматически');}
      finally{recovering=null;}
    })();return recovering;
  }
  const VaultSync=window.VaultSync={
    async flush(){
      clearTimeout(syncTimer);
      if(syncing)return syncing;
      if(conflict)return recoverWallet();
      if(!client||owner==='guest'||!navigator.onLine||locked||!profileRemote)return;
      const epoch=identityEpoch,uid=owner;
      syncing=(async()=>{
        try{
          while(data.queue.length&&owner===uid&&identityEpoch===epoch){
            const event=data.queue[0];if(event.userId!==uid)throw Error('Queue identity mismatch');
            let method,args;
            if(event.type==='begin'){method='begin_game_round';args=event.payload;}
            else if(event.type==='settle'){method='record_game_round';args=event.payload;}
            else{method='save_vault_settings';args={p_settings:event.payload.settings,p_updated_at:event.payload.updatedAt};}
            const {data:result,error}=await client.rpc(method,args);if(owner!==uid||identityEpoch!==epoch)return;
            if(error)throw error;
            if(event.type!=='settings'){data.revision=Number(result.revision);walletMutation++;}
            // Remove only the acknowledged event, even when preferences coalesce during a request.
            data.queue=data.queue.filter(e=>e.id!==event.id);VaultStorage.saveLocalState({preferences:false});
          }
          if(owner===uid&&identityEpoch===epoch&&!data.queue.length&&!Object.keys(data.recovery.openRounds).length){
            const mutation=walletMutation,remote=await VaultProfileService.load();if(mutation!==walletMutation||owner!==uid||identityEpoch!==epoch||data.queue.length||Object.keys(data.recovery.openRounds).length)return;
            // Server balance wins only after every local transaction was acknowledged.
            canonicalBalance=amount(remote.wallet.balance);data.balance=canonicalBalance;data.revision=Number(remote.wallet.revision);clientRevision=data.revision;data.stats=Object.fromEntries(remote.stats.map(s=>[s.game_id,s]));VaultSession.profile=remote.profile;rememberSession();VaultStorage.saveLocalState({preferences:false});refreshBalanceUI();
          }
          status(storageAvailable?'Сохранено':'Сохранение недоступно');
        }catch(e){
          console.error('VAULT sync failed',e);
          if(String(e.message||'').includes('VAULT_WALLET_CONFLICT')||/Round mismatch|Round missing|Queue identity/.test(String(e.message||''))){conflict=true;status('Восстанавливаем кошелёк…');renderIdentity();setTimeout(recoverWallet,0);}
          else status('Offline — прогресс сохранён локально');
        }finally{syncing=null;}
      })();return syncing;
    },
    async useRemote(){conflict=true;return recoverWallet();},
  };
  async function loadSDK(){
    if(window.supabase?.createClient)return window.supabase;
    return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=C.sdkUrl;script.async=true;const timer=setTimeout(()=>{script.remove();reject(Error('SDK timeout'));},6000);script.onload=()=>{clearTimeout(timer);window.supabase?.createClient?resolve(window.supabase):reject(Error('SDK unavailable'));};script.onerror=()=>{clearTimeout(timer);reject(Error('SDK unavailable'));};document.head.append(script);});
  }
  async function switchIdentity(user,{migrate=false,cachedOnly=false}={}){
    const uid=user?.id||'guest';if(uid!=='guest'&&!isId(uid))throw Error('Invalid identity');
    if(connecting&&connectionUser===uid)return connecting;
    if(VaultSession.ready&&uid===owner){
      if(uid!=='guest'){try{const mutation=walletMutation,remote=await VaultProfileService.load({previewWallet:!profileRemote});VaultSession.profile=remote.profile;profileRemote=true;if(mutation===walletMutation&&!VaultRoundService.anyActive()&&!data.queue.length){capturePreferences();const screen=currentGame;applyRemote(remote);data.lastGame=screen;suppress=true;restorePreferences();VaultRecovery.restore();suppress=false;updateUI();updatePokerUI();updateBirdUI();refreshBalanceUI();}renderIdentity();scheduleSync();}catch(e){console.error('VAULT reconnect pending',e);status(e.vaultComponent?'Не удалось загрузить: '+e.vaultComponent+'. Проверьте SQL-настройку Supabase.':'Offline — прогресс сохранён локально');}}
      return;
    }
    if(VaultRoundService.anyActive()&&VaultSession.ready&&uid!==owner)throw Error('Finish active rounds before switching account');
    connectionUser=uid;
    connecting=(async()=>{
      const guestPreferences=migrate?copy({settings:data.settings,bets:data.bets,lastGame:data.lastGame}):null;
      VaultStorage.flush();VaultSession.ready=false;identityEpoch++;conflict=false;profileRemote=uid==='guest';owner=uid;data=loadBucket(uid);clientRevision=data.revision+data.queue.filter(e=>e.type!=='settings').length;VaultSession.mode=uid==='guest'?'guest':'authenticated';VaultSession.user=user?{id:user.id,email:user.email,user_metadata:{username:user.user_metadata?.username}}:null;
      const marker=read('session');VaultSession.profile=uid!=='guest'&&marker?.project===C.supabaseUrl&&marker.user?.id===uid?marker.profile:null;
      await acquireLock();
      if(uid!=='guest'&&!cachedOnly){
        try{const remote=await VaultProfileService.load({previewWallet:true});applyRemote(remote,{wallet:data.queue.length===0&&!Object.keys(data.recovery.openRounds).length});}
        catch(e){console.error('VAULT remote load failed',e);const cached=read(`user:${uid}`);profileRemote=!e.vaultComponent&&cached?.version===C.storageVersion&&cached.data?.walletConfirmed===true&&amount(cached.data?.balance)!==null;status(e.vaultComponent?'Не удалось загрузить: '+e.vaultComponent+'. Проверьте SQL-настройку Supabase.':'Offline — прогресс сохранён локально');}
      }
      if(cachedOnly)profileRemote=true;
      if(guestPreferences){Object.assign(data,guestPreferences);data.settingsUpdatedAt=Date.now();enqueue('settings',{settings:{...data.settings,bets:data.bets,lastGame:data.lastGame},updatedAt:new Date(data.settingsUpdatedAt).toISOString()});}
      suppress=true;canonicalBalance=data.balance;restorePreferences();VaultRecovery.restore();suppress=false;
      VaultSession.ready=true;rememberSession();renderIdentity();showSavedScreen();VaultStorage.saveLocalState({preferences:false});
      if(conflict)setTimeout(recoverWallet,0);
      if(!locked&&!conflict&&(uid==='guest'||profileRemote))status(uid==='guest'?'Локальное сохранение':'Sync pending');scheduleSync();
    })();
    try{return await connecting;}finally{connecting=null;connectionUser=null;}
  }
  const VaultAuth=window.VaultAuth={
    get client(){return client;},isConfigured:configured,
    async restoreSession(){
      if(!configured()||location.protocol==='file:')return switchIdentity(null);
      try{
        const sdk=await loadSDK();
        client=sdk.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:NS+'auth'},global:{fetch:async(url,options={})=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{if(String(url).includes('/rest/v1/')){const token=new Headers(options.headers).get('Authorization')?.replace(/^Bearer /,'');let subject=null;try{subject=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub;}catch{}if(owner==='guest'||subject!==owner)throw Error('Queue identity mismatch');}return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}}}});
        client.auth.onAuthStateChange((event,session)=>{
          // Keep asynchronous DB work outside the Supabase auth callback lock.
          setTimeout(()=>{
            if(event==='TOKEN_REFRESHED'&&session?.user?.id===owner){VaultSession.user={id:session.user.id,email:session.user.email,user_metadata:{username:session.user.user_metadata?.username}};rememberSession();return;}
            if(event==='SIGNED_IN'&&session?.user?.id!==owner)switchIdentity(session.user).catch(e=>{console.error('VAULT identity transition deferred',e);status('Завершите раунд перед сменой аккаунта');});
            if(event==='SIGNED_OUT'&&owner!=='guest'&&!connecting){if(VaultRoundService.anyActive()){status('Session expired — данные сохранены локально');return;}switchIdentity(null).catch(e=>console.error('VAULT sign out restore',e));}
          },0);
        });
        const {data:sessionData,error}=await client.auth.getSession();if(error)throw error;
        return await switchIdentity(sessionData.session?.user||null);
      }catch(e){
        console.error('VAULT session restore unavailable',e);
        return switchIdentity(null);
      }
    },
    async signIn(email,password){
      if(authBusy)return {error:'Дождитесь завершения операции'};
      if(VaultRoundService.anyActive())return {error:'Сначала завершите текущий раунд и бонус'};
      if(!client)return {error:'Вход доступен после подключения Supabase'};
      authBusy=true;try{const {data:result,error}=await client.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;await switchIdentity(result.user);return {data:result};}catch(e){console.error('VAULT sign in failed',e);return {error:'Could not sign in'};}finally{authBusy=false;}
    },
    async signUp(email,password,username){
      if(authBusy)return {error:'Дождитесь завершения операции'};
      if(VaultRoundService.anyActive())return {error:'Сначала завершите текущий раунд и бонус'};
      if(!client)return {error:'Регистрация доступна после подключения Supabase'};
      if(!username.trim()||username.length>40)return {error:'Укажите имя до 40 символов'};
      authBusy=true;try{const {data:result,error}=await client.auth.signUp({email:email.trim(),password,options:{data:{username:username.trim()},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;if(result.session)await switchIdentity(result.user,{migrate:true});else migrateGuestStateToUser(result.user?.id);return {data:result,confirmationRequired:!result.session};}catch(e){console.error('VAULT sign up failed',e);return {error:'Could not create account'};}finally{authBusy=false;}
    },
    async signOut(){
      if(authBusy)return {error:'Дождитесь завершения операции'};
      if(VaultRoundService.anyActive())return {error:'Сначала завершите текущий раунд и бонус'};
      authBusy=true;try{await VaultSync.flush();if(client){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;}else{try{localStorage.removeItem(NS+'auth');}catch{}}}catch(e){console.error('VAULT local sign out',e);try{localStorage.removeItem(NS+'auth');}catch{}}
      try{await switchIdentity(null);return {data:true};}catch(e){console.error('VAULT sign out failed',e);return {error:'Could not sign out'};}finally{authBusy=false;}
    },
    migrateGuestStateToUser,
  };
  function migrateGuestStateToUser(uid){
    if(!isId(uid))return false;
    const target=loadBucket(uid);target.settings=copy(data.settings);target.bets=copy(data.bets);target.lastGame=data.lastGame;target.settingsUpdatedAt=Date.now();
    // Never import a guest wallet, payouts, open rounds or bonus entitlement.
    return write(`user:${uid}`,{version:C.storageVersion,updatedAt:Date.now(),data:target});
  }
  let authMode='signin',returnFocus=null;
  function openAuth(mode){authMode=mode;returnFocus=document.activeElement;byId('vaultAuthTitle').textContent=mode==='signup'?'Open your Vault':'Enter the Vault';byId('vaultUsernameField').hidden=mode!=='signup';byId('vaultAuthUsername').required=mode==='signup';byId('vaultAuthPassword').autocomplete=mode==='signup'?'new-password':'current-password';byId('vaultAuthDescription').textContent=mode==='signup'?'Create an account to save your progress.':'Sign in to continue.';byId('vaultAuthSubmit').textContent=mode==='signup'?'CREATE ACCOUNT':'ENTER';byId('vaultAuthMessage').textContent=configured()?'': 'Вход временно недоступен. Проверьте подключение.';byId('vaultAuthSwitch').textContent=mode==='signup'?'Already have an account? SIGN IN':'New to VAULT? CREATE ACCOUNT';if(!byId('vaultAuthDialog').open)byId('vaultAuthDialog').showModal();byId('vaultAuthEmail').focus();}
  function closeAuth(){if(VaultSession.mode!=='authenticated')return;byId('vaultAuthDialog').close();byId('vaultAuthPassword').value='';returnFocus?.focus();}
  byId('vaultAuthSwitch').onclick=()=>{openAuth(authMode==='signin'?'signup':'signin');};
  byId('vaultAuthDialog').addEventListener('cancel',e=>{if(VaultSession.mode!=='authenticated')e.preventDefault();});
  byId('vaultSignIn').onclick=()=>openAuth('signin');byId('vaultSignUp').onclick=()=>openAuth('signup');byId('vaultAuthClose').onclick=closeAuth;
  byId('vaultAuthDialog').addEventListener('close',()=>{byId('vaultAuthPassword').value='';});
  byId('vaultAuthDialog').onclick=e=>{if(e.target===byId('vaultAuthDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeAuth();}};
  byId('vaultAuthForm').onsubmit=async e=>{
    e.preventDefault();const submit=byId('vaultAuthSubmit');submit.disabled=true;submit.textContent=authMode==='signup'?'CREATING…':'ENTERING…';byId('vaultAuthSwitch').disabled=true;byId('vaultAuthMessage').textContent='';
    try{const email=byId('vaultAuthEmail').value,password=byId('vaultAuthPassword').value,username=byId('vaultAuthUsername').value;
      const result=authMode==='signup'?await VaultAuth.signUp(email,password,username):await VaultAuth.signIn(email,password);
      byId('vaultAuthPassword').value='';if(result.error)byId('vaultAuthMessage').textContent=result.error;else if(result.confirmationRequired)byId('vaultAuthMessage').textContent='Проверьте почту и подтвердите аккаунт. Затем войдите.';else closeAuth();
    }finally{submit.disabled=false;submit.textContent=authMode==='signup'?'CREATE ACCOUNT':'ENTER';byId('vaultAuthSwitch').disabled=false;}
  };
  byId('vaultReloadAccount').onclick=async()=>{const button=byId('vaultReloadAccount');button.disabled=true;try{await switchIdentity(VaultSession.user);}finally{button.disabled=false;}};
  document.addEventListener('click',e=>{if(!byId('vaultProfileMenu').contains(e.target))byId('vaultProfileMenu').open=false;});
  byId('vaultProfileMenu').addEventListener('keydown',e=>{if(e.key==='Escape'){byId('vaultProfileMenu').open=false;byId('vaultProfileMenu').querySelector('summary').focus();}});
  byId('vaultSignOut').onclick=async()=>{const result=await VaultAuth.signOut();if(result.error)status(result.error);};
  byId('vaultConflictButton').onclick=recoverWallet;
  document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;if(id&&/(BetMinus|BetPlus|MaxBet|soundToggle|musicToggle|fastGameToggle|fastBonusToggle|scatterBoost)/i.test(id))VaultStorage.schedule();});
  window.addEventListener('pagehide',()=>{VaultStorage.flush();releaseLock?.();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)VaultStorage.flush();});
  window.addEventListener('offline',()=>status('Offline — прогресс сохранён локально'));
  window.addEventListener('online',()=>{if(!client&&configured())VaultAuth.restoreSession().catch(e=>console.error('VAULT reconnect',e));else VaultSync.flush();});
  // A bounded retry timer only sends business events, never frame state.
  setInterval(()=>{if((data.queue.length||conflict)&&!document.hidden)VaultSync.flush();},15000);
  window.saveVaultState=()=>VaultStorage.flush();
  async function boot(){
    try{await VaultAuth.restoreSession();}
    catch(e){console.error('VAULT boot recovery',e);await switchIdentity(null);}
    finally{VaultSession.ready=true;renderIdentity();document.body.classList.remove('vault-booting');byId('vaultBoot').hidden=true;}
  }
  window.vaultReady=boot();
})();
