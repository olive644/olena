const fs = require("fs"),
  assert = require("node:assert/strict");
const rows = JSON.parse(fs.readFileSync("previews/arcana-catalog.json"));
assert.equal(rows.length, 78);
assert.equal(new Set(rows.map((r) => r.id)).size, 78);
assert.equal(rows.filter((r) => r.group === "major").length, 22);
for (const suit of ["wands", "cups", "swords", "pentacles"]) {
  const cards = rows.filter((r) => r.group === suit);
  assert.equal(cards.length, 14);
  assert.deepEqual(
    cards.map((r) => r.mark),
    ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "P", "C", "Q", "K"],
  );
}
assert.equal(
  new Set(rows.filter((r) => r.group === "major").flatMap((r) => r.characters)).size,
  15,
);
assert.deepEqual(rows.find((r) => r.id === "major-12").characters, ["Leo"]);
const available = JSON.parse(fs.readFileSync("previews/arcana-ready.json"));
for (const id of available) {
  const row = rows.find((r) => r.id === id);
  assert.ok(row);
  assert.ok(fs.existsSync("public" + row.asset));
  assert.ok(fs.existsSync("public" + row.asset.replace(".webp", "-small.webp")));
}
console.log(
  "78 unique cards, correct 22/56 split, four 14-card suits, 15 official characters, Leo XII and available files verified.",
);
