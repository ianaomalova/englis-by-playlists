// curly apostrophes and curly double-quote normalisation
const CURLY_APOS = /[\u2018\u2019\u201A\u201B\u02BC]/g;
const CURLY_QUOT = /[\u201C\u201D\u201E\u201F]/g;

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(CURLY_APOS, "'")
    .replace(CURLY_QUOT, '"')
    .toLowerCase();
}

export function normalizeText(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(CURLY_APOS, "'")
    .replace(CURLY_QUOT, '"');
}
