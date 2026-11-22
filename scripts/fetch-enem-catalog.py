"""Indexa provas e gabaritos do Inep; capas extraídas dos PDFs oficiais (Poppler)."""
import concurrent.futures, datetime, hashlib, html, json, re, subprocess, urllib.request
from pathlib import Path
BASE = "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "tmp/enem-acervo"
OUT = ROOT / "public/enem"
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
def read(url):
    request = urllib.request.Request(url, headers={"User-Agent": "OlenaStudy official exam catalog"})
    with urllib.request.urlopen(request, timeout=80) as response: return response.read()
def clean(s): return html.unescape(re.sub(r"<[^>]*>", " ", s)).strip()
def year_catalog(year):
    file = CACHE / f"{year}.html"
    if not file.exists(): file.write_bytes(read(f"{BASE}/{year}"))
    page = file.read_text(encoding="utf-8").split('id="parent-fieldname-text"',1)[1].split('id="viewlet-below-content"',1)[0]
    papers=[]; label=""; application="Regular"
    pattern = re.compile(r"<(p|h[234])\b[^>]*>(.*?)</\1>|<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", re.S|re.I)
    for match in pattern.finditer(page):
        if match[1]:
            label=clean(match[2]); continue
        url=html.unescape(match[3]).replace("http://download.inep.gov.br", "https://download.inep.gov.br"); text=clean(match[4]).lower()
        if ".pdf" not in url.lower() or "download.inep.gov.br" not in url: continue
        daymatch=re.search(r"([12])\s*[º°oª]?\s*dia|dia\s*([12])",label,re.I)
        if not daymatch and year >= 2009: continue
        day=int(daymatch[1] or daymatch[2]) if daymatch else 0
        if "gabarito" in text:
            if papers and papers[-1]["day"]==day: papers[-1]["answerUrl"]=url
        elif "prova" in text:
            lower=label.lower()
            application = "Digital" if "digital" in lower else "Reaplicação / PPL" if any(x in lower for x in ["reaplica", "ppl", "prisional", "privadas"]) else "Regular"
            papers.append({"id":hashlib.sha256(url.encode()).hexdigest()[:14],"year":year,"day":day,"label":label,"application":application,"url":url,"answerUrl":None})
    unique={p["url"]:p for p in papers}
    return list(unique.values())
def main():
    index=read(BASE).decode()
    years=sorted({int(y) for y in re.findall(r'data-id="(20\d\d)"',index) if 2010<=int(y)<=2026},reverse=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        variants=[p for group in pool.map(year_catalog,years) for p in group]
    cards=[]
    for year in years:
        for day in ([0] if year < 2009 else [1,2]):
            options=[p for p in variants if p["year"]==year and p["day"]==day]
            if not options: raise RuntimeError(f"Missing {year} day {day}")
            cards.append({"id":f"enem-{year}-{day}","year":year,"day":day,"cover":f"/enem/covers/{year}-{day}.webp","variants":options})
    payload={"source":BASE,"checkedAt":datetime.date.today().isoformat(),"papers":cards}
    (OUT/"catalog.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"years":years,"cards":len(cards),"variants":len(variants),"withAnswers":sum(bool(p["answerUrl"]) for p in variants)},ensure_ascii=False))
if __name__=="__main__": main()
