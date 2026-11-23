"""Validação independente: executa as funções originais MIT com NumPy e compara notas de microdados.
Não guarda identificadores de participantes; fixtures incluem somente respostas, prova e nota.
"""
import ast,contextlib,io,json,pathlib,collections,numpy as np
root=pathlib.Path(__file__).resolve().parents[1];ref=root/'tmp/tri-reference';tree=ast.parse((ref/'calculadora.py').read_text());functions=ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[]);env={'np':np};exec(compile(functions,'calculadora.py','exec'),env)
class Col:
 def __init__(self,x):self.iat=x
class Frame:
 def __init__(self,items):self.items=items
 def iterrows(self):return enumerate(self.items)
 def __getitem__(self,key):return Col([i[key]for i in self.items])
def predict(bundle,items,vector):
 params=[{'CO_POSICAO':n,'IN_ITEM_ABAN':int(i['excluded']),'NU_PARAM_A':i['a'],'NU_PARAM_B':i['b'],'NU_PARAM_C':i['c'],'TX_GABARITO':i['answer']}for n,i in enumerate(items)]
 with contextlib.redirect_stdout(io.StringIO()):theta=env['estimar_theta'](vector,Frame(params))
 return round(bundle['scale'][0]+bundle['scale'][1]*theta,1)
def selected(b,lang):return sorted([i for i in b['items']if i['key'].startswith('q:')or i['key'].startswith(lang+':')],key=lambda i:int(i['key'].split(':')[1]))
index=json.loads((root/'public/enem/tri/index.json').read_text());bundles=[(f,json.loads((root/'public/enem/tri'/f).read_text()))for areas in index['papers'].values()for f in areas.values()]
fixtures=[]
for file,b in bundles:
 section={'LC':'languages','CH':'humanities','CN':'nature','MT':'math'}[b['area']]
 for lang in(['english','spanish']if b['area']=='LC'else['english']):
  items=selected(b,lang)
  patterns={'all-correct':''.join(i['answer']if i['answer']in'ABCDE'else'A'for i in items),'all-wrong':''.join('B'if i['answer']=='A'else'A'for i in items),'alternating':''.join(i['answer']if n%2==0 and i['answer']in'ABCDE'else'.'for n,i in enumerate(items))}
  for name,vector in patterns.items():
   fixtures.append({'file':file,'section':section,'language':lang,'case':name,'answers':{section+':'+i['key']:a for i,a in zip(items,vector)if a in'ABCDE'},'expected':predict(b,items,vector)})
# Dados do INEP redistribuídos com atribuição CC-BY-4.0 no Zenodo, DOI 10.5281/zenodo.20130840.
participants=json.loads((root/'tmp/tri-official-participant-fixtures.json').read_text());errors=[];counts=collections.Counter()
for row in participants:
 for file,b in bundles:
  if b['year']!=2022:continue
  area=b['area'];code=row.get('CO_PROVA_'+area,'');note=row.get('NU_NOTA_'+area,'');vector=row.get('TX_RESPOSTAS_'+area,'')
  try:matches=int(float(code))==int(b['examCode']);actual=float(note)
  except ValueError:continue
  lang='spanish'if row['TP_LINGUA']=='1'else'english';bucket=(area,lang if area=='LC'else'')
  if not matches or len(vector)!=45 or not actual>0 or counts[bucket]>=40:continue
  items=selected(b,lang);expected=predict(b,items,vector);errors.append(abs(expected-actual));counts[bucket]+=1
  fixtures.append({'file':file,'section':{'LC':'languages','CH':'humanities','CN':'nature','MT':'math'}[area],'language':lang,'case':'official-2022','answers':{{'LC':'languages','CH':'humanities','CN':'nature','MT':'math'}[area]+':'+i['key']:a for i,a in zip(items,vector)if a in'ABCDE'},'expected':expected,'officialScore':actual})
 if sum(counts.values())>=200:break
out=root/'src/data/fixtures';out.mkdir(exist_ok=True);(out/'enem-tri-reference.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
report={'referenceCommit':index['referenceCommit'],'fixtures':len(fixtures),'officialCases':len(errors),'officialByArea':{str(k):v for k,v in counts.items()},'mae':float(np.mean(errors)),'maxError':max(errors),'source':'https://doi.org/10.5281/zenodo.20130840'}
(root/'docs/research/enem-tri-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
assert len(errors)==200 and max(errors)<1,'Erro acima do limite de validação'
