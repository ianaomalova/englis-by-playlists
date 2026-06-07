import type { Lesson, LessonItem } from './types';
import { genId } from './store';

const SENTENCE_START = /^(I|He|She|They|We|It|You|This|These|That|Those|The|My|His|Her|Their|Our|Your|All|Such)\s/i;

function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

// Normalize fancy/curly quotes to straight ASCII equivalents
function normQuotes(text: string): string {
  return text
    .replace(/[‘’‚‛ʼ]/g, "'")
    .replace(/[“”„‟]/g, '"');
}

function stripNotes(text: string): string {
  return normQuotes(text)
    .replace(/\s*\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
    // Lesson header: # Урок N
    if (line.startsWith('#')) {
      const name = line.replace(/^#+\s*/, '').trim();
      current = { id: genId(), name, createdAt: Date.now(), items: [] };
      lessons.push(current);
      continue;
    }

    if (!current) continue;

    // Numbered sentence: "1. text" or "1. text - перевод"
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    if (numbered) {
      const text = numbered[1].trim();
      const cyrDash = text.search(/\s+[-–—]\s+[Ѐ-ӿ]/);
      let original: string;
      let translation = '';

      if (cyrDash !== -1) {
        original = stripNotes(text.slice(0, cyrDash));
        translation = stripNotes(text.slice(cyrDash).replace(/^\s*[-–—]\s*/, ''));
      } else {
        original = stripNotes(text);
      }

      if (original) current.items.push(makeItem('sentence', original, translation));
      continue;
    }

    // "english - русский" pattern (dash only when right side is Cyrillic)
    const dashMatch = line.match(/^(.+?)\s+[-–—]\s+([Ѐ-ӿ].+)$/);
    if (dashMatch) {
      const left = dashMatch[1].trim();
      const right = dashMatch[2].trim();
      if (isSentence(left)) {
        current.items.push(makeItem('sentence', stripNotes(left), stripNotes(right)));
      } else {
        current.items.push(makeItem('word', normQuotes(left), normQuotes(right)));
      }
      continue;
    }

    // Plain English sentence (no number, no dash): ≥4 words, capital letter
    const wordCount = line.split(/\s+/).length;
    if (wordCount >= 4 && /^[A-Z]/.test(line) && !line.includes(':')) {
      const cleaned = stripNotes(line);
      if (cleaned) {
        current.items.push(makeItem('sentence', cleaned, ''));
      }
    }
  }

  for (const lesson of lessons) {
    const missing = lesson.items.filter(i => i.type === 'sentence' && !i.translation).length;
    if (missing > 0) {
      warnings.push(`«${lesson.name}»: ${missing} предл. без перевода — добавьте вручную`);
    }
  }

  return { lessons, warnings };
}
