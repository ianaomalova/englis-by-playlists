import { useState, useRef, useEffect } from 'preact/hooks';
import type { Lesson, LessonItem } from '../types';

interface Props {
  lessons: Lesson[];
  onChange: (lessons: Lesson[]) => void;
}

type Mode = 'cards' | 'sentences';
type SessionState = 'setup' | 'active' | 'done';
type CheckResult = 'idle' | 'correct' | 'incorrect';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PracticeView({ lessons, onChange }: Props) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id ?? '');
  const [mode, setMode] = useState<Mode>('cards');
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [queue, setQueue] = useState<LessonItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResult>('idle');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionIncorrect, setSessionIncorrect] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);
  const cardItems = selectedLesson?.items.filter(i => i.type !== 'sentence') ?? [];
  const sentenceItems = selectedLesson?.items.filter(i => i.type === 'sentence') ?? [];
  // Only sentences that have a translation can be practiced
  const practicableSentences = sentenceItems.filter(i => i.translation);
  const missingTranslation = sentenceItems.length - practicableSentences.length;

  useEffect(() => {
    if (sessionState === 'active' && mode === 'sentences' && checkResult === 'idle') {
      inputRef.current?.focus();
    }
  }, [currentIdx, sessionState, checkResult, mode]);

  function startSession() {
    if (!selectedLesson) return;
    const items = mode === 'cards' ? cardItems : practicableSentences;
    if (items.length === 0) return;
    setQueue(shuffle(items));
    setCurrentIdx(0);
    setRevealed(false);
    setAnswer('');
    setCheckResult('idle');
    setSessionCorrect(0);
    setSessionIncorrect(0);
    setSessionState('active');
  }

  function updateItemStats(item: LessonItem, correct: boolean) {
    onChange(lessons.map(l =>
      l.id === selectedLessonId
        ? {
            ...l,
            items: l.items.map(i =>
              i.id === item.id
                ? { ...i, stats: { correct: i.stats.correct + (correct ? 1 : 0), incorrect: i.stats.incorrect + (correct ? 0 : 1) } }
                : i
            ),
          }
        : l
    ));
  }

  function advance() {
    const next = currentIdx + 1;
    if (next >= queue.length) {
      setSessionState('done');
      return;
    }
    setCurrentIdx(next);
    setRevealed(false);
    setAnswer('');
    setCheckResult('idle');
  }

  function markCard(correct: boolean) {
    updateItemStats(queue[currentIdx], correct);
    if (correct) setSessionCorrect(s => s + 1);
    else setSessionIncorrect(s => s + 1);
    advance();
  }

  function checkSentence() {
    const item = queue[currentIdx];
    const correct = answer.trim().toLowerCase() === item.original.trim().toLowerCase();
    updateItemStats(item, correct);
    if (correct) setSessionCorrect(s => s + 1);
    else setSessionIncorrect(s => s + 1);
    setCheckResult(correct ? 'correct' : 'incorrect');
  }

  const current = queue[currentIdx];
  const total = queue.length;
  const progress = total > 0 ? Math.round(((currentIdx) / total) * 100) : 0;

  // Setup screen
  if (sessionState === 'setup') {
    return (
      <div class="practice-setup">
        <h2>Практика</h2>
        {lessons.length === 0 ? (
          <div class="setup-empty">
            <p>Нет уроков. Добавьте уроки и слова в разделе <b>База данных</b>.</p>
          </div>
        ) : (
          <div class="setup-card">
            <div class="form-row-inline">
              <label class="form-label">Урок</label>
              <select
                class="select select-grow"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId((e.currentTarget as HTMLSelectElement).value)}
              >
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.items.length})</option>
                ))}
              </select>
            </div>

            <div class="mode-selector">
              <button
                class={`mode-btn ${mode === 'cards' ? 'active' : ''}`}
                onClick={() => setMode('cards')}
              >
                <span class="mode-icon">🃏</span>
                <span class="mode-label">Слова и фразы</span>
                <span class="mode-count">{cardItems.length} элем.</span>
              </button>
              <button
                class={`mode-btn ${mode === 'sentences' ? 'active' : ''}`}
                onClick={() => setMode('sentences')}
              >
                <span class="mode-icon">✍️</span>
                <span class="mode-label">Предложения</span>
                <span class="mode-count">
                  {practicableSentences.length} элем.
                  {missingTranslation > 0 && <span class="mode-count-warn"> · {missingTranslation} без пер.</span>}
                </span>
              </button>
            </div>

            {mode === 'sentences' && missingTranslation > 0 && (
              <div class="setup-warning">
                ⚠ {missingTranslation} предл. без перевода — добавьте в «База данных» нажав на строку
              </div>
            )}

            <button
              class="btn btn-primary btn-large"
              onClick={startSession}
              disabled={mode === 'cards' ? cardItems.length === 0 : practicableSentences.length === 0}
            >
              Начать практику
            </button>
            {mode === 'cards' && cardItems.length === 0 && (
              <p class="hint-text">Нет слов и фраз в этом уроке</p>
            )}
            {mode === 'sentences' && practicableSentences.length === 0 && (
              <p class="hint-text">
                {sentenceItems.length > 0 ? 'У всех предложений нет перевода — добавьте в «База данных»' : 'Нет предложений в этом уроке'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Done screen
  if (sessionState === 'done') {
    const total = sessionCorrect + sessionIncorrect;
    const acc = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    return (
      <div class="practice-done">
        <div class="done-card">
          <div class="done-icon">🎉</div>
          <h2>Сессия завершена!</h2>
          <div class="done-stats">
            <div class="done-stat correct">
              <span class="done-num">{sessionCorrect}</span>
              <span class="done-label">Правильно</span>
            </div>
            <div class="done-stat incorrect">
              <span class="done-num">{sessionIncorrect}</span>
              <span class="done-label">Неправильно</span>
            </div>
            <div class="done-stat accent">
              <span class="done-num">{acc}%</span>
              <span class="done-label">Точность</span>
            </div>
          </div>
          <div class="done-actions">
            <button class="btn btn-secondary" onClick={startSession}>
              Ещё раз
            </button>
            <button class="btn btn-primary" onClick={() => setSessionState('setup')}>
              Выбрать урок
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div class="practice-active">
      <div class="practice-header">
        <button class="btn btn-ghost" onClick={() => setSessionState('setup')}>
          ← Назад
        </button>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span class="progress-text">{currentIdx + 1} / {total}</span>
      </div>

      {mode === 'cards' && current && (
        <div class="card-practice">
          <div class="card-lesson-badge">{selectedLesson?.name}</div>

          <div
            class={`flashcard ${revealed ? 'revealed' : ''}`}
            onClick={() => !revealed && setRevealed(true)}
          >
            <div class="card-side card-front">
              <span class="card-side-label">Подсказка</span>
              <span class="card-text">{current.translation}</span>
              {!revealed && <span class="card-click-hint">нажмите для ответа</span>}
            </div>
            <div class="card-side card-back">
              <span class="card-side-label">Ответ</span>
              <span class="card-text">{current.original}</span>
              <span class={`type-chip type-${current.type}`}>
                {current.type === 'word' ? 'слово' : 'фраза'}
              </span>
            </div>
          </div>

          {!revealed ? (
            <button class="btn btn-secondary btn-large" onClick={() => setRevealed(true)}>
              Показать ответ
            </button>
          ) : (
            <div class="card-verdict">
              <p class="verdict-question">Вы знали?</p>
              <div class="verdict-btns">
                <button class="btn btn-incorrect" onClick={() => markCard(false)}>
                  ✗ Не знал
                </button>
                <button class="btn btn-correct" onClick={() => markCard(true)}>
                  ✓ Знал!
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'sentences' && current && (
        <div class="sentence-practice">
          <div class="card-lesson-badge">{selectedLesson?.name}</div>

          <div class="prompt-card">
            <span class="prompt-label">Переведите на язык оригинала:</span>
            <span class="prompt-text">{current.translation}</span>
          </div>

          <div class="answer-block">
            <label class="answer-label">Ваш ответ:</label>
            <input
              ref={inputRef}
              class={`input input-answer ${checkResult !== 'idle' ? checkResult : ''}`}
              type="text"
              placeholder="Введите ответ..."
              value={answer}
              onInput={(e) => {
                setAnswer((e.currentTarget as HTMLInputElement).value);
                if (checkResult !== 'idle') setCheckResult('idle');
              }}
              onKeyDown={(e) => e.key === 'Enter' && checkResult === 'idle' && answer.trim() && checkSentence()}
              disabled={checkResult !== 'idle'}
            />
          </div>

          {checkResult === 'idle' && (
            <button
              class="btn btn-primary btn-large"
              onClick={checkSentence}
              disabled={!answer.trim()}
            >
              Проверить
            </button>
          )}

          {checkResult !== 'idle' && (
            <div class={`result-banner result-${checkResult}`}>
              {checkResult === 'correct' ? (
                <span class="result-icon-text">✓ Правильно!</span>
              ) : (
                <div class="result-incorrect">
                  <span class="result-icon-text">✗ Неправильно</span>
                  <div class="correct-answer-box">
                    <span class="correct-answer-label">Правильный ответ:</span>
                    <span class="correct-answer-text">{current.original}</span>
                  </div>
                </div>
              )}
              <button class="btn btn-primary" onClick={advance}>
                {currentIdx + 1 < queue.length ? 'Следующее →' : 'Завершить'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
