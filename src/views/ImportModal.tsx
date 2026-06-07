import { useState, useMemo } from 'preact/hooks';
import type { Lesson } from '../types';
import { parseText } from '../parser';

interface Props {
  onImport: (lessons: Lesson[]) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [imported, setImported] = useState(false);

  const { lessons, warnings } = useMemo(() => {
    if (!text.trim()) return { lessons: [], warnings: [] };
    return parseText(text);
  }, [text]);

  const totalWords = lessons.reduce((s, l) => s + l.items.filter(i => i.type === 'word').length, 0);
  const totalSentences = lessons.reduce((s, l) => s + l.items.filter(i => i.type === 'sentence').length, 0);

  function handleImport() {
    if (lessons.length === 0) return;
    onImport(lessons);
    setImported(true);
  }

  return (
    <div class="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal">
        <div class="modal-header">
          <h3>Импорт уроков</h3>
          <button class="btn-icon btn-icon-delete" onClick={onClose}>×</button>
        </div>

        <div class="modal-body">
          {imported ? (
            <div class="import-success">
              <div class="done-icon">✅</div>
              <p>Импортировано {lessons.length} уроков — {totalWords} слов, {totalSentences} предложений</p>
              <button class="btn btn-primary" onClick={onClose}>Готово</button>
            </div>
          ) : (
            <>
              <p class="import-hint">
                Формат: <code># Урок N</code> — заголовок, <code>слово - перевод</code> — слово/фраза,
                {' '}<code>1. Предложение</code> — нумерованные предложения.
              </p>

              <textarea
                class="import-textarea"
                placeholder="Вставьте текст уроков..."
                value={text}
                onInput={(e) => { setText((e.currentTarget as HTMLTextAreaElement).value); setImported(false); }}
                rows={14}
                autoFocus
              />

              {lessons.length > 0 && (
                <div class="import-preview">
                  <div class="preview-header">
                    <span class="preview-title">Предпросмотр</span>
                    <span class="preview-summary">
                      {lessons.length} уроков · {totalWords} слов · {totalSentences} предложений
                    </span>
                  </div>
                  <div class="preview-lessons">
                    {lessons.map((l, i) => {
                      const w = l.items.filter(i => i.type === 'word').length;
                      const s = l.items.filter(i => i.type === 'sentence').length;
                      return (
                        <div key={i} class="preview-lesson">
                          <span class="preview-lesson-name">{l.name}</span>
                          <span class="preview-counts">
                            {w > 0 && <span class="count-word">{w} сл.</span>}
                            {s > 0 && <span class="count-sent">{s} пр.</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {warnings.length > 0 && (
                    <div class="import-warnings">
                      {warnings.map((w, i) => <div key={i} class="warning-line">⚠ {w}</div>)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!imported && (
          <div class="modal-footer">
            <button class="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button
              class="btn btn-primary"
              onClick={handleImport}
              disabled={lessons.length === 0}
            >
              Импортировать {lessons.length > 0 ? `(${lessons.length} уроков)` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
