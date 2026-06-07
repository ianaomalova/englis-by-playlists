import { useState, useCallback, useEffect } from 'preact/hooks';
import type { Lesson, View } from './types';
import { loadData, saveData, migrateFromLocalStorage } from './store';
import { DatabaseView } from './views/DatabaseView';
import { VocabularyView } from './views/VocabularyView';
import { PracticeView } from './views/PracticeView';
import { StatsView } from './views/StatsView';
import './app.css';

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'database', label: 'База данных', icon: '📚' },
  { id: 'vocabulary', label: 'Словарь', icon: '📖' },
  { id: 'practice', label: 'Практика', icon: '🎯' },
  { id: 'statistics', label: 'Статистика', icon: '📊' },
];

export function App() {
  const [view, setView] = useState<View>('database');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrateFromLocalStorage()
      .then(() => loadData())
      .then((data) => {
        setLessons(data);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const updateLessons = useCallback((next: Lesson[]) => {
    setLessons(next);
    saveData(next);
  }, []);

  const totalItems = lessons.reduce((s, l) => s + l.items.length, 0);

  if (!ready) {
    return (
      <div class="app-loading">
        <span>Загрузка...</span>
      </div>
    );
  }

  return (
    <div class="app">
      <header class="header">
        <div class="header-inner">
          <div class="logo">
            <span class="logo-icon">🃏</span>
            <span class="logo-text">Bebris Cards</span>
          </div>
          <nav class="nav">
            {NAV_ITEMS.map(({ id, label, icon }) => (
              <button
                key={id}
                class={`nav-btn ${view === id ? 'active' : ''}`}
                onClick={() => setView(id)}
              >
                <span class="nav-icon">{icon}</span>
                <span class="nav-label">{label}</span>
              </button>
            ))}
          </nav>
          <div class="header-meta">
            <span class="meta-pill">{lessons.length} уроков · {totalItems} элем.</span>
          </div>
        </div>
      </header>

      <main class="main">
        {view === 'database' && (
          <DatabaseView lessons={lessons} onChange={updateLessons} />
        )}
        {view === 'vocabulary' && (
          <VocabularyView lessons={lessons} />
        )}
        {view === 'practice' && (
          <PracticeView lessons={lessons} onChange={updateLessons} />
        )}
        {view === 'statistics' && (
          <StatsView lessons={lessons} onChange={updateLessons} />
        )}
      </main>
    </div>
  );
}
