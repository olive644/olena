"""Exporta parâmetros MIT/INEP somente após conferir o gabarito completo do PDF oficial.
Uso: py scripts/build-enem-tri.py --reference tmp/tri-reference --keys tmp/enem-key-audit.json
"""
import argparse,csv,json,pathlib,collections,hashlib,re,unicodedata
p=argparse.ArgumentParser();p.add_argument('--reference',type=pathlib.Path,required=True);p.add_argument('--keys',type=pathlib.Path,required=True);args=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];catalog=json.loads((root/'public/enem/catalog.json').read_text(encoding='utf8'));keys={(r['year'],r['day']):r['key'] for r in json.loads(args.keys.read_text(encoding='utf8'))}
areas={'languages':'LC','humanities':'CH','nature':'CN','math':'MT'}
scale={'LC':[499.978,108.086],'CH':[501.489,112.310],'CN':[501.144,113.102],'MT':[500.020,129.646]}
blocked={(int(r['ano']),r['codigo'])for r in csv.DictReader((args.reference/'dados/provas_desconsideradas.csv').open(encoding='utf8'))}
index={'version':1,'source':'https://github.com/pedro-mantovani/calculadora_ENEM','referenceCommit':'2970bd3dbe7f11c7987ca67cb1a5494c9677b73e','papers':{}}
audit=[]
for paper in catalog['papers']:
 year=paper['year'];day=paper['day'];source=args.reference/f'dados/ITENS_PROVAS/ITENS_PROVA_{year}.csv';variant=paper['variants'][0];answer=keys.get((year,day),{})
 if not source.exists() or not answer:
  audit.append({'year':year,'day':day,'status':'no-parameters' if not source.exists() else 'unverified-key'});continue
 records=list(csv.DictReader(source.open(encoding='latin1'),delimiter=';'));groups=collections.defaultdict(list)
 for row in records:groups[(row['SG_AREA'],row['CO_PROVA'])].append(row)
 sections=['languages','humanities']if day==1 else['nature','math']
 if year<2017:sections=['humanities','nature']if day==1 else['languages','math']
 for section in sections:
  area=areas[section];first={'languages':1 if year>=2017 else 91,'humanities':46 if year>=2017 else 1,'nature':91 if year>=2017 else 46,'math':136}[section];candidates=[]
  for (groupArea,code),rows in groups.items():
   color = re.search(r'\b(Azul|Amarel[oa]|Branc[oa]|Rosa|Cinza|Verde)\b',variant['label'],re.I)
   normalize = lambda text: ''.join(c for c in unicodedata.normalize('NFD',text.upper()) if not unicodedata.combining(c))
   if color and normalize(rows[0]['TX_COR'])[:5] != normalize(color.group(1))[:5]:continue
   if color and len(normalize(rows[0]['TX_COR'])) > 8:continue
   if groupArea!=area or (year,code)in blocked:continue
   base=min(int(r['CO_POSICAO'])for r in rows);items=[];valid=True
   for row in rows:
    q=int(row['CO_POSICAO'])-base+first;language={'0':'english','1':'spanish'}.get(row['TP_LINGUA']);key=f'{language}:{q}'if language else f'q:{q}'
    # Tem que corresponder inclusive à ordem e ao idioma de cada questão do PDF oficial.
    inactive=row['IN_ITEM_ABAN']=='1'
    if key not in answer or (not inactive and answer[key]!=row['TX_GABARITO']):valid=False;break
    try: a,b,c=[float(row[n])for n in ['NU_PARAM_A','NU_PARAM_B','NU_PARAM_C']] if not inactive else [0,0,0]
    except ValueError:valid=False;break
    items.append({'key':key,'id':row['CO_ITEM'],'answer':row['TX_GABARITO'],'a':a,'b':b,'c':c,'excluded':inactive})
   expected=50 if area=='LC' else 45
   if valid and len(items)==expected and len({i['key']for i in items})==expected:candidates.append((code,sorted(items,key=lambda i:i['key'])))
  signatures={json.dumps(items,sort_keys=True) for _,items in candidates}
  if not candidates or len(signatures)!=1:
   audit.append({'year':year,'day':day,'section':section,'status':'ambiguous' if candidates else 'unmatched'});continue
  code,items=candidates[0];filename=f'{variant["id"]}-{area}.json';bundle={'year':year,'day':day,'area':area,'variantId':variant['id'],'officialUrl':variant['url'],'answerUrl':variant['answerUrl'],'examCode':code,'scale':scale[area],'items':items}
  (root/'public/enem/tri'/filename).write_text(json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
  index['papers'].setdefault(variant['id'],{})[section]=filename
  audit.append({'year':year,'day':day,'section':section,'code':code,'status':'matched'})
(root/'public/enem/tri/index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(root/'public/enem/tri/audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8')
print(collections.Counter(a['status']for a in audit));print('bundles',sum(len(v)for v in index['papers'].values()))
