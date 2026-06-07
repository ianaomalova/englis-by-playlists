import type { Lesson, LessonItem } from './types';
import { genId } from './store';

// Pronouns/determiners that signal a line is a sentence, not a phrase
const SENTENCE_START = /^(I|He|She|They|We|It|You|This|These|That|Those|The|My|His|Her|Their|Our|Your|All|Such)\s/i;

function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

function stripNotes(text: string): string {
  return text.replace(/\s*\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
}

function isSentence(text: string): boolean {
  const words = text.trim().split(/\s+/).length;
  return words >= 5 || SENTENCE_START.test(text);
}

function makeItem(type: LessonItem['type'], original: string, translation: string): LessonItem {
  return {
    id: genId(),
    type,
    original: original.trim(),
    translation: translation.trim(),
    stats: { correct: 0, incorrect: 0 },
  };
}

export interface ParseResult {
  lessons: Lesson[];
  warnings: string[];
}

export function parseText(raw: string): ParseResult {
  const lessons: Lesson[] = [];
  const warnings: string[] = [];
  let current: Lesson | null = null;

  const lines = raw.split('\n').map(l => stripBold(l.trim())).filter(Boolean);

  for (const line of lines) {
    // ── Lesson header ─────────────────────────────────
    if (line.startsWith('#')) {
      const name = line.replace(/^#+\s*/, '').trim();
      current = { id: genId(), name, createdAt: Date.now(), items: [] };
      lessons.push(current);
      continue;
    }

    if (!current) continue;

    // ── Numbered sentence: "1. text" or "1. text - перевод" ──
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    if (numbered) {
      let text = numbered[1].trim();

      // Check if right side after " - " contains Cyrillic (explicit translation)
      const cyrDash = text.search(/\s+[-–]\s+[Ѐ-ӿ]/);
      let original: string;
      let translation = '';

      if (cyrDash !== -1) {
        original = stripNotes(text.slice(0, cyrDash));
        translation = stripNotes(text.slice(cyrDash).replace(/^\s*[-–]\s*/, ''));
      } else {
        original = stripNotes(text);
      }

      if (original) {
        current.items.push(makeItem('sentence', original, translation));
      }
      continue;
    }

    // ── Line with "english - русский" dash pattern ───
    // Only split on dash when right side starts with Cyrillic
    const dashMatch = line.match(/^(.+?)\s+[-–]\s+([Ѐ-ӿ].+)$/);
    if (dashMatch) {
      const left = dashMatch[1].trim();
      const right = dashMatch[2].trim();

      if (isSentence(left)) {
        current.items.push(makeItem('sentence', stripNotes(left), stripNotes(right)));
      } else {
        current.items.push(makeItem('word', left, right));
      }
      continue;
    }

    // ── Plain English sentence (no number, no dash) ──
    // Must look like a sentence: ≥ 4 words, starts with capital letter
    const wordCount = line.split(/\s+/).length;
    if (wordCount >= 4 && /^[A-Z]/.test(line) && !line.includes(':')) {
      const cleaned = stripNotes(line);
      if (cleaned) {
        current.items.push(makeItem('sentence', cleaned, ''));
        if (!SENTENCE_START.test(cleaned)) {
          warnings.push(`Нет перевода: "${cleaned.slice(0, 60)}"`);
        }
      }
    }
  }

  // Warn about sentences with no translation
  for (const lesson of lessons) {
    const missing = lesson.items.filter(i => i.type === 'sentence' && !i.translation).length;
    if (missing > 0) {
      warnings.push(`«${lesson.name}»: ${missing} предл. без перевода — добавьте вручную`);
    }
  }

  return { lessons, warnings };
}
