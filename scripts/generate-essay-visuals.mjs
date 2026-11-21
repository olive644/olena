import fs from "node:fs";
import prettier from "prettier";
const root = new URL("../", import.meta.url);
const briefs = JSON.parse(
  fs.readFileSync(new URL("scripts/data/essay-infographic-briefs.json", root), "utf8"),
);
const colors = ["#075cf4", "#e84452", "#00a459", "#d98b00", "#7b48bd", "#007c91"];
const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const num = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
function lines(value, limit) {
  const words = String(value).split(/\s+/),
    out = [];
  let line = "";
  for (const word of words) {
    if (line && (line + " " + word).length > limit) {
      out.push(line);
      line = word;
    } else line += (line ? " " : "") + word;
  }
  if (line) out.push(line);
  return out;
}
function text(
  value,
  x,
  y,
  limit = 62,
  size = 20,
  color = "#142443",
  weight = 400,
  anchor = "start",
) {
  return lines(value, limit)
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * (size + 7)}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${esc(line)}</text>`,
    )
    .join("");
}
const config = await prettier
  .resolveConfig(new URL("../.prettierrc", import.meta.url).pathname)
  .catch(() => null);
const catalog = {};
for (const brief of briefs) {
  const { id, title, kind, scope, period, items, unit, note, sourceLabel, sourceUrl } = brief;
  if (!/^essay-\d{2}$/.test(id) || !items.length || !sourceUrl.startsWith("https://"))
    throw Error("Invalid brief " + id);
  let svg = text(title, 44, 54, 32, 34, "#10234c", 700);
  let y = 54 + lines(title, 32).length * 41 + 9;
  svg += text(scope, 44, y, 65, 17, "#44516d");
  y += lines(scope, 65).length * 24;
  svg += text(period, 44, y, 65, 17, "#44516d");
  y += lines(period, 65).length * 24 + 25;
  if (kind === "bars") {
    const maxValue = Math.max(...items.map((i) => i.value));
    const power = 10 ** Math.floor(Math.log10(maxValue)),
      step = power / 2;
    const max = unit === "%" || unit.startsWith("índice") ? 100 : Math.ceil(maxValue / step) * step;
    svg += text(unit, 44, y, 65, 17, "#44516d");
    y += 34;
    for (let i = 0; i <= 5; i++) {
      const x = 44 + (552 * i) / 5;
      svg +=
        `<path d="M${x} ${y + 12}v${items.length * 89 - 12}" stroke="#e4e8f1"/>` +
        text(
          num((max * i) / 5),
          x,
          y,
          12,
          14,
          "#59657c",
          400,
          i === 0 ? "start" : i === 5 ? "end" : "middle",
        );
    }
    y += 36;
    items.forEach((item, i) => {
      const labelLines = lines(item.label, 43).length;
      svg += text(item.label, 44, y, 43, 21, "#152644", 600);
      svg += text(
        num(item.value) + (unit === "%" ? "%" : ""),
        596,
        y,
        14,
        25,
        colors[i % colors.length],
        700,
        "end",
      );
      const barY = y + 12 + (labelLines - 1) * 28;
      svg += `<rect x="44" y="${barY}" width="552" height="24" fill="#edf0f6" rx="3"/><rect x="44" y="${barY}" width="${(552 * item.value) / max}" height="24" fill="${colors[i % colors.length]}" rx="3"/>`;
      y = barY + 68;
    });
  } else if (kind === "metric") {
    for (const [i, item] of items.entries()) {
      const display = item.displayValue ?? num(item.value) + (unit === "%" ? "%" : "");
      svg += text(display, 44, y + 85, 16, 88, colors[i % colors.length], 700);
      y += 140;
      if (unit !== "%") {
        svg += text(unit, 44, y, 45, 25, "#10234c", 600);
        y += 36;
      }
      svg += text(item.label, 44, y, 40, 25, "#10234c", 600);
      y += lines(item.label, 40).length * 32 + 17;
      if (item.detail) {
        svg += text(item.detail, 44, y, 62, 18, "#44516d");
        y += lines(item.detail, 62).length * 25 + 8;
      }
    }
  } else if (kind === "flow") {
    items.forEach((item, i) => {
      const h = lines(item.detail, 49).length * 27 + 65;
      if (i < items.length - 1)
        svg += `<path d="M64 ${y + 25}v${h}" stroke="#c7d1e4" stroke-width="3"/>`;
      svg +=
        `<circle cx="64" cy="${y + 5}" r="20" fill="${colors[i % colors.length]}"/>` +
        text(i + 1, 64, y + 12, 4, 21, "#fff", 700, "middle");
      svg +=
        text(item.label, 102, y + 12, 35, 25, "#10234c", 700) +
        text(item.detail, 102, y + 46, 46, 20, "#44516d");
      y += h;
    });
  } else {
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2);
      const height = Math.max(
        ...pair.map(
          (item) => 80 + lines(item.label, 18).length * 30 + lines(item.detail, 22).length * 27,
        ),
      );
      pair.forEach((item, j) => {
        const x = 44 + j * 286,
          color = colors[(i + j) % colors.length];
        svg += `<rect x="${x}" y="${y}" width="266" height="${height}" rx="9" fill="#fff" stroke="${color}" stroke-width="2"/><circle cx="${x + 28}" cy="${y + 31}" r="14" fill="${color}"/>`;
        svg += text(String.fromCharCode(65 + i + j), x + 28, y + 37, 2, 16, "#fff", 700, "middle");
        svg += text(item.label, x + 20, y + 80, 18, 23, "#10234c", 700);
        const bodyY = y + 94 + lines(item.label, 18).length * 30;
        svg += text(item.detail, x + 20, bodyY, 22, 20, "#44516d");
      });
      y += height + 22;
    }
  }
  y += 14;
  svg += `<path d="M44 ${y}h552" stroke="#c6cedc"/>`;
  y += 29;
  svg += text(note, 44, y, 65, 17, "#44516d");
  y += lines(note, 65).length * 24 + 23;
  svg += text("Fonte: " + sourceLabel, 44, y, 68, 15, "#263957", 600);
  y += lines("Fonte: " + sourceLabel, 68).length * 22 + 14;
  svg += text(
    "Elaboração editorial Olena a partir da referência indicada.",
    44,
    y,
    76,
    14,
    "#59657c",
  );
  const height = y + 32;
  const alt =
    title +
    ". " +
    scope +
    ". " +
    period +
    ". " +
    items
      .map(
        (i) =>
          i.label +
          ": " +
          (typeof i.value === "number" ? (i.displayValue ?? num(i.value)) + " " + unit : i.detail),
      )
      .join("; ") +
    ". " +
    note;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}" role="img" aria-labelledby="title description"><title id="title">${esc(title)}</title><desc id="description">${esc(alt)}</desc><rect width="640" height="${height}" fill="#fff"/><g font-family="Arial,Helvetica,sans-serif">${svg}</g></svg>`;
  fs.mkdirSync(new URL("public/essay-proposals/", root), { recursive: true });
  fs.writeFileSync(new URL("public/essay-proposals/" + id + ".svg", root), markup);
  catalog[id] = {
    src: "/essay-proposals/" + id + ".svg",
    width: 640,
    height,
    kind,
    title,
    alt,
    caption: note,
    question: brief.question,
    context: brief.context,
    authorText: brief.authorText,
    discussion: brief.discussion,
    sourceLabel,
    sourceUrl,
    period,
    scope,
    verifiedOn: brief.verifiedOn,
  };
}
const generated =
  "/** Editorial infographics with verified source, scope and date. */\nexport const ESSAY_VISUALS = " +
  JSON.stringify(catalog, null, 2) +
  " as const;\n";
fs.writeFileSync(
  new URL("src/data/essay-visuals.ts", root),
  await prettier.format(generated, { ...config, parser: "typescript", printWidth: 100 }),
);
console.log(`Generated ${briefs.length} sourced editorial infographics.`);
