import { useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { readItem, safeSetItem } from '../lib/storage';
import { type ChecklistItem, newChecklistItemId, normalizeChecklistItems } from '../lib/checklists';

/**
 * Editable PCC/PCI list persisted as `{id, text}[]`. Edit/delete act on the stable id, not
 * the array index. Row actions are always visible (they used to be hover-only, which made
 * them unreachable on a phone).
 */
const EditableChecklist = ({
  storageKey,
  initialItems,
  title,
}: {
  storageKey: string;
  initialItems: string[];
  title: string;
}) => {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const raw = readItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const normalized = normalizeChecklistItems(parsed, initialItems);
      const migratedFromStrings =
        Array.isArray(parsed) && parsed.some((e) => typeof e === 'string');
      if (!raw || migratedFromStrings) {
        safeSetItem(storageKey, JSON.stringify(normalized));
      }
      return normalized;
    } catch (e) {
      console.error(e);
      return initialItems.map((text) => ({ id: newChecklistItemId(), text }));
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const persist = (next: ChecklistItem[]) => {
    setItems(next);
    safeSetItem(storageKey, JSON.stringify(next));
  };

  const saveEdit = (id: string) => {
    persist(items.map((item) => (item.id === id ? { ...item, text: editValue } : item)));
    setEditingId(null);
  };

  const handleAdd = () => {
    if (newItemValue.trim()) {
      persist([...items, { id: newChecklistItemId(), text: newItemValue.trim() }]);
      setNewItemValue('');
      setIsAdding(false);
    }
  };

  return (
    <div className="checklist">
      <div className="checklist-title">{title}</div>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="checklist-row">
            <span className="checklist-dot" aria-hidden="true" />
            <div className="checklist-body">
              {editingId === item.id ? (
                <div className="checklist-edit">
                  <textarea
                    className="field-input"
                    aria-label="Edit checklist item"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <div className="checklist-edit-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel edit"
                    >
                      <X size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-ok"
                      onClick={() => saveEdit(item.id)}
                      aria-label="Save item"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="checklist-line">
                  <span>{item.text}</span>
                  <span className="checklist-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditValue(item.text);
                      }}
                      aria-label={`Edit: ${item.text}`}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => persist(items.filter((i) => i.id !== item.id))}
                      aria-label={`Delete: ${item.text}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {isAdding ? (
        <div className="checklist-edit">
          <textarea
            className="field-input"
            aria-label="New checklist item"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            placeholder="New item…"
          />
          <div className="checklist-edit-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsAdding(false)}
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-ok"
              onClick={handleAdd}
              aria-label="Add item"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="chip chip-ghost">
          <Plus size={11} /> ADD ITEM
        </button>
      )}
    </div>
  );
};

export default EditableChecklist;
