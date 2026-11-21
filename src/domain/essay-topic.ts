export type EssayTopicStatus = "aligned" | "tangential" | "off-topic" | "inconclusive";
export type EssayTopicProfile = {
  id: string;
  title: string;
  category: string;
  vector: number[];
  focus: number[];
};
export type EssayTopicSegment = { start: number; end: number; text: string; vector: number[] };
export type EssayTopicResult = {
  status: EssayTopicStatus;
  reason: "insufficient" | "repetition" | "ambiguous" | "partial" | "different" | "aligned";
  evidence: { start: number; end: number; text: string; relation: "related" | "uncertain" }[];
};
export const ESSAY_TOPIC_MODEL = {
  id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  revision: "2c4055b12046f11709e9df2c122e59ffbdc2f900",
} as const;

/** Small chunks avoid silently truncating a complete essay to the model token limit. */
export function essayTopicChunks(text: string) {
  if (text.length > 6000) throw new Error("Essay exceeds editor limit");
  const chunks: { start: number; end: number; text: string }[] = [];
  for (const paragraph of text.matchAll(/[^\r\n]+/gu)) {
    const words = [...paragraph[0].matchAll(/\S+/gu)];
    for (let i = 0; i < words.length; i += 40) {
      const first = words[i]!;
      const last = words[Math.min(i + 39, words.length - 1)]!;
      const start = paragraph.index + first.index;
      const end = paragraph.index + last.index + last[0].length;
      chunks.push({ start, end, text: text.slice(start, end) });
    }
  }
  return chunks;
}
export function topicInputWarning(text: string): "insufficient" | "repetition" | null {
  const words =
    text
      .normalize("NFC")
      .toLocaleLowerCase("pt-BR")
      .match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
  if (words.length < 35 || (text.match(/[.!?]/gu)?.length ?? 0) < 2) return "insufficient";
  const triples = words.slice(2).map((word, i) => words[i] + " " + words[i + 1] + " " + word);
  if (new Set(triples).size / triples.length < 0.5) return "repetition";
  return null;
}
export function topicCosine(a: number[], b: number[]) {
  if (
    a.length !== 384 ||
    b.length !== a.length ||
    [...a, ...b].some((value) => !Number.isFinite(value))
  )
    throw new Error("Invalid embedding");
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    aa += a[i]! ** 2;
    bb += b[i]! ** 2;
  }
  if (!aa || !bb) throw new Error("Empty embedding");
  return dot / Math.sqrt(aa * bb);
}
/** Conservative experimental triage. Similarity never assigns an essay score. */
export function assessEssayTopic(
  text: string,
  topicId: string,
  profiles: EssayTopicProfile[],
  segments: EssayTopicSegment[],
): EssayTopicResult {
  const selected = profiles.find((profile) => profile.id === topicId);
  if (
    !selected ||
    !segments.length ||
    segments.some((segment) => text.slice(segment.start, segment.end) !== segment.text)
  )
    throw new Error("Invalid topic revision");
  const warning = topicInputWarning(text);
  if (warning) return { status: "inconclusive", reason: warning, evidence: [] };
  const full = Array.from({ length: 384 }, (_, index) =>
    segments.reduce((sum, segment) => sum + (segment.vector[index] ?? 0) * segment.text.length, 0),
  );
  const ranked = profiles
    .map((profile) => ({ profile, value: topicCosine(full, profile.vector) }))
    .sort((a, b) => b.value - a.value);
  const own = ranked.find((item) => item.profile.id === topicId)!.value;
  const other = ranked.find((item) => item.profile.id !== topicId);
  const focus = topicCosine(full, selected.focus);
  const paragraphs = new Map<number, EssayTopicSegment>();
  for (const segment of segments) {
    const start =
      Math.max(
        text.lastIndexOf("\n", segment.start - 1),
        text.lastIndexOf("\r", segment.start - 1),
      ) + 1;
    const nextBreak = text.slice(segment.end).search(/[\r\n]/u);
    const end = nextBreak < 0 ? text.length : segment.end + nextBreak;
    const previous = paragraphs.get(start);
    const vector = segment.vector.map(
      (value, index) => value * segment.text.length + (previous?.vector[index] ?? 0),
    );
    paragraphs.set(start, { start, end, text: text.slice(start, end), vector });
  }
  const scored = [...paragraphs.values()].map((segment) => {
    const value = topicCosine(segment.vector, selected.vector);
    const alternative = Math.max(
      ...profiles
        .filter((profile) => profile.id !== topicId)
        .map((profile) => topicCosine(segment.vector, profile.vector)),
    );
    return { segment, value, related: value >= 0.45 && value - alternative >= -0.02 };
  });
  const coverage =
    scored.filter((item) => item.related).reduce((sum, item) => sum + item.segment.text.length, 0) /
    [...paragraphs.values()].reduce((sum, segment) => sum + segment.text.length, 0);
  // Show both the closest paragraph and the weakest one so a digression is visible.
  const ordered = [...scored].sort((a, b) => b.value - a.value);
  const evidence = [ordered[0], ordered.length > 1 ? ordered.at(-1) : undefined]
    .filter((item): item is (typeof scored)[number] => item !== undefined)
    .map((item) => ({
      start: item.segment.start,
      end: item.segment.end,
      text: item.segment.text,
      relation: item.related ? ("related" as const) : ("uncertain" as const),
    }));
  if (other && Math.abs(own - other.value) < 0.04)
    return { status: "inconclusive", reason: "ambiguous", evidence };
  if (own >= 0.5 && focus >= 0.4 && coverage >= 0.6 && (!other || own > other.value))
    return { status: "aligned", reason: "aligned", evidence };
  if (
    other &&
    other.value - own > 0.1 &&
    own < 0.4 &&
    focus < 0.35 &&
    coverage === 0 &&
    other.profile.category !== selected.category
  )
    return { status: "off-topic", reason: "different", evidence };
  if (
    (coverage > 0 && coverage < 0.6) ||
    (own >= 0.4 && focus < 0.4) ||
    (other &&
      other.profile.category === selected.category &&
      other.value - own > 0.08 &&
      own >= 0.3)
  )
    return { status: "tangential", reason: "partial", evidence };
  return { status: "inconclusive", reason: "ambiguous", evidence };
}
