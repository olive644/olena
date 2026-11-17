import { expect, test, type Page } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

// Rabiscar para apagar: riscar a escrita em zigue-zague com a caneta apaga os traços de baixo.
type Pt = [number, number];

async function openSheet(page: Page, preferences: Record<string, boolean> = {}) {
  let workspace = workspaceReducer(createInitialWorkspace(), {
    type: "notebook/added",
    id: "scribble",
    title: "Rabisco",
    subjectId: "",
    createdAt: "2026-11-16",
  });
  workspace = workspaceReducer(workspace, {
    type: "note/added",
    id: "sheet",
    notebookId: "scribble",
    subjectId: "",
    updatedAt: "2026-11-16",
  });
  await page.addInitScript(
    ([state, prefs]) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
      localStorage.setItem(
        "helena.notebookPreferences.v1",
        JSON.stringify({ shapeSnap: false, penOnly: false, ...(prefs as object) }),
      );
    },
    [workspace, preferences] as const,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cadernos");
  await page.locator(".notebook-card").filter({ hasText: "Rabisco" }).click();
  await page.getByRole("button", { name: /^Abrir preview/ }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão" });
  const canvas = editor.locator(".handwriting-canvas");
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element) => {
    element.setPointerCapture = () => {};
  });
  return { editor, canvas };
}

// Um traço com o mouse, em unidades da folha, no ritmo de dois eventos por quadro.
async function stroke(canvas: ReturnType<Page["locator"]>, points: Pt[]) {
  await canvas.evaluate(async (element, list) => {
    const path = list as Pt[];
    const fire = (type: string, x: number, y: number) => {
      const bounds = element.getBoundingClientRect();
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 31,
          pointerType: "mouse",
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          pressure: type === "pointerup" ? 0 : 0.5,
          clientX: bounds.x + (x / Number(element.dataset["pageWidth"])) * bounds.width,
          clientY: bounds.y + (y / Number(element.dataset["pageHeight"])) * bounds.height,
        }),
      );
    };
    fire("pointerdown", path[0]![0], path[0]![1]);
    for (let index = 1; index < path.length; index += 2) {
      for (let k = index; k < Math.min(index + 2, path.length); k += 1)
        fire("pointermove", path[k]![0], path[k]![1]);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    fire("pointerup", path.at(-1)![0], path.at(-1)![1]);
  }, points);
}

const line = (a: Pt, b: Pt, steps = 24): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => [
    a[0] + ((b[0] - a[0]) * i) / steps,
    a[1] + ((b[1] - a[1]) * i) / steps,
  ]);

function scratch(x0: number, y0: number, width: number, drop: number, passes = 7): Pt[] {
  const points: Pt[] = [];
  for (let pass = 0; pass < passes; pass += 1)
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12;
      points.push([x0 + (pass % 2 === 0 ? t : 1 - t) * width, y0 + ((pass + t) / passes) * drop]);
    }
  return points;
}

// Pixels escuros da tinta confirmada dentro de um retângulo da folha.
async function ink(editor: ReturnType<Page["locator"]>, box: [number, number, number, number]) {
  return editor.locator(".handwriting-committed-ink").evaluate((element, region) => {
    const canvas = element as HTMLCanvasElement;
    const scale = canvas.width / Number(canvas.dataset["pageWidth"]);
    const [x, y, w, h] = region as [number, number, number, number];
    const data = canvas
      .getContext("2d")!
      .getImageData(
        Math.floor(x * scale),
        Math.floor(y * scale),
        Math.ceil(w * scale),
        Math.ceil(h * scale),
      ).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 120 && data[i]! < 110) count += 1;
    return count;
  }, box);
}

// "teste" feito de três traços curtos, num retângulo conhecido.
const WORD: Pt[][] = [
  [...line([210, 300], [210, 360]), ...line([210, 330], [190, 330], 6)],
  line([250, 325], [290, 325]),
  line([250, 345], [290, 372]),
];
const WORD_BOX: [number, number, number, number] = [180, 290, 125, 90];

test("rabiscar sobre a escrita apaga os traços de baixo e desfazer devolve", async ({ page }) => {
  const { editor, canvas } = await openSheet(page);
  for (const part of WORD) await stroke(canvas, part);
  await expect.poll(() => ink(editor, WORD_BOX)).toBeGreaterThan(40);
  await stroke(canvas, scratch(170, 290, 150, 90));
  await expect.poll(() => ink(editor, WORD_BOX)).toBe(0);
  const history = editor.getByRole("button", { name: "Histórico e zoom", exact: true });
  if (await history.isVisible()) await history.click();
  await editor.getByRole("button", { name: "Desfazer", exact: true }).click();
  // um passo de desfazer devolve a palavra inteira, sem o rabisco
  await expect.poll(() => ink(editor, WORD_BOX)).toBeGreaterThan(40);
});

test("rabisco em lugar vazio fica como um traço comum", async ({ page }) => {
  const { editor, canvas } = await openSheet(page);
  await stroke(canvas, scratch(170, 700, 150, 90));
  await expect.poll(() => ink(editor, [160, 690, 175, 110])).toBeGreaterThan(200);
});

test("cursiva emendada por cima da escrita não apaga nada", async ({ page }) => {
  const { editor, canvas } = await openSheet(page);
  for (const part of WORD) await stroke(canvas, part);
  const before = await ink(editor, WORD_BOX);
  const loops: Pt[] = [];
  for (let i = 0; i <= 220; i += 1) {
    const t = i / 220;
    loops.push([
      170 + 150 * t + 9 * Math.sin(Math.PI * 2 * 8 * t),
      335 + 14 * Math.cos(Math.PI * 2 * 8 * t),
    ]);
  }
  await stroke(canvas, loops);
  // a escrita continua e a cursiva também ficou na folha
  await expect.poll(() => ink(editor, WORD_BOX)).toBeGreaterThanOrEqual(before);
});

test("com o interruptor desligado o rabisco fica na folha e nada é apagado", async ({ page }) => {
  const { editor, canvas } = await openSheet(page, { scribbleErase: false });
  for (const part of WORD) await stroke(canvas, part);
  const before = await ink(editor, WORD_BOX);
  await stroke(canvas, scratch(170, 290, 150, 90));
  await expect.poll(() => ink(editor, WORD_BOX)).toBeGreaterThan(before);
});
