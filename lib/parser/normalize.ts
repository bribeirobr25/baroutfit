// Text normalization for matching (PARSER §1).
// Lowercase, strip accents (for multi-language matching), collapse whitespace.
// Numbers and the symbols % / ² are preserved. The original text is kept by the
// caller when a display value is needed; matching always uses the normalized form.

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .toLowerCase()
    .replace(/ /g, " ") // non-breaking space -> space
    .replace(/\s+/g, " ")
    .trim();
}

// Count non-overlapping matches of a global regex.
export function countMatches(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}
