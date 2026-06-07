import { useState, useMemo } from 'preact/hooks';
import type { Lesson } from '../types';

interface Props {
  lessons: Lesson[];
}

export function VocabularyView({ lessons }: Props) {
  const [search, setSearch] = useState('');
  const [filterLesson, setFilterLesson] = useState('all');

  const allWords = useMemo(() => {
    return lessons.flatMap(l =>
      l.items
        .filter(i => i.type === 'word')
        .map(i => ({ ...i, lessonName: l.name, lessonId: l.id }))
    );
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allWords.filter(w => {
      if (filterLesson !== 'all' && w.lessonId !== filterLesson) return false;
      if (!q) return true;
      return w.original.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q);
    });
  }, [allWords, search, filterLesson]);

  const grouped = useMemo(() => {
    const map = new Map<string, { lessonName: string; items: typeof filtered }>();
    for (const item of filtered) {
      if (!map.has(item.lessonId)) {
        map.set(item.lessonId, { lessonName: item.lessonName, items: [] });
      }
      map.get(item.lessonId)!.items.push(item);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div class="vocab-view">
      <div class="vocab-toolbar">
        <input
          class="input vocab-search"
          type="search"
          placeholder="Поиск по слову или переводу..."
          value={search}
          onInput={(e) => setSearch((e.currentTarget as HTMLInputElement).value)}
        />
        <select
          class="select"
          value={filterLesson}
          onChange={(e) => setFilterLesson((e.currentTarget as HTMLSelectElement).value)}
        >
          <option value="all">Все уроки</option>
          {lessons.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <span class="vocab-count">{filtered.length} слов</span>
      </div>

      {allWords.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <p>Нет слов и фраз. Добавьте их в разделе «База данных».</p>
        </div>
      ) : filtered.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>Ничего не найдено</p>
        </div>
      ) : (
        <div class="vocab-groups">
          {grouped.map(([lessonId, { lessonName, items }]) => (
            <div key={lessonId} class="vocab-group">
              <div class="vocab-group-header">
                <span class="vocab-group-name">{lessonName}</span>
                <span class="vocab-group-count">{items.length}</span>
              </div>
              <div class="vocab-table-wrap">
                <table class="vocab-table">
                  <thead>
                    <tr>
                      <th>Слово / Фраза</th>
                      <th>Перевод</th>
                      <th>✓</th>
                      <th>✗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td class="vocab-original">{item.original}</td>
                        <td class="vocab-translation">{item.translation}</td>
                        <td class="vocab-stat vocab-correct">{item.stats.correct || '—'}</td>
                        <td class="vocab-stat vocab-incorrect">{item.stats.incorrect || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
