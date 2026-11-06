import { englishText, type EnglishPart, type EnglishGuide } from "../data/english-journey";
import { uiText } from "../i18n/runtime";

/** Study has no clock, attempt record or reward. Practice remains a separate action. */
export function EnglishStudyGuide({
  part,
  guides = part.guide,
}: {
  part: EnglishPart;
  guides?: EnglishGuide[];
}) {
  return (
    <details className="english-study-guide english-part-detail">
      <summary>{uiText("Aprender antes de praticar")}</summary>
      <p>{englishText(part.objective)}</p>
      <p>{englishText(part.lesson)}</p>
      {guides.map((guide) => (
        <section key={guide.example}>
          <h2>{englishText(guide.title)}</h2>
          <p>{englishText(guide.text)}</p>
          <blockquote lang="en">{guide.example}</blockquote>
          <p>{englishText(guide.meaning)}</p>
        </section>
      ))}
    </details>
  );
}
