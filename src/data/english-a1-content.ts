import type { EnglishText, EnglishGuide } from "./english-journey";
type A1Task = {
  id: number;
  unit: number;
  level: number;
  kind: "meaning" | "gap" | "reply" | "order";
  phrase: string;
  meaning: EnglishText;
  answer: EnglishText;
  options: EnglishText[];
  intent: EnglishText;
  focus: string;
  explanation: EnglishText;
};
export type A1Content = {
  version: 1;
  level: "A1";
  units: { title: EnglishText; objective: EnglishText; guide: EnglishGuide[] }[];
  tasks: A1Task[];
};
export function validA1Content(value: unknown): value is A1Content {
  const obj = (v: unknown): v is Record<string, unknown> =>
    Boolean(v) && typeof v === "object" && !Array.isArray(v);
  const str = (v: unknown): v is string =>
    typeof v === "string" && v.length > 0 && v.length <= 1600;
  const text = (v: unknown) => obj(v) && str(v["pt-BR"]) && str(v["en-US"]);
  if (
    !obj(value) ||
    value["version"] !== 1 ||
    value["level"] !== "A1" ||
    !Array.isArray(value["units"]) ||
    value["units"].length !== 6 ||
    !Array.isArray(value["tasks"]) ||
    value["tasks"].length !== 120
  )
    return false;
  return (
    value["units"].every(
      (u: unknown) =>
        obj(u) &&
        text(u["title"]) &&
        text(u["objective"]) &&
        Array.isArray(u["guide"]) &&
        u["guide"].length === 2 &&
        u["guide"].every(
          (g: unknown) =>
            obj(g) &&
            text(g["title"]) &&
            text(g["text"]) &&
            str(g["example"]) &&
            text(g["meaning"]),
        ),
    ) &&
    value["tasks"].every((t: unknown, i: number) => {
      if (
        !obj(t) ||
        t["id"] !== 120 + i ||
        t["unit"] !== Math.floor(i / 20) ||
        !Number.isInteger(t["level"]) ||
        Number(t["level"]) < 0 ||
        Number(t["level"]) > 3 ||
        !["meaning", "gap", "reply", "order"].includes(String(t["kind"])) ||
        !str(t["phrase"]) ||
        !text(t["meaning"]) ||
        !text(t["answer"]) ||
        !text(t["intent"]) ||
        !str(t["focus"]) ||
        !text(t["explanation"]) ||
        !Array.isArray(t["options"]) ||
        !t["options"].every(text)
      )
        return false;
      const answer = t["answer"] as EnglishText;
      if (t["kind"] === "order")
        return (
          t["options"].length === 0 &&
          answer["pt-BR"] === t["phrase"] &&
          answer["en-US"] === t["phrase"]
        );
      if (t["kind"] === "gap") {
        if (!/^[a-zA-Z]+$/.test(answer["en-US"]) || answer["pt-BR"] !== answer["en-US"])
          return false;
        if (
          (String(t["phrase"]).match(new RegExp("\\b" + answer["en-US"] + "\\b", "g")) ?? [])
            .length !== 1
        )
          return false;
      }
      return (
        t["options"].length === 3 &&
        ["pt-BR", "en-US"].every((locale) => {
          const options = t["options"] as EnglishText[];
          const key = locale as keyof EnglishText;
          return (
            new Set(options.map((o) => o[key])).size === 3 &&
            options.some((o) => o[key] === (t["answer"] as EnglishText)[key])
          );
        })
      );
    })
  );
}
