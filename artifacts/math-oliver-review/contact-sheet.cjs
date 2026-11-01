const { createCanvas, loadImage } = require("@napi-rs/canvas");
const fs = require("fs");
(async () => {
  const dir = "artifacts/math-oliver-review/motion-v5";
  for (const group of ["jump", "mouth", "sad", "steps", "wave"]) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(group + "-") && f.endsWith(".png") && !f.includes("sheet"));
    const c = createCanvas(1000, Math.ceil(files.length / 4) * 280),
      g = c.getContext("2d");
    g.fillStyle = "#373044";
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < files.length; i++) {
      g.drawImage(
        await loadImage(dir + "/" + files[i]),
        (i % 4) * 250,
        Math.floor(i / 4) * 280,
        250,
        250,
      );
      g.fillStyle = "white";
      g.font = "16px sans-serif";
      g.fillText(files[i], (i % 4) * 250 + 8, Math.floor(i / 4) * 280 + 270);
    }
    fs.writeFileSync(dir + "/" + group + "-sheet.png", c.toBuffer("image/png"));
  }
})();
