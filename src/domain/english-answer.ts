/** Expand only unambiguous contractions. Never infer a semantic match from shared words. */
export function englishAnswerKey(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(
      /\b(i'm|you're|we're|they're|isn't|aren't|don't|doesn't|didn't|can't|couldn't|won't|wouldn't|shouldn't|haven't|hasn't|hadn't|i've|you've|we've|they've|i'll|you'll|we'll|they'll)\b/g,
      (match) =>
        ({
          "i'm": "i am",
          "you're": "you are",
          "we're": "we are",
          "they're": "they are",
          "isn't": "is not",
          "aren't": "are not",
          "don't": "do not",
          "doesn't": "does not",
          "didn't": "did not",
          "can't": "cannot",
          "couldn't": "could not",
          "won't": "will not",
          "wouldn't": "would not",
          "shouldn't": "should not",
          "haven't": "have not",
          "hasn't": "has not",
          "hadn't": "had not",
          "i've": "i have",
          "you've": "you have",
          "we've": "we have",
          "they've": "they have",
          "i'll": "i will",
          "you'll": "you will",
          "we'll": "we will",
          "they'll": "they will",
        })[match] ?? match,
    )
    .replace(/[.!?,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
