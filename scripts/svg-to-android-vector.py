"""Converte os ícones de papel do site (SVG de formas preenchidas) em VectorDrawable do Android.

Os ícones de navegação em public/navigation-icons/paper são só <path fill="#RRGGBB" d="...">, sem
traços, transformações nem opacidade. Isso cabe direto em <path android:fillColor android:pathData>.
O script recusa qualquer elemento ou atributo fora disso, em vez de gerar um ícone diferente do
original em silêncio.

Uso: py scripts/svg-to-android-vector.py
Saída: android/app/src/main/res/drawable/ic_nav_<nome>_<variante>.xml
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/navigation-icons/paper"
TARGET = ROOT / "android/app/src/main/res/drawable"
NS = "{http://www.w3.org/2000/svg}"
NAMES = ["today", "planner", "gamepad", "focus", "library"]
VARIANTS = ["claro", "roxo", "escuro"]
COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


def convert(svg: Path) -> str:
    root = ET.parse(svg).getroot()
    box = [float(value) for value in root.attrib["viewBox"].split()]
    if box[0] != 0 or box[1] != 0 or box[2] != box[3]:
        raise ValueError(f"{svg.name}: viewBox inesperado {box}")
    size = int(box[2]) if box[2].is_integer() else box[2]
    paths = []
    for node in root:
        if node.tag != f"{NS}path":
            raise ValueError(f"{svg.name}: elemento não suportado {node.tag}")
        extra = set(node.attrib) - {"fill", "d"}
        fill = node.attrib.get("fill", "")
        if extra or not COLOR.match(fill):
            raise ValueError(f"{svg.name}: atributos não suportados {extra or fill}")
        paths.append((fill.upper().replace("#", "#FF"), node.attrib["d"]))
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        f"<!-- Gerado por scripts/svg-to-android-vector.py a partir de {svg.relative_to(ROOT).as_posix()}. Não editar à mão. -->",
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
        f'    android:width="{size}dp"',
        f'    android:height="{size}dp"',
        f'    android:viewportWidth="{size}"',
        f'    android:viewportHeight="{size}">',
    ]
    for color, data in paths:
        lines += ["    <path", f'        android:fillColor="{color}"', f'        android:pathData="{data}" />']
    lines.append("</vector>")
    return "\n".join(lines) + "\n"


def main() -> int:
    TARGET.mkdir(parents=True, exist_ok=True)
    jobs = [(SOURCE / variant / f"{name}.svg", f"ic_nav_{name}_{variant}.xml") for name in NAMES for variant in VARIANTS]
    jobs += [(SOURCE / "profile.svg", "ic_nav_profile.xml"), (SOURCE / "profile-active.svg", "ic_nav_profile_active.xml")]
    for source, target in jobs:
        (TARGET / target).write_text(convert(source), encoding="utf-8", newline="\n")
    print(f"{len(jobs)} ícones gerados em {TARGET.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
