"""Isolated PostgreSQL only: complete four-level entitlement chain and duplicate safety."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parent.parent

def sql(s):
 p=subprocess.run(['docker','exec','-i','vault-postgres-test','psql','-U','postgres','-d','vault_test','-qAt','-v','ON_ERROR_STOP=1'],input=s,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout
for _ in range(2):sql((ROOT/'supabase_swamp_levels.txt').read_text())
script="""const fs=require('fs'),vm=require('vm'),x={module:{exports:{}}};vm.createContext(x);vm.runInContext(['config-v2.js','model-v1.js','config.js','model.js'].map(f=>fs.readFileSync('swamp/'+f,'utf8')).join('\\n'),x);const M=x.module.exports.SWAMP_MODEL,id='83838383-aaaa-4838-8838-838383838383';let b={...M.newBonus(3,20),featureId:id,triggerSeed:9},steps=[];const purchase=JSON.parse(JSON.stringify(b));for(let n=0;n<60;n++){b=M.acknowledge(b);const consumed={...b,remaining:b.remaining-1,spinsPlayed:b.spinsPlayed+1},g=Array.from({length:5},()=>Array.from({length:3},()=>({id:'money',valueX:2})));if(n%15===0)for(let c=1;c<=3;c++)for(let row=0;row<3;row++)g[c][row]={id:'collector'};const r=M.resolve(g,b);steps.push({consumed,next:r.nextBonus,payout:Math.round(r.winX*20*1e6)/1e6,metadata:{mathVersion:3,freeSpin:true,freeSpinIndex:n+1,featureId:id,seed:n,scatters:0,collectors:r.collectors.length,moneyFish:r.fish.map(f=>f.valueX),multiplier:r.multiplier,lineWinX:r.lineWinX,collectedX:r.collectedX,retriggerSpins:0,winX:r.winX}});b=r.nextBonus;}console.log(JSON.stringify({purchase,steps}));"""
data=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));A='83838383-8383-4838-8838-838383838383';root_id=data['purchase']['featureId'];q=lambda v:"'"+json.dumps(v).replace("'","''")+"'::jsonb";auth=f"set role authenticated;select set_config('request.jwt.claim.sub','{A}',false);"
sql(f"insert into auth.users(id,email,raw_user_meta_data) values('{A}','swamp-levels@example.test','{{\"username\":\"Swamp\"}}') on conflict(id) do nothing;delete from public.game_rounds where user_id='{A}';delete from public.game_stats where user_id='{A}';update public.wallets set balance=1000000,revision=0,recovery='{{}}' where user_id='{A}';")
purchase_m={'mathVersion':3,'purchaseType':'bonus','purchaseStake':20,'purchaseSpins':15,'purchaseCostX':77,'seed':9};r={'swampBonus':data['purchase']}
begin=f"select public.begin_game_round('{root_id}','swamp',1540,0,{q(purchase_m)},{q(r)});";settle=f"select public.record_game_round('{root_id}','swamp',1540,0,0,'bonus-purchased',{q(purchase_m)},'settled',{q(r)});"
sql(auth+begin+begin+settle+settle);revision=2;total=0
for idx,s in enumerate(data['steps']):
 rid=f'8383{idx:04x}-bbbb-4838-8838-838383838383';m=s['metadata'];b={'swampBonus':s['consumed']};n={'swampBonus':s['next']}
 begin=f"select public.begin_game_round('{rid}','swamp',0,{revision},{q(m)},{q(b)});";settle=f"select public.record_game_round('{rid}','swamp',0,{s['payout']},{m['winX']},'win',{q(m)},'settled',{q(n)});"
 sql(auth+begin+begin+settle+settle);revision+=2;total=round(total+s['payout'],6)
 assert int(sql(f"select revision from public.wallets where user_id='{A}';"))==revision
 assert json.loads(sql(f"select recovery->'swampBonus' from public.wallets where user_id='{A}';"))==s['next']
assert float(sql(f"select balance from public.wallets where user_id='{A}';"))==round(1000000-1540+total,6)
assert int(sql(f"select rounds_played from public.game_stats where user_id='{A}' and game_id='swamp';"))==61
# Pure step validator rejects immediate tier jumping and repeated award without touching money.
s=data['steps'][0];bad=json.loads(json.dumps(s['next']));bad.update(tier=1,remaining=15,phase='level-up',previousTier=0)
try:sql(f"select public.swamp_bonus_v2_validate_settle({q(s['consumed'])},{q(bad)},{q(s['metadata'])},{q(s['metadata'])},{s['payout']},'{root_id}');");raise AssertionError('Immediate upgrade accepted')
except RuntimeError as e:assert 'Invalid Swamp deferred level transition' in str(e)
assert json.loads(sql(auth+'select public.swamp_slot_capabilities();').strip().splitlines()[-1])['bonusVersion']==2
# New natural entitlement is also15, independent of purchase presentation.
natural_id='84848484-aaaa-4848-8848-848484848484';m={'mathVersion':3,'baseBet':20,'freeSpin':False,'seed':17};entitlement={'version':2,'featureId':natural_id,'bet':20,'remaining':15,'collectors':0,'tier':0,'totalWinX':0,'spinsPlayed':0,'phase':'intro'}
sql(auth+f"select public.begin_game_round('{natural_id}','swamp',20,{revision},{q(m)},'{{}}');"+f"select public.record_game_round('{natural_id}','swamp',20,0,0,'no-win',{q({**m,'scatters':3,'winX':0})},'settled',{q({'swampBonus':entitlement})});")
assert json.loads(sql(f"select recovery->'swampBonus' from public.wallets where user_id='{A}';"))==entitlement
checks=['Repeat-safe migration; no production database touched','One77x purchase +60 Free Spins across sequential levels; exact JS/SQL recovery checkpoints','Every begin/settle sent twice: wallet revision122,61 rounds, no duplicate +15, debit or payout','Premature tier/multiplier/extra-spin transition rejected; natural3Scatter entitlement15; bonusVersion2 capability']
(ROOT/'reports/swamp-levels-sql.json').write_text(json.dumps({'mode':'isolated PostgreSQL','passed':checks},indent=2)+'\n');print('\n'.join('PASS '+s for s in checks))
