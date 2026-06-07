import type { Lesson, ItemType } from '../types';

interface Props {
  lessons: Lesson[];
  onChange: (lessons: Lesson[]) => void;
}

const TYPE_LABELS: Record<ItemType, string> = {
  word: 'Слово / Фраза',
  sentence: 'Предложение',
};

export function StatsView({ lessons, onChange }: Props) {
  const allItems = lessons.flatMap(l => l.items);
  const totalCorrect = allItems.reduce((s, i) => s + i.stats.correct, 0);
  const totalIncorrect = allItems.reduce((s, i) => s + i.stats.incorrect, 0);
  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  function resetLessonStats(lessonId: string) {
    onChange(lessons.map(l =>
      l.id === lessonId
        ? { ...l, items: l.items.map(i => ({ ...i, stats: { correct: 0, incorrect: 0 } })) }
        : l
    ));
  }

  return (
    <div class="stats-view">
      <h2>Статистика</h2>

      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-num">{allItems.length}</span>
          <span class="overview-label">Всего элементов</span>
        </div>
        <div class="overview-card overview-total">
          <span class="overview-num">{totalAttempts}</span>
          <span class="overview-label">Всего попыток</span>
        </div>
        <div class="overview-card overview-correct">
          <span class="overview-num">{totalCorrect}</span>
          <span class="overview-label">Правильно</span>
        </div>
        <div class="overview-card overview-incorrect">
          <span class="overview-num">{totalIncorrect}</span>
          <span class="overview-label">Неправильно</span>
        </div>
        <div class="overview-card overview-accent">
          <span class="overview-num">{accuracy}%</span>
          <span class="overview-label">Точность</span>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>Нет данных. Добавьте уроки в разделе «База данных» и начните практиковаться.</p>
        </div>
      ) : (
        lessons.map(lesson => {
          const items = lesson.items;
          const lc = items.reduce((s, i) => s + i.stats.correct, 0);
          const li = items.reduce((s, i) => s + i.stats.incorrect, 0);
          const lt = lc + li;
          const la = lt > 0 ? Math.round((lc / lt) * 100) : null;

          return (
            <div key={lesson.id} class="lesson-stats-block">
              <div class="lesson-stats-header">
                <div class="lesson-stats-title">
                  <h3>{lesson.name}</h3>
                  <span class="stats-meta">{items.length} элем.</span>
                </div>
                <div class="lesson-stats-summary">
                  <span class="badge badge-correct">✓ {lc}</span>
                  <span class="badge badge-incorrect">✗ {li}</span>
                  {la !== null && <span class="badge">{la}%</span>}
                  <button
                    class="btn btn-danger-ghost btn-sm"
                    onClick={() => resetLessonStats(lesson.id)}
                    title="Сбросить статистику урока"
                  >
                    Сбросить
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <p class="no-items">Нет элементов в уроке</p>
              ) : (
                <div class="stats-table-wrap">
                  <table class="stats-table">
                    <thead>
                      <tr>
                        <th>Тип</th>
                        <th>Оригинал</th>
                        <th>Подсказка</th>
                        <th>✓</th>
                        <th>✗</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const total = item.stats.correct + item.stats.incorrect;
                        const acc = total > 0 ? Math.round((item.stats.correct / total) * 100) : null;
                        return (
                          <tr key={item.id}>
                            <td>
                              <span class={`type-chip type-${item.type}`}>
                                {TYPE_LABELS[item.type]}
                              </span>
                            </td>
                            <td class="td-text">{item.original}</td>
                            <td class="td-text td-muted">{item.translation}</td>
                            <td class="td-num td-correct">{item.stats.correct}</td>
                            <td class="td-num td-incorrect">{item.stats.incorrect}</td>
                            <td class="td-num">{acc !== null ? `${acc}%` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
