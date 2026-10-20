/* VAULT data layer. Games keep their canonical state.balance and existing RNG.
 * Only explicit business checkpoints cross this boundary. No frame/DOM serialization. */
(() => {
  'use strict';
  const C=VAULT_CONFIG,NS=`vault:v${C.storageVersion}:`,games=['slot','poker','bird','blackjack','baccarat','swamp','mines','vault_heist','magnet','critter'],screens=['lobby',...games];
  const uuid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16);});
  const isId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  const amount=x=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=1e12?Math.round(Number(x)*1e6)/1e6:null;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const defaults=()=>({balance:C.guestStartingBalance,revision:0,walletConfirmed:false,settings:{sound:true,music:false,fastGame:false,fastBonus:false,scatterBoost:false},bets:{slot:2,poker:2,bird:1,blackjack:2,baccarat:2,swamp:2,mines:2,vault_heist:2,magnet:2,critter:2,critterBoost:false,minesCount:3,baccaratType:'PLAYER'},lastGame:'lobby',settingsUpdatedAt:0,recovery:{slotBonus:null,swampBonus:null,minesRound:null,heistRound:null,magnetRound:null,critterRound:null,openRounds:{}},rounds:[],stats:{},queue:[]});
  const VaultSession=window.VaultSession={mode:'guest',user:null,profile:null,ready:false};
  let authBusy=false;
  let owner='guest',data=defaults(),client=null,clientRevision=0,suppress=false,localTimer=null,syncTimer=null,syncing=null,identityEpoch=0,connecting=null,connectionUser=null,settingsFingerprint='',conflict=false,locked=false,releaseLock=null,lockHeld=false,storageAvailable=true,profileRemote=true;
  let walletPresentation=null;
  let canonicalBalance=state.balance,walletMutation=0,recovering=null,tableSupport=false,tableSupportPromise=null,swampSupport=false,swampSupportPromise=null,swampPurchaseSupport=false,swampBoostSupport=false,minesSupport=false,minesSupportPromise=null;
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
  function validBets(input){const out={slot:2,poker:2,bird:1,blackjack:2,baccarat:2,swamp:2,mines:2,vault_heist:2,magnet:2,critter:2,critterBoost:false,minesCount:3,baccaratType:['PLAYER','BANKER','TIE'].includes(input?.baccaratType)?input.baccaratType:'PLAYER'};for(const game of games){const n=input?.[game],max=game==='bird'?BIRD_BETS.length:BETS.length;if(Number.isInteger(n)&&n>=0&&n<max)out[game]=n;}if(Number.isInteger(input?.minesCount)&&input.minesCount>=1&&input.minesCount<=24)out.minesCount=input.minesCount;if(typeof input?.critterBoost==='boolean')out.critterBoost=input.critterBoost;return out;}
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
    out.recovery.slotBonus=validBonus(x.recovery?.slotBonus);out.recovery.swampBonus=SWAMP_MODEL.validateBonus(x.recovery?.swampBonus);out.recovery.minesRound=MINES_MODEL.validate(x.recovery?.minesRound);out.recovery.heistRound=VAULT_HEIST_MODEL.validate(x.recovery?.heistRound);
    out.recovery.magnetRound=MAGNET_ROUNDS.validate(x.recovery?.magnetRound);
    out.recovery.critterRound=CRITTER_MODEL.validate(x.recovery?.critterRound);
    for(const game of games){const r=x.recovery?.openRounds?.[game];if(validRound(r)&&r.gameId===game&&r.status==='started'&&(game!=='mines'||out.recovery.minesRound?.status==='PLAYING'&&out.recovery.minesRound.roundId===r.roundId))out.recovery.openRounds[game]=copy(r);}
    out.rounds=Array.isArray(x.rounds)?x.rounds.filter(validRound).slice(-C.maxLocalRounds):[];
    out.stats=x.stats&&typeof x.stats==='object'?x.stats:{};
    // Versioned, owner-bound queue; reject unknown RPCs and corrupt envelope data.
    out.queue=Array.isArray(x.queue)?x.queue.filter(e=>e&&e.userId===id&&isId(e.id)&&['begin','settle','settings','mines','heist','magnet','critter'].includes(e.type)&&e.payload&&typeof e.payload==='object'&&(e.type!=='heist'||VAULT_HEIST_MODEL.validate(e.payload.p_checkpoint)&&e.payload.p_round_id===e.payload.p_checkpoint.roundId&&Number.isSafeInteger(e.payload.p_expected_revision)&&e.payload.p_expected_revision>=0&&Number.isInteger(e.payload.p_previous_step)&&e.payload.p_previous_step>=-1&&e.payload.p_previous_step<24&&e.payload.p_checkpoint.step===e.payload.p_previous_step+1)&&(e.type!=='magnet'||MAGNET_ROUNDS.validate(e.payload.p_checkpoint)&&e.payload.p_round_id===e.payload.p_checkpoint.roundId&&Number.isSafeInteger(e.payload.p_expected_revision)&&e.payload.p_expected_revision>=0&&Number.isInteger(e.payload.p_previous_step)&&e.payload.p_previous_step>=-1&&e.payload.p_previous_step<12&&e.payload.p_checkpoint.step===e.payload.p_previous_step+1)&&(e.type!=='critter'||CRITTER_MODEL.validate(e.payload.p_checkpoint)&&e.payload.p_round_id===e.payload.p_checkpoint.roundId&&Number.isSafeInteger(e.payload.p_expected_revision)&&e.payload.p_expected_revision>=0)).slice(0,C.maxPendingEvents):[];
    return out;
  }
  function capturePreferences(){
    const settings={sound:state.sound,music:state.music,fastGame:state.fastGame,fastBonus:state.fastBonus,scatterBoost:state.scatterBoost};
    const bets={slot:state.betIndex,poker:pokerState.betIndex,bird:birdState.betIndex,...VaultTables.preferences(),swamp:VaultSwamp.betIndex,...VaultMines.preferences(),vault_heist:VaultHeist.betIndex,magnet:VaultMagnet.betIndex,critter:VaultCritter.betIndex,critterBoost:VaultCritter.scatterBoost};
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
    formatBalance:()=>owner!=='guest'&&!data.walletConfirmed?'—':(walletPresentation?.owner===owner&&currentGame===walletPresentation.game?walletPresentation.balance:canonicalBalance).toLocaleString('ru-RU',{maximumFractionDigits:6}),
    holdPresentation(game,{stake=0}={}){if(['swamp','magnet','critter'].includes(game))walletPresentation={owner,game,balance:canonicalBalance-(['magnet','critter'].includes(game)?stake:0)};},
    releasePresentation(game){if(walletPresentation?.game===game){walletPresentation=null;refreshBalanceUI();}},
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
  let heistSupport=false,heistFeatures=false;
  window.VaultHeistBridge={
    get ready(){return heistSupport;},get featuresReady(){return heistFeatures;},
    async connect(){if(heistSupport)return true;if(!client||owner==='guest')return false;const cached=read('heist-schema'),known=cached?.version===1&&cached.project===C.supabaseUrl;if(!navigator.onLine&&known){heistSupport=true;heistFeatures=cached.features===true;return true;}try{const r=await client.rpc('heist_capabilities');if(r.error){if(known&&/fetch|network|offline/i.test(r.error.message||'')){heistSupport=true;heistFeatures=cached.features===true;return true;}return false;}heistSupport=r.data?.version>=1;heistFeatures=r.data?.purchaseVersion===1&&r.data?.boostVersion===1;if(heistSupport)write('heist-schema',{version:1,features:heistFeatures,project:C.supabaseUrl});return heistSupport;}catch{return false;}},
    commit(candidate){
      if(!heistSupport||!VaultRoundService.canPlay('vault_heist'))return false;
      const r=VAULT_HEIST_MODEL.validate(candidate),previous=data.recovery.heistRound;
      if(!r||r.version===2&&!heistFeatures||data.queue.length>=C.maxPendingEvents-2||!storageAvailable)return false;
      const start=r.step===0&&r.roundId!==previous?.roundId;
      if(start&&(VAULT_HEIST_MODEL.active(previous)||VAULT_HEIST_MODEL.cost(r)>canonicalBalance)||!start&&(previous?.roundId!==r.roundId||!VAULT_HEIST_MODEL.active(previous)||r.step!==previous.step+1))return false;
      const delta=(start?-VAULT_HEIST_MODEL.cost(r):0)+(r.status==='SETTLED'?r.payout:0);if(amount(canonicalBalance+delta)===null)return false;
      enqueue('heist',{p_round_id:r.roundId,p_previous_step:start?-1:previous.step,p_expected_revision:clientRevision,p_checkpoint:r});clientRevision++;
      data.recovery.heistRound=copy(r);canonicalBalance=amount(canonicalBalance+delta);data.balance=canonicalBalance;walletMutation++;
      if(r.status==='SETTLED'){
       const record={roundId:r.roundId,gameId:'vault_heist',status:'settled',bet:VAULT_HEIST_MODEL.cost(r),stake:r.bet,payout:r.payout,multiplier:r.payout/r.bet,result:r.result,metadata:{purchaseType:r.purchaseType||null,scatterBoost:!!r.scatterBoost,baseBet:r.bet,cost:VAULT_HEIST_MODEL.cost(r),baseWin:r.baseWinX,heistTriggered:!!r.purchaseType||r.step>0||r.outcome.scatters>=3,startStage:0,maxStageReached:r.maxStage,decisions:r.decisions,heistLoot:r.lootX,alarmFailure:r.result==='alarm',collected:r.result!=='alarm',finalPayout:r.payout,maxRiskReached:r.maxRisk},startedAt:Date.now(),settledAt:Date.now()};
       if(!data.rounds.some(x=>x.roundId===r.roundId)){data.rounds.push(record);data.rounds=data.rounds.slice(-C.maxLocalRounds);localStats(record);}
      }
      VaultStorage.saveLocalState();refreshBalanceUI();return true;
    }
  };
  // Critter is a whole deterministic paid round: one atomic debit/credit, even through bonus animation.
  let critterSupport=false,critterConnection=null,critterConnectionError='';
  window.VaultCritterBridge={
    get ready(){return critterSupport;},
    get connectionError(){return critterConnectionError;},
    async connect(){
      if(critterSupport)return true;if(!client||owner==='guest')return false;
      if(critterConnection)return critterConnection;
      const known=read('critter-schema'),cached=known?.version===3&&known.project===C.supabaseUrl;
      if(!navigator.onLine&&cached){critterSupport=true;return true;}
      critterConnectionError='';const expectedOwner=owner;
      critterConnection=(async()=>{
        for(let attempt=0;attempt<3;attempt++){
          try{
            const {data:cap,error,status:responseStatus}=await client.rpc('critter_capabilities');
            if(owner!==expectedOwner)return false;
            if(error){
              const temporary=!responseStatus||responseStatus>=500||/fetch|network|offline|abort|timeout/i.test(error.message||'');
              if(temporary&&cached){critterSupport=true;return true;}
              if(temporary&&attempt<2){await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));continue;}
              critterConnectionError=error.code==='PGRST202'||responseStatus===404?'schema':responseStatus===401||responseStatus===403||error.code==='42501'?'permission':'connection';
              console.error('VAULT Critter connection failed',{code:error.code,status:responseStatus,message:error.message});return false;
            }
            critterSupport=cap?.version>=2&&cap?.featuresVersion===3;
            if(critterSupport)write('critter-schema',{version:3,project:C.supabaseUrl});else critterConnectionError='version';
            return critterSupport;
          }catch(error){
            if(owner!==expectedOwner)return false;
            if(attempt<2){await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));continue;}
            critterConnectionError='connection';console.error('VAULT Critter connection failed',error);return false;
          }
        }
        return false;
      })();
      try{return await critterConnection;}finally{critterConnection=null;}
    },
    commit(candidate){
      if(!critterSupport||!VaultRoundService.canPlay('critter')||!storageAvailable||data.queue.length>=C.maxPendingEvents-2)return false;
      const r=CRITTER_MODEL.validate(candidate);if(!r||CRITTER_MODEL.cost(r)>canonicalBalance||data.rounds.some(x=>x.roundId===r.roundId)||data.recovery.critterRound?.roundId===r.roundId)return false;
      const balance=amount(canonicalBalance-CRITTER_MODEL.cost(r)+r.payout);if(balance===null)return false;
      const rollback={balance:canonicalBalance,revision:clientRevision,mutation:walletMutation,queue:[...data.queue],rounds:[...data.rounds],stats:data.stats.critter?copy(data.stats.critter):null,checkpoint:data.recovery.critterRound};
      if(enqueue('critter',{p_round_id:r.roundId,p_expected_revision:clientRevision,p_checkpoint:r})===false)return false;
      clientRevision++;canonicalBalance=balance;data.balance=balance;walletMutation++;data.recovery.critterRound=copy(r);
      const record={roundId:r.roundId,gameId:'critter',status:'settled',bet:CRITTER_MODEL.cost(r),stake:r.bet,payout:r.payout,multiplier:r.winX,result:r.result,metadata:{seed:r.seed,purchaseType:r.purchaseType||null,scatterBoost:!!r.scatterBoost,baseBet:r.bet,cost:CRITTER_MODEL.cost(r),bonus:!!r.bonus,cascades:r.base.steps.length+(r.bonus?.spins||[r.bonus?.plan]).filter(Boolean).reduce((n,p)=>n+p.steps.length,0),runningWilds:[r.base,...(r.bonus?.spins||(r.bonus?[r.bonus.plan]:[]))].flatMap(p=>p.steps).reduce((n,s)=>n+s.moves.length,0)},startedAt:Date.now(),settledAt:Date.now()};
      data.rounds.push(record);data.rounds=data.rounds.slice(-C.maxLocalRounds);localStats(record);
      if(!VaultStorage.saveLocalState()){
        canonicalBalance=rollback.balance;data.balance=rollback.balance;clientRevision=rollback.revision;walletMutation=rollback.mutation;data.queue=rollback.queue;data.rounds=rollback.rounds;data.recovery.critterRound=rollback.checkpoint;
        if(rollback.stats)data.stats.critter=rollback.stats;else delete data.stats.critter;return false;
      }
      refreshBalanceUI();return true;
    }
  };
  // MAGNET owns only its checkpoint; the existing canonical wallet and outbox own money.
  let magnetSupport=false,magnetFeatures=false;
  window.VaultMagnetBridge={
    get ready(){return magnetSupport;},
    get featuresReady(){return magnetFeatures;},
    async connect(){
      if(magnetSupport)return true;if(!client||owner==='guest')return false;
      const known=read('magnet-schema'),cached=known?.version===1&&known.project===C.supabaseUrl;
      if(!navigator.onLine&&cached){magnetSupport=true;magnetFeatures=known.featuresVersion===2;return true;}
      try{const {data:cap,error}=await client.rpc('magnet_capabilities');if(error){if(cached&&/fetch|network|offline/i.test(error.message||'')){magnetSupport=true;magnetFeatures=known.featuresVersion===2;return true;}return false;}magnetSupport=cap?.version===1;magnetFeatures=cap?.featuresVersion===2;if(magnetSupport)write('magnet-schema',{version:1,featuresVersion:magnetFeatures?2:0,project:C.supabaseUrl});return magnetSupport;}catch{return false;}
    },
    commit(candidate){
      if(!magnetSupport||!VaultRoundService.canPlay('magnet')||!storageAvailable||data.queue.length>=C.maxPendingEvents-2)return false;
      const r=MAGNET_ROUNDS.validate(candidate),previous=data.recovery.magnetRound;if(!r||r.version===2&&!magnetFeatures)return false;
      const start=r.step===0&&r.roundId!==previous?.roundId;
      if(start&&(MAGNET_ROUNDS.active(previous)||r.bet>canonicalBalance)||!start&&(previous?.roundId!==r.roundId||!MAGNET_ROUNDS.active(previous)||r.step!==previous.step+1))return false;
      const nextBalance=amount(canonicalBalance-(start?r.bet:0)+(r.status==='SETTLED'?r.payout:0));if(nextBalance===null)return false;
      const rollback={balance:canonicalBalance,revision:clientRevision,mutation:walletMutation,queue:[...data.queue],rounds:[...data.rounds],stats:data.stats.magnet?copy(data.stats.magnet):null};
      if(enqueue('magnet',{p_round_id:r.roundId,p_previous_step:start?-1:previous.step,p_expected_revision:clientRevision,p_checkpoint:r})===false)return false;
      clientRevision++;data.recovery.magnetRound=copy(r);canonicalBalance=nextBalance;data.balance=nextBalance;walletMutation++;
      if(r.status==='SETTLED'&&!data.rounds.some(x=>x.roundId===r.roundId)){
        const record={roundId:r.roundId,gameId:'magnet',status:'settled',bet:r.bet,stake:r.bet,payout:r.payout,multiplier:r.payout/r.bet,result:r.result,metadata:{seed:r.seed,version:r.version,chamber:r.version===2&&r.bonus.triggered,overdrive:r.version===1&&r.bonus.triggered,wheel:r.spins[0].wheel?.id||null,bonusSpins:r.step,magneticPhases:r.spins.reduce((n,p)=>n+p.phaseCount,0),movements:r.spins.reduce((n,p)=>n+p.orderedEffects.filter(e=>e.from!==undefined).length,0)},startedAt:Date.now(),settledAt:Date.now()};
        data.rounds.push(record);data.rounds=data.rounds.slice(-C.maxLocalRounds);localStats(record);
      }
      if(!VaultStorage.saveLocalState()){
        canonicalBalance=rollback.balance;data.balance=rollback.balance;clientRevision=rollback.revision;walletMutation=rollback.mutation;data.queue=rollback.queue;data.rounds=rollback.rounds;data.recovery.magnetRound=previous;
        if(rollback.stats)data.stats.magnet=rollback.stats;else delete data.stats.magnet;return false;
      }
      refreshBalanceUI();return true;
    }
  };
  function stableRecovery(){return {slotBonus:data.recovery.slotBonus,swampBonus:data.recovery.swampBonus,minesRound:data.recovery.minesRound};}
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
    async checkMinesSupport(){
      if(minesSupport)return true;if(minesSupportPromise)return minesSupportPromise;if(!client||VaultSession.mode!=='authenticated')return false;
      const cached=read('mines-schema');if(!navigator.onLine&&cached?.version===1&&cached.project===C.supabaseUrl){minesSupport=true;return true;}
      minesSupportPromise=(async()=>{try{const {data:result,error}=await client.rpc('mines_capabilities');if(error)throw error;minesSupport=result?.version===1;if(minesSupport){write('mines-schema',{version:1,project:C.supabaseUrl});settingsFingerprint='';VaultStorage.schedule();}return minesSupport;}catch(e){if(cached?.version===1&&cached.project===C.supabaseUrl&&/fetch|network|offline/i.test(e.message||'')){minesSupport=true;return true;}console.error('VAULT mines schema unavailable',e);return false;}finally{minesSupportPromise=null;}})();return minesSupportPromise;
    },
    get minesSupport(){return minesSupport;},
    async checkSwampSupport(){
      if(swampSupport)return true;if(swampSupportPromise)return swampSupportPromise;if(!client||VaultSession.mode!=='authenticated')return false;
      const cached=read('swamp-schema');
      if(!navigator.onLine&&cached?.version>=1&&cached.project===C.supabaseUrl){swampSupport=true;swampPurchaseSupport=cached.purchaseVersion===1;swampBoostSupport=cached.boostVersion===1;return true;}
      swampSupportPromise=(async()=>{try{const {data:result,error}=await client.rpc('swamp_slot_capabilities');if(error)throw error;swampSupport=result?.version>=1;swampPurchaseSupport=result?.purchaseVersion===1;swampBoostSupport=result?.boostVersion===1;if(swampSupport){write('swamp-schema',{version:result.version,purchaseVersion:result.purchaseVersion||0,boostVersion:result.boostVersion||0,project:C.supabaseUrl});settingsFingerprint='';VaultStorage.schedule();}return swampSupport;}catch(e){if(cached?.version>=1&&cached.project===C.supabaseUrl&&/fetch|network|offline/i.test(e.message||'')){swampSupport=true;swampPurchaseSupport=cached.purchaseVersion===1;swampBoostSupport=cached.boostVersion===1;return true;}console.error('VAULT swamp schema unavailable',e);return false;}finally{swampSupportPromise=null;}})();return swampSupportPromise;
    },
    get swampSupport(){return swampSupport;},get swampPurchaseSupport(){return swampPurchaseSupport;},get swampBoostSupport(){return swampBoostSupport;},
    async checkTableSupport(){
      if(tableSupport)return true;if(tableSupportPromise)return tableSupportPromise;
      if(!client||VaultSession.mode!=='authenticated')return false;
      const cached=read('table-schema');if(!navigator.onLine&&cached?.version===1&&cached.project===C.supabaseUrl){tableSupport=true;return true;}
      tableSupportPromise=(async()=>{try{const {data:result,error}=await client.rpc('table_games_capabilities');if(error)throw error;tableSupport=result?.version===1;if(tableSupport)write('table-schema',{version:1,project:C.supabaseUrl});return tableSupport;}catch(e){if(cached?.version===1&&cached.project===C.supabaseUrl&&/fetch|network|offline/i.test(e.message||'')){tableSupport=true;return true;}console.error('VAULT table schema unavailable',e);return false;}finally{tableSupportPromise=null;}})();return tableSupportPromise;
    },
    get tableSupport(){return tableSupport;},
    canPlay(game){
      if(window.VaultAccess?.isBlocked&&!data.recovery.openRounds[game]&&!(game==='slot'&&state.bonus&&state.freeSpins>0)&&!(game==='swamp'&&data.recovery.swampBonus?.remaining>0)&&!(game==='vault_heist'&&VAULT_HEIST_MODEL.active(data.recovery.heistRound))&&!(game==='magnet'&&MAGNET_ROUNDS.active(data.recovery.magnetRound))){toast('Новые ставки приостановлены администратором');return false;}
      if(game==='magnet'&&!magnetSupport)return false;
      if(game==='critter'&&!critterSupport)return false;
      if(game==='vault_heist'&&!heistSupport)return false;
      if(game==='mines'&&!minesSupport)return false;
      if(game==='swamp'&&!swampSupport)return false;
      if(['blackjack','baccarat'].includes(game)&&!tableSupport)return false;
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
      if(gameId==='swamp'&&metadata.purchaseType)VaultSwamp.attachPurchaseRound(round.roundId);
      if(gameId==='mines'){VaultMines.attachRound(round.roundId);round.metadata.mines=VaultMines.getCheckpoint();metadata.mines=round.metadata.mines;data.recovery.minesRound=MINES_MODEL.validate(round.metadata.mines);}
      data.recovery.openRounds[gameId]=round;
      suppress=true;VaultWalletService.applyDelta(-wager,{gameId});suppress=false;
      // A consumed free spin/purchased entitlement is checkpointed before the first await.
      if(gameId==='slot')VaultRecovery.checkpointSlot({save:false});
      if(gameId==='swamp')VaultRecovery.checkpointSwamp({save:false});
      if(owner!=='guest')enqueue('begin',{p_round_id:round.roundId,p_game_id:gameId,p_bet:wager,p_expected_revision:clientRevision,p_metadata:metadata,p_recovery:stableRecovery()});
      clientRevision++;VaultStorage.saveLocalState();refreshBalanceUI();return round.roundId;
    },
    settleWithPayout(gameId,payout,result,metadata={}){
      if(!['swamp','mines'].includes(gameId)||!data.recovery.openRounds[gameId]||amount(payout)===null)return false;
      suppress=true;
      try{if(gameId==='swamp')VaultRecovery.checkpointSwamp({save:false});else VaultRecovery.checkpointMines({save:false,remote:false});VaultWalletService.applyDelta(payout,{gameId});this.finish(gameId,result,'settled',metadata);}
      finally{suppress=false;}
      VaultStorage.saveLocalState();refreshBalanceUI();return true;
    },
    addStake(gameId,value){
      const round=data.recovery.openRounds[gameId],n=amount(value);
      if(window.VaultAccess?.isBlocked)return false;
      if(gameId!=='blackjack'||!round||round.metadata.doubled||n===null||n!==round.stake||n>canonicalBalance)return false;
      round.bet=amount(round.bet+n);round.stake=round.bet;round.metadata.doubled=true;
      suppress=true;VaultWalletService.applyDelta(-n,{gameId});suppress=false;VaultStorage.saveLocalState();refreshBalanceUI();return true;
    },
    finish(gameId,result='completed',statusValue='settled',metadata={}){
      const round=data.recovery.openRounds[gameId];if(!round)return false;
      round.status=statusValue;round.result=String(result).slice(0,200);round.metadata={...round.metadata,...metadata};round.multiplier=round.stake?amount(round.payout/round.stake)||0:0;round.settledAt=Date.now();
      delete data.recovery.openRounds[gameId];VaultStatsService.recordRound(round);VaultStorage.saveLocalState();return true;
    },
    get:game=>copy(data.recovery.openRounds[game]||null),
    anyActive:({ignoreMines=false}={})=>!locked&&(VaultCritter.isBusy||VaultMagnet.isBusy||VaultHeist.isBusy||VaultSwamp.isBusy||state.busy||birdState.active||(pokerState.phase!=='idle'&&!pokerState.resolved)||state.bonusAutoRunning||Object.keys(data.recovery.openRounds).some(game=>!ignoreMines||game!=='mines')),
  };
  const VaultRecovery=window.VaultRecovery={
    checkpointMines({save=true,remote=true}={}){const checkpoint=MINES_MODEL.validate(VaultMines.getCheckpoint());data.recovery.minesRound=checkpoint;const r=data.recovery.openRounds.mines;if(r&&checkpoint?.roundId===r.roundId)r.metadata.mines=copy(checkpoint);if(remote&&r&&checkpoint?.status==='PLAYING'&&owner!=='guest')enqueue('mines',{p_round_id:r.roundId,p_checkpoint:checkpoint});if(save)VaultStorage.saveLocalState();},
    restoreMines(){
      const checkpoint=MINES_MODEL.validate(data.recovery.minesRound);data.recovery.minesRound=checkpoint;
      if(checkpoint?.status==='PLAYING')data.recovery.openRounds.mines={roundId:checkpoint.roundId,gameId:'mines',status:'started',bet:checkpoint.bet,stake:checkpoint.bet,payout:0,result:'',metadata:{mineCount:checkpoint.mineCount,seed:checkpoint.seed,mines:checkpoint},startedAt:Date.now()};
      else delete data.recovery.openRounds.mines;
      VaultMines.restore(checkpoint);
    },
    checkpointSwamp({save=true}={}){data.recovery.swampBonus=SWAMP_MODEL.validateBonus(VaultSwamp.getCheckpoint());if(save)VaultStorage.saveLocalState();},
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
      if(!locked)for(const game of games)if(game!=='mines')this.cancelInterrupted(game);
      this.restoreMines();
      state.busy=false;state.activeSpinFast=null;state.bonusAutoRunning=false;state.bonusAutoNotBefore=0;autoState.active=false;autoState.remaining=0;
      clearTimeout(autoState.timer);clearTimeout(bonusAutoTimer);bonusAutoTimer=null;
      pokerState.deck=[];pokerState.discard=[];pokerState.player=[];pokerState.dealer=[];pokerState.community=[];pokerState.choice=[];pokerState.phase='idle';pokerState.resolved=false;pokerState.winner='';pokerState.result='';pokerState.playerEval=null;pokerState.dealerEval=null;pokerState.peekUntil=0;pokerState.dealerHiddenRevealed=false;pokerState.tacticalUsed=false;pokerState.spent=0;
      resetBirdRecovery();VaultTables.reset();VaultSwamp.restore(data.recovery.swampBonus);VaultHeist.restore(data.recovery.heistRound);
      VaultMagnet.restore(data.recovery.magnetRound);VaultCritter.restore(data.recovery.critterRound);
      const b=validBonus(data.recovery.slotBonus);
      state.bonus=!!b&&b.freeSpins>0;state.bonusType=b?.type||'normal';state.slotProfile=state.bonus?b.type:'base';state.size=state.bonus?b.size:5;state.freeSpins=state.bonus?b.freeSpins:0;state.bonusLevel=state.bonus?b.level:0;state.scatterProgress=state.bonus?b.progress:0;state.bonusSpinsPlayed=state.bonus?b.spins:0;state.bonusTotalWin=state.bonus?b.totalWin:0;state.bonusCascades=state.bonus?b.cascades:0;state.bonusPurchaseCost=state.bonus?b.purchaseCost:0;state.sticky=new Map(state.bonus?b.sticky.map(([k,v])=>[k.replace(',',':'),v]):[]);state.grid=blankGrid(state.size);state.cascade=0;state.lastWin=0;state.pendingBonusPurchaseCost=0;
      document.body.classList.toggle('bonus',state.bonus);fillGrid();render();
    },
    cancelInterrupted(game){const r=data.recovery.openRounds[game];if(r)VaultRoundService.finish(game,'interrupted','cancelled',{recovery:'safe-reset-no-refund'});},
  };
  function restorePreferences(){Object.assign(state,data.settings);state.betIndex=data.bets.slot;pokerState.betIndex=data.bets.poker;birdState.betIndex=data.bets.bird;VaultTables.restore(data.bets);VaultSwamp.betIndex=data.bets.swamp;VaultMines.restorePreferences(data.bets);VaultHeist.betIndex=data.bets.vault_heist;VaultMagnet.betIndex=data.bets.magnet;VaultCritter.betIndex=data.bets.critter;VaultCritter.scatterBoost=data.bets.critterBoost;settingsFingerprint=JSON.stringify({settings:data.settings,bets:data.bets,lastGame:data.lastGame});}
  function showSavedScreen(){if(VaultSession.mode!=='authenticated'){openLobby();return;}const open={lobby:openLobby,slot:openSlotGame,poker:openPokerGame,bird:openBirdGame,blackjack:()=>VaultTables.open('blackjack'),baccarat:()=>VaultTables.open('baccarat'),swamp:()=>VaultSwamp.open(),mines:()=>VaultMines.open(),vault_heist:()=>VaultHeist.open(),magnet:()=>VaultMagnet.open(),critter:()=>VaultCritter.open()};open[data.lastGame]();updateUI();updatePokerUI();updateBirdUI();drawBirdGame();updateSettingsUI();}
  function renderIdentity(){
    const signedIn=VaultSession.mode==='authenticated';byId('vaultProfileMenu').open=false;document.body.classList.toggle('vault-signed-out',!signedIn);
    document.querySelector('.lobby .lobby-balance').hidden=!signedIn;
    if(signedIn){if(byId('vaultAuthDialog').open)byId('vaultAuthDialog').close();}else if(!byId('vaultAuthDialog').open)openAuth('signin');
    byId('vaultGuestActions').hidden=VaultSession.mode==='authenticated';byId('vaultUserActions').hidden=VaultSession.mode!=='authenticated';
    const username=VaultSession.profile?.username||VaultSession.user?.user_metadata?.username||'Player';byId('vaultUsername').textContent=username;byId('vaultInitials').textContent=username.slice(0,1).toUpperCase();
    const avatar=VaultSession.profile?.avatar_url,node=byId('vaultAvatar');if(typeof avatar==='string'&&/^https:\/\//.test(avatar)){node.src=avatar;node.hidden=false;byId('vaultInitials').hidden=true;}else{node.removeAttribute('src');node.hidden=true;byId('vaultInitials').hidden=false;}
    byId('vaultConflictButton').hidden=true;byId('vaultReloadAccount').hidden=!signedIn||profileRemote;window.VaultAdmin?.identity();
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
    if(wallet&&remote.rounds.some(r=>!['mines','vault_heist','magnet','critter'].includes(r.game_id))){conflict=true;status('Восстанавливаем раздачу…');}
    if(wallet){canonicalBalance=amount(remote.wallet.balance);data.balance=canonicalBalance;data.walletConfirmed=true;data.revision=Number(remote.wallet.revision)||0;clientRevision=data.revision;data.recovery.slotBonus=validBonus(remote.wallet.recovery?.slotBonus);data.recovery.swampBonus=SWAMP_MODEL.validateBonus(remote.wallet.recovery?.swampBonus);data.recovery.minesRound=MINES_MODEL.validate(remote.wallet.recovery?.minesRound);data.recovery.heistRound=VAULT_HEIST_MODEL.validate(remote.wallet.recovery?.heistRound);}
    if(wallet)data.recovery.magnetRound=MAGNET_ROUNDS.validate(remote.wallet.recovery?.magnetRound);
    if(wallet)data.recovery.critterRound=CRITTER_MODEL.validate(remote.wallet.recovery?.critterRound);
    const s=remote.settings,ts=Date.parse(s.updated_at)||0;
    if(ts>=data.settingsUpdatedAt){data.settings={sound:s.sound_enabled,music:s.music_enabled,fastGame:s.fast_mode,fastBonus:s.fast_bonus,scatterBoost:s.scatter_boost};data.bets=validBets(s.selected_bets);data.lastGame=screens.includes(s.last_game_id)?s.last_game_id:'lobby';data.settingsUpdatedAt=ts;}
    if(wallet)data.stats=Object.fromEntries(remote.stats.map(s=>[s.game_id,s]));rememberSession();
  }
  // Rebase business events automatically at a stable boundary, never midway through gameplay.
  function recoverWallet(){
    if(recovering)return recovering;
    if(conflict&&!state.busy&&!data.recovery.openRounds.slot){if(autoState.active)stopAutoplay();if(state.bonusAutoRunning){state.bonusAutoRunning=false;clearTimeout(bonusAutoTimer);bonusAutoTimer=null;}}
    if(!conflict||!client||owner==='guest'||locked||!navigator.onLine||VaultRoundService.anyActive({ignoreMines:true}))return;
    const uid=owner,epoch=identityEpoch;
    recovering=(async()=>{
      try{
        if(syncing)await syncing;
        if(owner!==uid||identityEpoch!==epoch||VaultRoundService.anyActive({ignoreMines:true}))return;
        const events=copy(data.queue),ids=[...new Set(events.filter(e=>e.type!=='settings').map(e=>e.payload.p_round_id))];
        const queries=[client.from('wallets').select('*').eq('user_id',uid).single(),client.from('game_rounds').select('round_id,game_id,bet,payout,status').eq('user_id',uid).eq('status','started')];
        if(ids.length)queries.push(client.from('game_rounds').select('round_id,game_id,bet,payout,status').eq('user_id',uid).in('round_id',ids));
        const results=await Promise.all(queries);for(const r of results)if(r.error)throw r.error;
        if(owner!==uid||identityEpoch!==epoch||VaultRoundService.anyActive({ignoreMines:true}))return;
        let wallet=results[0].data;const known=new Map([...(results[1].data||[]),...(results[2]?.data||[])].map(r=>[r.round_id,r]));
        // A previous-device/reload round without local business events is abandoned: no refund or new payout.
        for(const round of results[1].data||[]){
          if(ids.includes(round.round_id)||['mines','vault_heist','magnet','critter'].includes(round.game_id))continue;
          const result=await client.rpc('record_game_round',{p_round_id:round.round_id,p_game_id:round.game_id,p_bet:round.bet,p_payout:0,p_multiplier:0,p_result:'automatic-recovery',p_metadata:{recovery:'safe-reset-no-refund'},p_status:'cancelled',p_recovery:wallet.recovery||{}});
          if(result.error)throw result.error;if(owner!==uid||identityEpoch!==epoch)return;
          wallet={...wallet,...result.data};
        }
        let balance=amount(wallet.balance),revision=Number(wallet.revision);if(balance===null||!Number.isSafeInteger(revision))throw Error('Invalid remote wallet');
        const rejected=new Set(),accepted=new Set([...known].filter(([,r])=>r.status==='started').map(([id])=>id));
        const next=[];let critterCursor=CRITTER_MODEL.validate(wallet.recovery?.critterRound);let magnetCursor=MAGNET_ROUNDS.validate(wallet.recovery?.magnetRound);let heistCursor=VAULT_HEIST_MODEL.validate(wallet.recovery?.heistRound);let minesCursor=MINES_MODEL.validate(wallet.recovery?.minesRound);const mineRewinds=new Set();let swampCursor=SWAMP_MODEL.validateBonus(wallet.recovery?.swampBonus);const swampForks=new Set();
        for(const event of data.queue){
          if(event.userId!==uid)throw Error('Queue identity mismatch');
          if(event.type==='settings'){next.push(event);continue;}
          const payload=event.payload,id=payload.p_round_id,round=known.get(id);
          if(event.type==='critter'){
            const candidate=CRITTER_MODEL.validate(payload.p_checkpoint);if(!candidate)continue;
            if(round&&round.status==='settled')continue;
            if(CRITTER_MODEL.cost(candidate)>balance||window.VaultAccess?.isBlocked){rejected.add(id);continue;}
            payload.p_expected_revision=revision;balance=amount(balance-CRITTER_MODEL.cost(candidate)+candidate.payout);revision++;critterCursor=candidate;next.push(event);continue;
          }
          if(event.type==='magnet'){
            const candidate=MAGNET_ROUNDS.validate(payload.p_checkpoint);if(!candidate)continue;
            if(round&&round.status!=='started')continue;
            if(magnetCursor?.roundId===id&&magnetCursor.step>=candidate.step)continue;
            if(payload.p_previous_step===-1){if(MAGNET_ROUNDS.active(magnetCursor)||candidate.bet>balance||window.VaultAccess?.isBlocked)continue;}
            else if(magnetCursor?.roundId!==id||magnetCursor.step!==payload.p_previous_step)continue;
            payload.p_expected_revision=revision;balance=amount(balance-(payload.p_previous_step===-1?candidate.bet:0)+(candidate.status==='SETTLED'?candidate.payout:0));revision++;magnetCursor=candidate;next.push(event);continue;
          }
          if(event.type==='heist'){
            const candidate=VAULT_HEIST_MODEL.validate(payload.p_checkpoint);if(!candidate)continue;
            if(round&&round.status!=='started')continue;
            if(heistCursor?.roundId===id&&heistCursor.step>=candidate.step)continue;
            if(payload.p_previous_step===-1){if(heistCursor&&VAULT_HEIST_MODEL.active(heistCursor)||VAULT_HEIST_MODEL.cost(candidate)>balance||window.VaultAccess?.isBlocked)continue;}
            else if(heistCursor?.roundId!==id||heistCursor.step!==payload.p_previous_step)continue;
            payload.p_expected_revision=revision;balance=amount(balance-(payload.p_previous_step===-1?VAULT_HEIST_MODEL.cost(candidate):0)+(candidate.status==='SETTLED'?candidate.payout:0));revision++;heistCursor=candidate;next.push(event);continue;
          }
          // A remote Mines round is the stable cursor. Discard a stale local branch without replaying its picks or payout.
          if((payload.p_game_id==='mines'||event.type==='mines')&&round){mineRewinds.add(id);continue;}
          if(event.type==='mines'){if(accepted.has(id)){minesCursor=MINES_MODEL.validate(payload.p_checkpoint);next.push(event);}continue;}

          if(round&&round.status!=='started')continue; // Server already settled this UUID; never repeat its payout.
          if(event.type==='begin'){
            if(payload.p_game_id==='swamp'&&!accepted.has(id)){
              const m=payload.p_metadata||{},isFree=m.freeSpin===true,feature=m.featureId;
              if(isFree&&(swampForks.has(feature)||rejected.has(feature)||!swampCursor||swampCursor.featureId!==feature||swampCursor.remaining<1||m.freeSpinIndex!==swampCursor.spinsPlayed+1)||!isFree&&swampCursor?.remaining>0){rejected.add(id);if(feature)swampForks.add(feature);continue;}
              if(isFree)swampCursor={...swampCursor,remaining:swampCursor.remaining-1,spinsPlayed:swampCursor.spinsPlayed+1};else swampCursor=m.purchaseType?SWAMP_MODEL.validateBonus(payload.p_recovery?.swampBonus):null;
              payload.p_recovery={...payload.p_recovery,swampBonus:swampCursor};
            }
            if(!accepted.has(id)){
              if(payload.p_bet>0&&window.VaultAccess?.isBlocked||amount(payload.p_bet)===null||payload.p_bet>balance){rejected.add(id);continue;}
              payload.p_expected_revision=revision;balance=amount(balance-payload.p_bet);revision++;accepted.add(id);
            }
            if(payload.p_game_id==='mines')minesCursor=MINES_MODEL.validate(payload.p_recovery?.minesRound);
            next.push(event);
          }else{
            if(rejected.has(id))continue;
            if(payload.p_game_id==='mines')minesCursor=MINES_MODEL.validate(payload.p_recovery?.minesRound);
            if(payload.p_game_id==='swamp')swampCursor=SWAMP_MODEL.validateBonus(payload.p_recovery?.swampBonus);
            if(!accepted.has(id))throw Error('Round missing during automatic recovery');
            const originalBet=Number(round?.bet??events.find(e=>e.type==='begin'&&e.payload.p_round_id===id)?.payload.p_bet??payload.p_bet),extra=Math.max(0,payload.p_bet-originalBet);
            if(extra>balance||extra>0&&window.VaultAccess?.isBlocked){payload.p_bet=originalBet;payload.p_payout=0;payload.p_multiplier=0;payload.p_status='cancelled';payload.p_result='double-rejected';payload.p_metadata={...payload.p_metadata,doubled:false,recovery:'insufficient-remote-double-stake'};const saved=data.rounds.find(r=>r.roundId===id);if(saved)Object.assign(saved,{bet:originalBet,stake:originalBet,payout:0,multiplier:0,status:'cancelled',result:payload.p_result,metadata:payload.p_metadata});balance=amount(balance);}
            else balance=amount(balance-extra+payload.p_payout);if(balance===null)throw Error('Invalid settlement');revision++;next.push(event);
          }
        }
        if(events.some(e=>e.payload?.p_game_id==='slot'&&rejected.has(e.payload.p_round_id))){data.recovery.slotBonus=validBonus(wallet.recovery?.slotBonus);suppress=true;VaultRecovery.restore();suppress=false;}
        data.recovery.swampBonus=swampCursor;VaultSwamp.restore(swampCursor);
        data.recovery.heistRound=heistCursor;VaultHeist.restore(heistCursor);data.recovery.minesRound=minesCursor;VaultRecovery.restoreMines();
        data.recovery.magnetRound=magnetCursor;VaultMagnet.restore(magnetCursor);data.recovery.critterRound=critterCursor;VaultCritter.restore(critterCursor);
        data.queue=next;data.rounds=data.rounds.filter(r=>!rejected.has(r.roundId)&&!mineRewinds.has(r.roundId)&&!(r.gameId==='vault_heist'&&events.some(e=>e.type==='heist'&&e.payload.p_round_id===r.roundId))&&!(r.gameId==='magnet'&&events.some(e=>e.type==='magnet'&&e.payload.p_round_id===r.roundId)));canonicalBalance=balance;data.balance=balance;data.walletConfirmed=true;data.revision=Number(wallet.revision);clientRevision=revision;walletMutation++;conflict=false;
        VaultStorage.saveLocalState({preferences:false});refreshBalanceUI();renderIdentity();status('Сохраняем прогресс…');scheduleSync();if(currentGame==='swamp')VaultSwamp.resume();if(currentGame==='vault_heist')VaultHeist.resume();
        if(currentGame==='magnet')VaultMagnet.resume();if(currentGame==='critter')VaultCritter.resume();
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
        // Keep even an empty active-round flush asynchronous so finally clears the assigned promise.
        await Promise.resolve();
        try{
          while(data.queue.length&&owner===uid&&identityEpoch===epoch){
            const event=data.queue[0];if(event.userId!==uid)throw Error('Queue identity mismatch');
            let method,args;
            if(event.type==='begin'){method='begin_game_round';args=event.payload;}
            else if(event.type==='settle'){method='record_game_round';args=event.payload;}
            else if(event.type==='mines'){method='save_mines_checkpoint';args=event.payload;}
            else if(event.type==='heist'){method='apply_heist_checkpoint';args=event.payload;}
            else if(event.type==='critter'){method='settle_critter_round';args=event.payload;}
            else if(event.type==='magnet'){method=event.payload.p_checkpoint.version===2?'apply_magnet_v2_checkpoint':'apply_magnet_checkpoint';args=event.payload;}
            else{method='save_vault_settings';args={p_settings:event.payload.settings,p_updated_at:event.payload.updatedAt};}
            const {data:result,error}=await client.rpc(method,args);if(owner!==uid||identityEpoch!==epoch)return;
            if(error)throw error;
            if(!['settings','mines'].includes(event.type)){data.revision=Number(result.revision);walletMutation++;}
            // Remove only the acknowledged event, even when preferences coalesce during a request.
            data.queue=data.queue.filter(e=>e.id!==event.id);VaultStorage.saveLocalState({preferences:false});
          }
          if(owner===uid&&identityEpoch===epoch&&!data.queue.length&&!Object.keys(data.recovery.openRounds).length){
            const mutation=walletMutation,remote=await VaultProfileService.load();if(mutation!==walletMutation||owner!==uid||identityEpoch!==epoch||data.queue.length||Object.keys(data.recovery.openRounds).length)return;
            // Server balance wins only after every local transaction was acknowledged.
            canonicalBalance=amount(remote.wallet.balance);data.balance=canonicalBalance;data.revision=Number(remote.wallet.revision);clientRevision=data.revision;data.stats=Object.fromEntries(remote.stats.map(s=>[s.game_id,s]));VaultSession.profile=remote.profile;rememberSession();VaultStorage.saveLocalState({preferences:false});refreshBalanceUI();
          }
          status(storageAvailable?'Сохранено':'Сохранение недоступно');if(currentGame==='swamp'&&!VaultSwamp.isBusy)VaultSwamp.resume();
          if(currentGame==='magnet'&&!VaultMagnet.isBusy)VaultMagnet.resume();if(currentGame==='critter'&&!VaultCritter.isBusy)VaultCritter.resume();
        }catch(e){
          console.error('VAULT sync failed',e);
          if(String(e.message||'').includes('VAULT_ACCOUNT_DISABLED')){window.VaultAccess?.markBlocked();conflict=true;setTimeout(recoverWallet,0);}
          else if(String(e.message||'').includes('VAULT_WALLET_CONFLICT')||/Round mismatch|Round missing|Queue identity/.test(String(e.message||''))){conflict=true;status('Восстанавливаем кошелёк…');renderIdentity();setTimeout(recoverWallet,0);}
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
      VaultStorage.flush();VaultSession.ready=false;identityEpoch++;conflict=false;profileRemote=uid==='guest';owner=uid;data=loadBucket(uid);clientRevision=data.revision+data.queue.filter(e=>!['settings','mines'].includes(e.type)).length;VaultSession.mode=uid==='guest'?'guest':'authenticated';VaultSession.user=user?{id:user.id,email:user.email,user_metadata:{username:user.user_metadata?.username}}:null;
      const marker=read('session');VaultSession.profile=uid!=='guest'&&marker?.project===C.supabaseUrl&&marker.user?.id===uid?marker.profile:null;
      window.VaultBootDiagnostics?.phase('ACCOUNT_LOCK');await acquireLock();
      if(uid!=='guest'&&!cachedOnly){
        try{window.VaultBootDiagnostics?.phase('ACCOUNT_LOAD');const remote=await VaultProfileService.load({previewWallet:true});applyRemote(remote,{wallet:data.queue.length===0&&Object.keys(data.recovery.openRounds).every(game=>game==='mines')});}
        catch(e){console.error('VAULT remote load failed',e);const cached=read(`user:${uid}`);profileRemote=!e.vaultComponent&&cached?.version===C.storageVersion&&cached.data?.walletConfirmed===true&&amount(cached.data?.balance)!==null;status(e.vaultComponent?'Не удалось загрузить: '+e.vaultComponent+'. Проверьте SQL-настройку Supabase.':'Offline — прогресс сохранён локально');}
      }
      if(cachedOnly)profileRemote=true;
      if(guestPreferences){Object.assign(data,guestPreferences);data.settingsUpdatedAt=Date.now();enqueue('settings',{settings:{...data.settings,bets:data.bets,lastGame:data.lastGame},updatedAt:new Date(data.settingsUpdatedAt).toISOString()});}
      window.VaultBootDiagnostics?.phase('GAME_RECOVERY');suppress=true;canonicalBalance=data.balance;restorePreferences();VaultRecovery.restore();suppress=false;
      VaultSession.ready=true;rememberSession();renderIdentity();showSavedScreen();VaultStorage.saveLocalState({preferences:false});
      if(conflict)setTimeout(recoverWallet,0);
      if(!locked&&!conflict&&(uid==='guest'||profileRemote))status(uid==='guest'?'Локальное сохранение':'Sync pending');scheduleSync();
    })();
    try{return await connecting;}finally{connecting=null;connectionUser=null;}
  }
  function authFailure(error,fallback){
    const code=error?.code||'',message=String(error?.message||'');
    if(code==='invalid_credentials'||/invalid login credentials/i.test(message))return {error:'Неверный email или пароль. Проверьте данные и попробуйте снова.',errorKind:'credentials'};
    if(code==='email_not_confirmed'||/email not confirmed/i.test(message))return {error:'Подтвердите email по ссылке в письме, затем повторите вход.',errorKind:'confirmation'};
    if(/rate_limit|too_many_requests/.test(code)||error?.status===429)return {error:'Слишком много попыток. Подождите немного и повторите вход.',errorKind:'rate-limit'};
    if(code==='user_banned')return {error:'Доступ к этому аккаунту ограничен.',errorKind:'account'};
    if(code==='user_already_exists')return {error:'Аккаунт с этим email уже существует. Перейдите ко входу.',errorKind:'account'};
    if(error?.status>=500||!navigator.onLine||/fetch|network|timeout|timed out|unreachable/i.test(message))return {error:'Не удалось связаться с сервером авторизации. Проверьте соединение и повторите попытку.',errorKind:'connection'};
    return {error:fallback,errorKind:'service'};
  }
  async function supabaseFetch(url,options={}){
    const address=String(url),isAuth=address.includes('/auth/v1/');
    if(address.includes('/rest/v1/')){
      const token=new Headers(options.headers).get('Authorization')?.replace(/^Bearer /,'');let subject=null;
      try{subject=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub;}catch{}
      if(owner==='guest'||subject!==owner)throw Error('Queue identity mismatch');
    }
    // Retry only password sign-in transport failures, never financial RPCs,
    // registration, refresh tokens, invalid credentials or rate limits.
    const retryable=isAuth&&address.includes('/token?grant_type=password')&&options.method?.toUpperCase()==='POST';
    for(let attempt=0;;attempt++){
      const controller=new AbortController();
      const abort=()=>controller.abort(options.signal?.reason);
      if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(()=>controller.abort(),isAuth?(C.authRequestTimeoutMs||20000):8000);
      try{
        const response=await fetch(url,{...options,signal:controller.signal});
        if(!retryable||attempt||![502,503,504].includes(response.status))return response;
        await response.body?.cancel();
      }catch(error){
        if(!retryable||attempt||options.signal?.aborted||!navigator.onLine)throw error;
      }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
  }
  const VaultAuth=window.VaultAuth={
    get client(){return client;},isConfigured:configured,
    async restoreSession(){
      if(!configured()||location.protocol==='file:')return switchIdentity(null);
      try{
        window.VaultBootDiagnostics?.phase('SDK_LOAD');const sdk=await loadSDK();window.VaultBootDiagnostics?.phase('SESSION_RESTORE');
        client=sdk.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:NS+'auth'},global:{fetch:supabaseFetch}});
        client.auth.onAuthStateChange((event,session)=>{
          // Keep asynchronous DB work outside the Supabase auth callback lock.
          setTimeout(()=>{
            if(event==='TOKEN_REFRESHED'&&session?.user?.id===owner){VaultSession.user={id:session.user.id,email:session.user.email,user_metadata:{username:session.user.user_metadata?.username}};rememberSession();return;}
            if(event==='SIGNED_IN'&&session?.user?.id!==owner)switchIdentity(session.user).catch(e=>{console.error('VAULT identity transition deferred',e);status('Завершите раунд перед сменой аккаунта');});
            if(event==='SIGNED_OUT'&&owner!=='guest'&&!connecting){if(VaultRoundService.anyActive()){status('Session expired — данные сохранены локально');return;}switchIdentity(null).catch(e=>console.error('VAULT sign out restore',e));}
          },0);
        });
        const {data:sessionData,error}=await client.auth.getSession();if(error)throw error;
        window.VaultBootDiagnostics?.phase('IDENTITY_RESTORE');return await switchIdentity(sessionData.session?.user||null);
      }catch(e){
        console.error('VAULT session restore unavailable',e);
        return switchIdentity(null);
      }
    },
    async signIn(email,password){
      if(authBusy)return {error:'Дождитесь завершения операции'};
      if(VaultRoundService.anyActive())return {error:'Сначала завершите текущий раунд и бонус'};
      authBusy=true;
      try{
        if(!client)await this.restoreSession();
        if(!client)return {error:'Сервис входа не загрузился. Проверьте соединение и повторите попытку.',errorKind:'connection'};
        const {data:result,error}=await client.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
        if(!result?.user)throw Error('Authenticated user missing');
        await switchIdentity(result.user);return {data:result};
      }catch(e){console.error('VAULT sign in failed',e);return authFailure(e,'Не удалось войти. Повторите попытку позже.');}finally{authBusy=false;}
    },
    async signUp(email,password,username){
      if(authBusy)return {error:'Дождитесь завершения операции'};
      if(VaultRoundService.anyActive())return {error:'Сначала завершите текущий раунд и бонус'};
      if(!username.trim()||username.length>40)return {error:'Укажите имя до 40 символов'};
      authBusy=true;try{if(!client)await this.restoreSession();if(!client)return {error:'Сервис регистрации не загрузился. Проверьте соединение и повторите попытку.',errorKind:'connection'};const {data:result,error}=await client.auth.signUp({email:email.trim(),password,options:{data:{username:username.trim()},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;if(result.session)await switchIdentity(result.user,{migrate:true});else migrateGuestStateToUser(result.user?.id);return {data:result,confirmationRequired:!result.session};}catch(e){console.error('VAULT sign up failed',e);return authFailure(e,'Не удалось создать аккаунт. Повторите попытку позже.');}finally{authBusy=false;}
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
    try{const mode=authMode,email=byId('vaultAuthEmail').value,password=byId('vaultAuthPassword').value,username=byId('vaultAuthUsername').value;
      const result=mode==='signup'?await VaultAuth.signUp(email,password,username):await VaultAuth.signIn(email,password);
      if(result.error){
        if(VaultSession.mode!=='authenticated'&&authMode!==mode)openAuth(mode);
        byId('vaultAuthMessage').textContent=result.error;
        byId('vaultAuthPassword').setAttribute('aria-invalid',String(result.errorKind==='credentials'));
        byId('vaultAuthMessage').scrollIntoView({block:'nearest'});
      }else{byId('vaultAuthPassword').value='';byId('vaultAuthPassword').removeAttribute('aria-invalid');if(result.confirmationRequired)byId('vaultAuthMessage').textContent='Проверьте почту и подтвердите аккаунт. Затем войдите.';else closeAuth();}
    }catch(e){console.error('VAULT auth form failed',e);byId('vaultAuthMessage').textContent='Не удалось завершить вход. Повторите попытку.';
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
