"""Audit the raw physical-round CSV and produce a readable policy-dependent RTP report."""
from pathlib import Path
import csv,json,statistics,math,hashlib,random
ROOT=Path(__file__).resolve().parent.parent
report=json.loads((ROOT/'reports/breakers-rtp.json').read_text())
rows=list(csv.DictReader((ROOT/'reports/breakers-rtp.csv').open()))
groups={k:[] for k in report['profiles']}
for row in rows:
 assert math.isclose(float(row['return']),float(row['payout'])/20,abs_tol=1e-10)
 groups[row['profile']].append(row)
def bootstrap(values,seed):
 rng=random.Random(seed);n=len(values)
 means=sorted(sum(rng.choices(values,k=n))/n*100 for _ in range(1000))
 return [means[24],means[974]]
for i,(key,group) in enumerate(groups.items()):
 values=[float(r['return']) for r in group];stats=report['profiles'][key]
 assert len(values)==stats['rounds']
 assert math.isclose(statistics.fmean(values)*100,stats['rtpPercent'],rel_tol=1e-12)
 stats['empiricalBootstrap95PercentInterval']=bootstrap(values,report['masterSeed']+i)
ref={int(r['index']):float(r['return']) for r in groups['standard']};paired={}
for key in ['mixedDrag','steerLeft','steerRight']:
 values=[float(r['return'])-ref[int(r['index'])] for r in groups[key]]
 paired[key]={'rounds':len(values),'rtpDifferencePercentagePoints':statistics.fmean(values)*100,
  'empiricalBootstrap95PercentInterval':bootstrap(values,report['masterSeed']+10+len(paired))}
report['pairedPolicySensitivity']=paired
report['standardReferenceOnSensitivitySeedsPercent']=statistics.fmean([ref[int(r['index'])] for r in groups['mixedDrag']])*100
digest=hashlib.sha256()
for name in ['bird/config.js','bird/model.js','tools/bird-physics.cjs']:digest.update((ROOT/name).read_bytes())
html=(ROOT/'index.html').read_text();digest.update(html[html.index('// BIRD RIGID BODY ENGINE'):html.index('// END BIRD RIGID BODY ENGINE')].encode())
report['modelSha256']=digest.hexdigest();report['modelSha256Method']='config + model + engine loader + entire embedded rigid-body engine, UTF-8'
report['limitations'].append('Empirical bootstrap intervals resample observed rounds only; they cannot quantify unobserved rare chains.')
(ROOT/'reports/breakers-rtp.json').write_text(json.dumps(report,indent=2)+'\n')
labels={'standard':'Стандартный запуск','mixedDrag':'Разные силы и углы','steerLeft':'Постоянная коррекция влево','steerRight':'Постоянная коррекция вправо'}
lines=['# VAULT BREAKERS — измерение RTP','',
 'Все выплаты получены из реальных физических сцен. Формула выплат и вероятности не перенастраивались.',
 '', '| Стратегия | Раундов | RTP | Bootstrap-интервал 95% | Прибыльных раундов |',
 '|---|---:|---:|---:|---:|']
for key,stats in report['profiles'].items():
 lo,hi=stats['empiricalBootstrap95PercentInterval']
 lines.append(f"| {labels[key]} | {stats['rounds']:,} | {stats['rtpPercent']:.2f}% | {lo:.2f}–{hi:.2f}% | {stats['profitableRoundPercent']:.2f}% |")
lines+=['','RTP = сумма выплат / сумма ставок × 100%. Ставка во всех раундах — 20.',
 '', 'Стандартный запуск: vx=660, vy=−290, без коррекции. Разные силы/углы: равномерная сила 65–120 и угол 10–45°, без коррекции. Остальные стратегии используют стандартный запуск и постоянную коррекцию −1 / +1.',
 '', 'Это оценки для указанных стратегий, а не единый теоретический RTP для любого игрока. Bootstrap-интервалы (1 000 повторных выборок) учитывают наблюдаемые раунды; редкие не встретившиеся цепочки могут увеличивать неопределённость.',
 '', f"Стандартный запуск на первых {len(groups['mixedDrag']):,} общих seed: {report['standardReferenceOnSensitivitySeedsPercent']:.2f}%. Для сравнения управления используйте парные разницы из JSON, а не только средние разных размеров выборки.",
 '', f"У стандартного запуска верхний 1% раундов дал {report['profiles']['standard']['topOnePercentPayoutShare']*100:.2f}% всех выплат. Максимум в выборке: ×{report['profiles']['standard']['maximum']['return']:.2f} (seed {report['profiles']['standard']['maximum']['seed']}).",
 '', 'RTP выше 100% означает, что в этой модели при указанной стратегии выплаты в среднем превышают ставки. Текущие параметры не являются сбалансированной математикой слота; этот аудит не изменяет их автоматически.',
 '', 'Воспроизведение:', '', '```', 'node tools/breakers-rtp.cjs 10000 2000 4', 'python3 tools/breakers-rtp-summary.py', '```',
 '', f"Master seed: `{report['masterSeed']}`. SHA-256 математической модели: `{report['modelSha256']}`.",
 '', 'Полные данные: [JSON](breakers-rtp.json), [CSV по раундам](breakers-rtp.csv).']
(ROOT/'reports/breakers-rtp.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines[:12]))
