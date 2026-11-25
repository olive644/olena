// Exporta para PNG os ícones do site usados pelas telas sociais e pelo menu do app Android.
// Uso: node scripts/export-social-icons.cjs   (precisa do playwright-core e de um Chrome instalado)
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "android/app/src/main/res/drawable-nodpi");
const read = (file) => fs.readFileSync(path.join(root, "public", file), "utf8");
const symbol = (file, id, color) => {
  const sprite = read(file);
  const match = sprite.match(
    new RegExp(`<symbol id="${id}" viewBox="([^"]+)">([\\s\\S]*?)</symbol>`),
  );
  if (!match) throw new Error(`${file}#${id} não existe`);
  // O SVG solto não resolve var(): usa o valor de reserva do próprio site.
  const body = match[2].replace(/var\(--editor-icon-facet, (#[0-9A-Fa-f]{6})\)/g, "$1");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${match[1]}" style="color:${color}">${body}</svg>`;
};

const jobs = [
  ["art_friends_contacts", read("navigation-icons/paper/profile-contacts.svg"), 96],
  ["art_friends_search", read("navigation-icons/paper/profile-search.svg"), 96],
  [
    "art_friends_share_light",
    symbol("navigation-icons/paper/paper-editor-icon.svg", "share", "#0F0F14"),
    96,
  ],
  [
    "art_friends_share_dark",
    symbol("navigation-icons/paper/paper-editor-icon.svg", "share", "#F4F2EE"),
    96,
  ],
  ["art_friends_copy", symbol("room-icons/social-actions.svg", "copy", "#000"), 96],
  ["art_friends_logo", read("favicon-star.svg"), 88],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [name, svg, size] of jobs) {
    await page.setContent(
      `<body style="margin:0;background:transparent"><div id="x" style="width:${size}px;height:${size}px">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</div></body>`,
    );
    await page
      .locator("#x")
      .screenshot({ path: path.join(target, `${name}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(`${jobs.length} ícones em ${path.relative(root, target)}`);
})();
