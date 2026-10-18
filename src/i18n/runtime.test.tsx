import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import english from "../../public/locales/en-US.json";
import portuguese from "../../public/locales/pt-BR.json";
import {
  changeLanguage,
  installUiCatalog,
  localizeLabels,
  localizeResource,
  uiLocale,
  uiText,
  uiWeekdays,
  useLanguage,
} from "./runtime";
import { useState } from "react";

it("catalogs have the same keys and preserve interpolation placeholders", () => {
  expect(english).toHaveLength(portuguese.length);
  for (let index = 0; index < portuguese.length; index++) {
    expect(english[index]?.trim()).toBeTruthy();
    expect([...english[index]!.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort()).toEqual(
      [...portuguese[index]!.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
    );
  }
});

it("translates resource labels and messages without changing identifiers or exercise answers", async () => {
  installUiCatalog("en-US", english);
  const original = {
    id: "Conta",
    name: "Matemática",
    prompt: "Conta",
    answer: "Conta",
    topics: ["Adição"],
    title: "Noite da Helena",
  };
  const resource = localizeResource(original);
  try {
    await changeLanguage("en-US");
    expect(resource.name).toBe("Math");
    expect(resource.topics[0]).toBe("Addition");
    expect(resource.title).toBe("Helena's Night");
    expect(resource.id).toBe("Conta");
    expect(resource.prompt).toBe("Conta");
    expect(resource.answer).toBe("Conta");
    expect(original.name).toBe("Matemática");
    expect(uiText(1859, [1, uiText(2570, [2]), 3])).toBe("Pages 1 and 2 of 3");
    expect(uiText("Você tem 2 flashcards para revisar hoje.")).toBe(
      "You have 2 flashcards to review today.",
    );
  } finally {
    await changeLanguage("pt-BR");
  }
});
it("switches in both directions without remounting or translating user input", async () => {
  installUiCatalog("en-US", english);
  const labels = localizeLabels(() => [{ label: uiText(1515) }]);
  function Example() {
    useLanguage();
    const [text, setText] = useState("Conta");
    const [count, setCount] = useState(0);
    return (
      <>
        <h1>{labels[0]!.label}</h1>
        <input
          aria-label="user text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button onClick={() => setCount(count + 1)}>{count}</button>
      </>
    );
  }
  render(<Example />);
  fireEvent.click(screen.getByRole("button"));
  try {
    await act(async () => changeLanguage("en-US"));
    expect(screen.getByRole("heading").textContent).toBe("Account");
    expect(screen.getByRole("button").textContent).toBe("1");
    expect((screen.getByLabelText("user text") as HTMLInputElement).value).toBe("Conta");
    expect(document.documentElement.lang).toBe("en-US");
    expect(uiWeekdays()).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
  } finally {
    await act(async () => changeLanguage("pt-BR"));
  }
  expect(screen.getByRole("heading").textContent).toBe("Conta");
  expect(uiLocale()).toBe("pt-BR");
});
