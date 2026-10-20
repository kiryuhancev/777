/* Runs before game modules. Never changes auth, wallet, storage or game readiness. */
(()=>{
 'use strict';
 const diagnostic={code:'STARTUP_PENDING',phase:'HTML_MODULES',line:0,column:0};let panel=null,finished=false,timer;
 function healthy(){return document.body&&!document.body.classList.contains('vault-booting')&&document.getElementById('vaultBoot')?.hidden;}
 function stop(){finished=true;clearTimeout(timer);panel?.remove();observer.disconnect();}
 function show(){
  if(healthy()){stop();return;}
  if(!document.body){timer=setTimeout(show,1000);return;}
  if(panel)return;
  panel=document.createElement('section');panel.id='vaultBootRecovery';panel.setAttribute('role','alert');panel.setAttribute('aria-live','polite');
  const box=document.createElement('div'),brand=document.createElement('strong'),title=document.createElement('h1'),message=document.createElement('p'),code=document.createElement('small'),retry=document.createElement('button');
  brand.textContent='V A U L T';title.textContent='Не удалось завершить загрузку';message.textContent='Запуск занял слишком много времени. Повтори загрузку. Сохранённые данные останутся на месте.';code.id='vaultBootDiagnostic';code.textContent=diagnostic.code+' · '+diagnostic.phase+(diagnostic.line?' · '+diagnostic.line+':'+diagnostic.column:'');retry.type='button';retry.textContent='ПОВТОРИТЬ ЗАГРУЗКУ';
  retry.onclick=()=>{const url=new URL(location.href);url.searchParams.set('vault_reload',Date.now());location.replace(url.href);};box.append(brand,title,message,code,retry);panel.append(box);document.body.append(panel);retry.focus();
 }
 const observer=new MutationObserver(()=>{if(healthy())stop();});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','hidden'],childList:true,subtree:true});
 window.addEventListener('error',event=>{if(finished)return;if(event instanceof ErrorEvent){diagnostic.code='JS_STARTUP_ERROR';diagnostic.line=event.lineno||0;diagnostic.column=event.colno||0;const node=document.getElementById('vaultBootDiagnostic');if(node)node.textContent=diagnostic.code+' · '+diagnostic.phase+' · '+diagnostic.line+':'+diagnostic.column;}},true);
 timer=setTimeout(show,30000);
 window.VaultBootDiagnostics={phase(value){if(finished)return;diagnostic.phase=value;const node=document.getElementById('vaultBootDiagnostic');if(node)node.textContent=diagnostic.code+' · '+value+(diagnostic.line?' · '+diagnostic.line+':'+diagnostic.column:'');},inspect:()=>({...diagnostic,finished,recoveryVisible:!!panel?.isConnected})};
})();
