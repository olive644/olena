import type { EnglishQuestion } from "./english-journey";

// Ordering tasks become speaking practice after the first difficulty band.
// Keep their IDs and their equivalent word activity for unavailable microphones.
export const isSpeakingQuestion = (question: EnglishQuestion) =>
  question.kind === "order" && question.level >= 1;

export function spokenEnglish(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(
      /\b(i'm|you're|we're|they're|he's|she's|it's|what's|that's|there's|where's|who's|isn't|aren't|weren't|don't|doesn't|didn't|can't|won't|wouldn't|i'll|we'll|i've|i'd|let's)\b/g,
      (word) =>
        ({
          "i'm": "i am",
          "you're": "you are",
          "we're": "we are",
          "they're": "they are",
          "he's": "he is",
          "she's": "she is",
          "it's": "it is",
          "what's": "what is",
          "that's": "that is",
          "there's": "there is",
          "where's": "where is",
          "who's": "who is",
          "isn't": "is not",
          "aren't": "are not",
          "weren't": "were not",
          "don't": "do not",
          "doesn't": "does not",
          "didn't": "did not",
          "can't": "cannot",
          "won't": "will not",
          "wouldn't": "would not",
          "i'll": "i will",
          "we'll": "we will",
          "i've": "i have",
          "i'd": "i would",
          "let's": "let us",
        })[word] ?? word,
    )
    .replace(/(\d)\.(?=\d)/g, "$1 point ")
    .replace(/[.,!?;:"'()]/g, "")
    .replace(/(?<=\p{L})-(?=\p{L})/gu, " ")
    .replace(/\bcan not\b/g, "cannot")
    .replace(
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g,
      (word) => {
        const small =
          "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen"
            .split(" ")
            .indexOf(word);
        return String(
          small >= 0
            ? small
            : {
                twenty: 20,
                thirty: 30,
                forty: 40,
                fifty: 50,
                sixty: 60,
                seventy: 70,
                eighty: 80,
                ninety: 90,
              }[word],
        );
      },
    )
    .replace(/\b([2-9]0) ([1-9])\b/g, (_, tens: string, units: string) =>
      String(Number(tens) + Number(units)),
    )
    .replace(/\s+/g, " ")
    .trim();
}
