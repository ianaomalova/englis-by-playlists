export type ItemType = 'word' | 'sentence';
export type View = 'database' | 'vocabulary' | 'practice' | 'statistics';

export interface ItemStats {
  correct: number;
  incorrect: number;
}

export interface LessonItem {
  id: string;
  type: ItemType;
  original: string;
  translation: string;
  stats: ItemStats;
}

export interface Lesson {
  id: string;
  name: string;
  createdAt: number;
  items: LessonItem[];
}
