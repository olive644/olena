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


def vector_xml(label: str, source: str, box: list, shapes) -> str:
    """Monta o VectorDrawable a partir de formas <path fill d>. Recusa qualquer outra coisa."""
    if box[0] != 0 or box[1] != 0 or box[2] != box[3]:
        raise ValueError(f"{label}: viewBox inesperado {box}")
    size = int(box[2]) if box[2].is_integer() else box[2]
    paths = []
    for node in shapes:
        if node.tag != f"{NS}path":
            raise ValueError(f"{label}: elemento não suportado {node.tag}")
        extra = set(node.attrib) - {"fill", "d"}
        fill = node.attrib.get("fill", "")
        if extra or not COLOR.match(fill):
            raise ValueError(f"{label}: atributos não suportados {extra or fill}")
        paths.append((fill.upper().replace("#", "#FF"), node.attrib["d"]))
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        f"<!-- Gerado por scripts/svg-to-android-vector.py a partir de {source}. Não editar à mão. -->",
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


def convert(svg: Path) -> str:
    root = ET.parse(svg).getroot()
    box = [float(value) for value in root.attrib["viewBox"].split()]
    return vector_xml(svg.name, svg.relative_to(ROOT).as_posix(), box, list(root))


def convert_symbol(svg: Path, symbol_id: str) -> str:
    """Um <symbol id=...> de um arquivo de sprite (vários ícones no mesmo SVG)."""
    root = ET.parse(svg).getroot()
    for node in root.iter(f"{NS}symbol"):
        if node.attrib.get("id") == symbol_id:
            box = [float(value) for value in node.attrib["viewBox"].split()]
            return vector_xml(f"{svg.name}#{symbol_id}", svg.relative_to(ROOT).as_posix() + f"#{symbol_id}", box, list(node))
    raise ValueError(f"{svg.name}: símbolo {symbol_id} não existe")


def convert_art_group(svg: Path, group_id: str) -> str:
    """Um <g id=...> de um SVG simples (ex.: agenda-month-calendar.svg#art)."""
    root = ET.parse(svg).getroot()
    box = [float(value) for value in root.attrib["viewBox"].split()]
    for node in root.iter(f"{NS}g"):
        if node.attrib.get("id") == group_id:
            return vector_xml(f"{svg.name}#{group_id}", svg.relative_to(ROOT).as_posix() + f"#{group_id}", box, list(node))
    raise ValueError(f"{svg.name}: grupo {group_id} não existe")


# Ícones da Agenda: sprites do site, só formas preenchidas. download e cloudUpload (paper-editor-icon.svg)
# usam traço e rotação, então saem como PNG exportado do site, não por este script.
SPRITES = {
    "agenda-toolbar.svg": ["day", "week", "month", "list", "reminders"],
    "agenda-detail.svg": ["print", "filter", "search", "clock", "location", "links", "guests", "attachment"],
}


def main() -> int:
    TARGET.mkdir(parents=True, exist_ok=True)
    jobs = [(SOURCE / variant / f"{name}.svg", f"ic_nav_{name}_{variant}.xml") for name in NAMES for variant in VARIANTS]
    jobs += [(SOURCE / "profile.svg", "ic_nav_profile.xml"), (SOURCE / "profile-active.svg", "ic_nav_profile_active.xml")]
    for source, target in jobs:
        (TARGET / target).write_text(convert(source), encoding="utf-8", newline="\n")
    count = len(jobs)
    for sprite, ids in SPRITES.items():
        for symbol_id in ids:
            (TARGET / f"ic_agenda_{symbol_id}.xml").write_text(
                convert_symbol(SOURCE / sprite, symbol_id), encoding="utf-8", newline="\n"
            )
            count += 1
    (TARGET / "ic_agenda_month_art.xml").write_text(
        convert_art_group(SOURCE / "agenda-month-calendar.svg", "art"), encoding="utf-8", newline="\n"
    )
    count += 1
    print(f"{count} ícones gerados em {TARGET.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
