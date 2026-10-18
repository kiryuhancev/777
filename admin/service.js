/* Admin RPC boundary. Client email is a discovery hint only; PostgreSQL authorizes every operation. */
const VaultAdminService=window.VaultAdminService=(()=>{
 async function rpc(name,args={}){const client=window.VaultAuth?.client;if(!client)throw Error('Сначала войдите в аккаунт');const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
 return {context:()=>rpc('vault_admin_context'),users:(search,offset)=>rpc('vault_admin_users',{p_search:search,p_limit:30,p_offset:offset}),activity:id=>rpc('vault_admin_activity',{p_user_id:id}),balance:args=>rpc('vault_admin_balance',args),access:args=>rpc('vault_admin_access',args),heartbeat:()=>rpc('vault_presence_heartbeat')};
})();
const VaultAccess=window.VaultAccess=(()=>{
 let owner=null,blocked=false,timer=null,epoch=0,supported=null;
 function show(){const n=document.getElementById('vaultAccessNotice');if(n)n.hidden=!blocked;}
 async function check(){const e=epoch,id=owner;if(!id||!navigator.onLine||!window.VaultAuth?.client)return;try{if(supported===null){const cap=await VaultAuth.client.rpc('swamp_slot_capabilities');if(e!==epoch||owner!==id)return;if(cap.error)return;supported=cap.data?.siteAdminVersion===1;}if(!supported)return;const {data,error}=await VaultAuth.client.rpc('vault_presence_heartbeat');if(e!==epoch||owner!==id)return;if(error)return;blocked=data?.enabled===false;show();}catch{}}
 return {get isBlocked(){return blocked;},markBlocked(){blocked=true;show();},identity(){const id=window.VaultSession?.ready&&VaultSession.mode==='authenticated'?VaultSession.user.id:null;if(id===owner)return;owner=id;blocked=false;supported=null;epoch++;clearInterval(timer);show();if(id){check();timer=setInterval(()=>{if(!document.hidden)check();},30000);}},refresh:check};
})();
