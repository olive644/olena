"""Extrai a primeira página dos cadernos oficiais; cache de PDFs fica em tmp."""
import concurrent.futures, json, shutil, subprocess, urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/"tmp/enem-acervo"
OUT=ROOT/"public/enem/covers"
OUT.mkdir(parents=True,exist_ok=True)
def cover(card):
    name=f"{card['year']}-{card['day']}"
    dest=OUT/(name+".webp")
    if dest.exists(): return name+" cached"
    pdf=CACHE/(name+".pdf")
    if not pdf.exists():
        subprocess.run(["curl.exe","--fail","--location","--silent","--show-error","--retry","3","--max-time","90",card['variants'][0]['url'],"--output",str(pdf)],check=True,capture_output=True)
        if not pdf.read_bytes().startswith(b"%PDF"): raise ValueError(name+" is not PDF")
    prefix=str(CACHE/name)
    subprocess.run([shutil.which("pdftoppm"),"-f","1","-l","1","-singlefile","-scale-to","720","-jpeg",str(pdf),prefix],check=True,capture_output=True)
    with Image.open(prefix+".jpg") as image: image.save(dest,"WEBP",quality=82)
    return name
cards=json.loads((ROOT/"public/enem/catalog.json").read_text(encoding="utf-8"))["papers"]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(cover,cards): print(result,flush=True)
