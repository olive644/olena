import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EnglishStudyGuide } from "./english-study-guide";
import { validEnglishCourse } from "../data/english-journey";
import { installUiCatalog } from "../i18n/runtime";

afterEach(cleanup);
it("offers authored study in every part without starting or recording a timed activity", () => {
  installUiCatalog("pt-BR", JSON.parse(readFileSync("public/locales/pt-BR.json", "utf8")));
  const course: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
  if (!validEnglishCourse(course)) throw Error("Invalid course");
  for (const part of course.parts) {
    const view = render(<EnglishStudyGuide part={part} />);
    fireEvent.click(screen.getByText("Aprender antes de praticar"));
    expect(view.container.querySelectorAll("section")).toHaveLength(4);
    for (const guide of part.guide)
      expect(screen.getByText(guide.example).textContent).toBe(guide.example);
    expect(view.container.querySelector("input,form,button")).toBeNull();
    cleanup();
  }
});
