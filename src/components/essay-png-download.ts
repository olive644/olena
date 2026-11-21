import { ESSAY_VISUALS } from "../data/essay-visuals";

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

async function renderPaper(
  title: string,
  text: string,
  visual?: (typeof ESSAY_VISUALS)[keyof typeof ESSAY_VISUALS],
) {
  await document.fonts.ready;
  const favicon = await loadImage("/olena-favicon-192.png");
  const illustration = visual ? await loadImage(visual.src) : undefined;
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const bodyFont =
    getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() ||
    "Manrope, sans-serif";
  const displayFont =
    getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() ||
    bodyFont;
  function lines(value: string, width: number, font: string) {
    context!.font = font;
    return value.split("\n").flatMap((paragraph) => {
      if (!paragraph.trim()) return [""];
      const result: string[] = [];
      let line = "";
      for (const word of paragraph.split(/\s+/u)) {
        const candidate = line ? `${line} ${word}` : word;
        if (context!.measureText(candidate).width <= width) {
          line = candidate;
          continue;
        }
        if (line) {
          result.push(line);
          line = "";
        }
        for (const character of word) {
          if (context!.measureText(line + character).width > width && line) {
            result.push(line);
            line = "";
          }
          line += character;
        }
      }
      if (line) result.push(line);
      return result;
    });
  }
  const headingLines = lines(title, 1080, `700 32px ${displayFont}`);
  const contentLines = lines(text, 1080, `24px ${bodyFont}`);
  const imageHeight = illustration
    ? Math.round((720 * illustration.height) / illustration.width)
    : 0;
  canvas.height = Math.max(
    1754,
    240 + headingLines.length * 44 + contentLines.length * 38 + imageHeight + 160,
  );
  if (canvas.height > 24000) throw new Error("Export exceeds image limit");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = visual ? "#e4d3ff" : "#fff0ad";
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(70, 0);
  context.lineTo(0, 70);
  context.fill();
  context.drawImage(favicon, 80, 55, 64, 64);
  context.font = `800 42px ${displayFont}`;
  context.fillStyle = visual ? "#432369" : "#896300";
  context.fillText("OLENASTUDY", 166, 103);
  context.fillStyle = visual ? "#8651cc" : "#facc15";
  context.fillText("OLENASTUDY", 164, 100);
  context.save();
  context.beginPath();
  context.moveTo(164, 55);
  context.lineTo(510, 55);
  context.lineTo(164, 100);
  context.closePath();
  context.clip();
  context.fillStyle = visual ? "#c29aef" : "#ffe88d";
  context.fillText("OLENASTUDY", 164, 100);
  context.restore();
  context.fillStyle = visual ? "#aa78ec" : "#facc15";
  context.fillRect(80, 145, 1080, 3);
  let y = 205;
  context.font = `700 32px ${displayFont}`;
  context.fillStyle = visual ? "#302438" : "#302d28";
  for (const line of headingLines) {
    context.fillText(line, 80, y);
    y += 44;
  }
  y += 28;
  context.font = `24px ${bodyFont}`;
  for (const line of contentLines) {
    if (!visual) {
      context.fillStyle = visual ? "#e4d3ff" : "#fff0ad";
      context.fillRect(80, y + 9, 1080, 1);
    }
    context.fillStyle = visual ? "#302438" : "#302d28";
    context.fillText(line, 80, y);
    y += 38;
  }
  if (illustration) context.drawImage(illustration, 260, y + 20, 720, imageHeight);
  context.fillStyle = visual ? "#aa78ec" : "#facc15";
  context.fillRect(80, canvas.height - 105, 1080, 2);
  context.font = `22px ${bodyFont}`;
  context.fillStyle = visual ? "#573094" : "#896300";
  context.textAlign = "center";
  context.fillText("Feito no OlenaStudy", canvas.width / 2, canvas.height - 58);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG unavailable"))),
      "image/png",
    ),
  );
}

export async function createEssayPngs(text: string, title: string, topicId?: string) {
  const { ESSAY_PROPOSALS } = await import("../data/essay-catalog");
  const proposal = ESSAY_PROPOSALS.find((item) => item.id === topicId);
  const visual =
    topicId && topicId in ESSAY_VISUALS
      ? ESSAY_VISUALS[topicId as keyof typeof ESSAY_VISUALS]
      : undefined;
  if (!proposal || !visual) throw new Error("Proposal unavailable");
  const instructions =
    "Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, produza um texto dissertativo-argumentativo, em modalidade escrita formal da língua portuguesa, sobre o tema “{0}”. Apresente uma tese e desenvolva argumentos que analisem o problema, suas causas e seus efeitos na sociedade. Selecione e relacione informações, exemplos e repertórios pertinentes, com coerência e coesão, para sustentar seu ponto de vista. Ao concluir, proponha uma intervenção relacionada à discussão, indicando quem pode agir, o que deve ser feito, como a ação pode ser realizada e qual resultado se pretende alcançar, respeitando os direitos humanos. Utilize os textos motivadores como apoio à reflexão, sem reproduzir seus trechos como substitutos da sua argumentação.".replace(
      "{0}",
      title,
    );
  const proposalText = `Assunto: ${proposal.category}\n\nPROPOSTA DE REDAÇÃO\n${instructions}\n\nTEXTO I\n${visual.context}\n\nTEXTO II\n${visual.authorText}\n\nTEXTO III\n${visual.discussion}\n\nFonte da imagem: ${visual.sourceLabel}\n${visual.sourceUrl}\n${visual.caption}`;
  // Prepare both images before starting either download, avoiding partial generation.
  const blobs = await Promise.all([
    renderPaper(title, text),
    renderPaper(title, proposalText, visual),
  ]);
  return blobs;
}

export async function downloadEssayPngs(text: string, title: string, topicId?: string) {
  const blobs = await createEssayPngs(text, title, topicId);
  const slug = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/giu, "-")
    .slice(0, 90);
  blobs.forEach((blob, index) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${index ? "proposta" : "redacao"}-${slug}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  });
}
