import { useState } from 'preact/hooks';
import type { Lesson, LessonItem, ItemType } from '../types';
import { genId } from '../store';
import { ImportModal } from './ImportModal';

interface Props {
  lessons: Lesson[];
  onChange: (lessons: Lesson[]) => void;
}

const TYPE_LABELS: Record<ItemType, string> = {
  word: 'Слово / Фраза',
  sentence: 'Предложение',
};

const TYPE_LABELS_PLURAL: Record<ItemType, string> = {
  word: 'Слова и фразы',
  sentence: 'Предложения',
};

interface EditState {
  id: string;
  original: string;
  translation: string;
}

export function DatabaseView({ lessons, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(lessons[0]?.id ?? null);
  const [newLessonName, setNewLessonName] = useState('');
  const [addType, setAddType] = useState<ItemType>('word');
  const [addOriginal, setAddOriginal] = useState('');
  const [addTranslation, setAddTranslation] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editItem, setEditItem] = useState<EditState | null>(null);
  const [showImport, setShowImport] = useState(false);

  const selected = lessons.find(l => l.id === selectedId) ?? null;

  function addLesson() {
    const name = newLessonName.trim();
    if (!name) return;
    const lesson: Lesson = { id: genId(), name, createdAt: Date.now(), items: [] };
    onChange([...lessons, lesson]);
    setSelectedId(lesson.id);
    setNewLessonName('');
  }

  function deleteLesson(id: string) {
    const next = lessons.filter(l => l.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  function renameLesson(id: string, name: string) {
    if (!name.trim()) return;
    onChange(lessons.map(l => l.id === id ? { ...l, name: name.trim() } : l));
  }

  function addItem() {
    if (!selected || !addOriginal.trim() || !addTranslation.trim()) return;
    const item: LessonItem = {
      id: genId(), type: addType,
      original: addOriginal.trim(), translation: addTranslation.trim(),
      stats: { correct: 0, incorrect: 0 },
    };
    onChange(lessons.map(l => l.id === selected.id ? { ...l, items: [...l.items, item] } : l));
    setAddOriginal('');
    setAddTranslation('');
  }

  function saveEditItem() {
    if (!editItem || !selected) return;
    onChange(lessons.map(l =>
      l.id === selected.id
        ? { ...l, items: l.items.map(i => i.id === editItem.id ? { ...i, original: editItem.original.trim(), translation: editItem.translation.trim() } : i) }
        : l
    ));
    setEditItem(null);
  }

  function deleteItem(itemId: string) {
    if (!selected) return;
    onChange(lessons.map(l =>
      l.id === selected.id ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l
    ));
  }

  function resetStats(itemId: string) {
    if (!selected) return;
    onChange(lessons.map(l =>
      l.id === selected.id
        ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, stats: { correct: 0, incorrect: 0 } } : i) }
        : l
    ));
  }

  function handleImport(imported: Lesson[]) {
    onChange([...lessons, ...imported]);
    setSelectedId(imported[0]?.id ?? selectedId);
  }

  const itemsByType = (type: ItemType) => selected?.items.filter(i => i.type === type) ?? [];

  return (
    <>
      {showImport && (
        <ImportModal
          onImport={(imported) => { handleImport(imported); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}
      <div class="db-layout">
        <aside class="db-sidebar">
          <div class="sidebar-header">
            <span class="sidebar-title">Уроки</span>
          </div>
          <div class="lesson-list">
            {lessons.length === 0 && <p class="sidebar-empty">Нет уроков</p>}
            {lessons.map(l => (
              <div
                key={l.id}
                class={`lesson-item ${l.id === selectedId ? 'selected' : ''}`}
                onClick={() => setSelectedId(l.id)}
              >
                <span class="lesson-name">{l.name}</span>
                <span class="lesson-count">{l.items.length}</span>
              </div>
            ))}
          </div>
          <div class="add-lesson">
            <input
              type="text" class="input" placeholder="Название урока..."
              value={newLessonName}
              onInput={(e) => setNewLessonName((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && addLesson()}
            />
            <button class="btn btn-primary btn-full" onClick={addLesson} disabled={!newLessonName.trim()}>
              + Новый урок
            </button>
            <button class="btn btn-ghost btn-full" onClick={() => setShowImport(true)}>
              ↑ Импорт текста
            </button>
          </div>
        </aside>

        <div class="db-content">
          {!selected ? (
            <div class="empty-state">
              <div class="empty-icon">📚</div>
              <p>Выберите или создайте урок</p>
            </div>
          ) : (
            <>
              <div class="lesson-header">
                {editingName ? (
                  <form class="rename-form" onSubmit={(e) => { e.preventDefault(); renameLesson(selected.id, editNameValue); setEditingName(false); }}>
                    <input
                      class="input rename-input" value={editNameValue} autoFocus
                      onInput={(e) => setEditNameValue((e.currentTarget as HTMLInputElement).value)}
                      onBlur={() => { renameLesson(selected.id, editNameValue); setEditingName(false); }}
                    />
                  </form>
                ) : (
                  <h2 class="lesson-title" onClick={() => { setEditNameValue(selected.name); setEditingName(true); }} title="Нажмите чтобы переименовать">
                    {selected.name}<span class="edit-hint"> ✏</span>
                  </h2>
                )}
                <button class="btn btn-danger-ghost" onClick={() => deleteLesson(selected.id)}>Удалить урок</button>
              </div>

              {(['word', 'sentence'] as ItemType[]).map(type => {
                const items = itemsByType(type);
                const missingTranslation = type === 'sentence' ? items.filter(i => !i.translation).length : 0;
                return (
                  <div key={type} class="item-section">
                    <div class="section-header">
                      <span class="section-title">{TYPE_LABELS_PLURAL[type]}</span>
                      <span class="section-count">{items.length}</span>
                      {missingTranslation > 0 && (
                        <span class="missing-badge" title="Нет перевода — нажмите на строку чтобы добавить">
                          ⚠ {missingTranslation} без перевода
                        </span>
                      )}
                    </div>
                    {items.length === 0 ? (
                      <p class="no-items">Пусто</p>
                    ) : (
                      <div class="items-list">
                        {items.map(item => {
                          const isEditing = editItem?.id === item.id;
                          const noTranslation = !item.translation;

                          if (isEditing) {
                            return (
                              <div key={item.id} class="item-row item-row-editing">
                                <span class={`type-dot type-${item.type}`} />
                                <input
                                  class="input item-edit-input"
                                  value={editItem!.original}
                                  onInput={(e) => setEditItem({ ...editItem!, original: (e.currentTarget as HTMLInputElement).value })}
                                  onKeyDown={(e) => e.key === 'Escape' && setEditItem(null)}
                                  placeholder="Оригинал..."
                                  autoFocus
                                />
                                <span class="item-sep">→</span>
                                <input
                                  class={`input item-edit-input ${!editItem!.translation ? 'input-warn' : ''}`}
                                  value={editItem!.translation}
                                  onInput={(e) => setEditItem({ ...editItem!, translation: (e.currentTarget as HTMLInputElement).value })}
                                  onKeyDown={(e) => e.key === 'Enter' ? saveEditItem() : e.key === 'Escape' && setEditItem(null)}
                                  placeholder="Перевод / подсказка..."
                                />
                                <button class="btn btn-primary btn-sm" onClick={saveEditItem}>✓</button>
                                <button class="btn-icon" onClick={() => setEditItem(null)}>×</button>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={item.id}
                              class={`item-row ${noTranslation ? 'item-row-warn' : ''}`}
                              onClick={() => setEditItem({ id: item.id, original: item.original, translation: item.translation })}
                              title="Нажмите чтобы редактировать"
                            >
                              <span class={`type-dot type-${item.type}`} />
                              <span class="item-original">{item.original}</span>
                              <span class="item-sep">→</span>
                              <span class={`item-translation ${noTranslation ? 'item-translation-empty' : ''}`}>
                                {item.translation || 'нет перевода'}
                              </span>
                              <span class="item-stats-mini">
                                <span class="mini-correct">✓{item.stats.correct}</span>
                                <span class="mini-incorrect">✗{item.stats.incorrect}</span>
                              </span>
                              <button class="btn-icon" title="Сбросить статистику" onClick={(e) => { e.stopPropagation(); resetStats(item.id); }}>↺</button>
                              <button class="btn-icon btn-icon-delete" title="Удалить" onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}>×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div class="add-item-form">
                <h4 class="form-title">Добавить элемент</h4>
                <div class="form-grid">
                  <label class="form-label">Тип</label>
                  <select class="select" value={addType} onChange={(e) => setAddType((e.currentTarget as HTMLSelectElement).value as ItemType)}>
                    <option value="word">Слово / Фраза</option>
                    <option value="sentence">Предложение</option>
                  </select>
                  <label class="form-label">Оригинал</label>
                  <input
                    class="input" type="text"
                    placeholder={addType === 'sentence' ? 'Предложение для изучения...' : 'Слово или фраза...'}
                    value={addOriginal}
                    onInput={(e) => setAddOriginal((e.currentTarget as HTMLInputElement).value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                  />
                  <label class="form-label">Подсказка</label>
                  <input
                    class="input" type="text" placeholder="Перевод / подсказка..."
                    value={addTranslation}
                    onInput={(e) => setAddTranslation((e.currentTarget as HTMLInputElement).value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  />
                </div>
                <button class="btn btn-primary" onClick={addItem} disabled={!addOriginal.trim() || !addTranslation.trim()}>
                  Добавить {TYPE_LABELS[addType].toLowerCase()}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
