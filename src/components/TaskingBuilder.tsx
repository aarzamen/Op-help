import { useId } from 'react';
import { ClipboardCopy, Plus } from 'lucide-react';
import { appendNote, copyText, notify, useLocalStorage } from '../lib/storage';
import { PURPOSE_VERBS, TACTICAL_TASKS } from '../content/tacticalTasks';
import { FieldRow, SelectField, TextField } from './form';

interface Draft {
  unit: string;
  role: 'ME' | 'SE1' | 'SE2' | 'SE3' | 'SE4' | 'none';
  trigger: string;
  task: string;
  where: string;
  purpose: string;
  priority: 'MHP' | 'THP' | '';
}

const ROLE_TEXT: Record<Draft['role'], string> = {
  ME: 'You are the main effort.',
  SE1: 'You are supporting effort one.',
  SE2: 'You are supporting effort two.',
  SE3: 'You are supporting effort three.',
  SE4: 'You are supporting effort four.',
  none: '',
};

const START: Draft = {
  unit: '1st Platoon',
  role: 'ME',
  trigger: 'Upon arrival at MLR Obj 1',
  task: 'establish',
  where: 'an EAB IVO MLR Obj 1',
  purpose: 'support continuous airfield operations',
  priority: 'MHP',
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function composeTasking(d: Draft): string {
  const parts = [
    `${d.unit.trim() || '[Unit]'}.`,
    ROLE_TEXT[d.role],
    `${cap(d.trigger.trim()) || '[Upon …]'}, ${d.task.trim() || '[task]'} ${d.where.trim() || '[where]'} IOT ${d.purpose.trim() || '[purpose]'}.`,
    d.priority ? `${d.priority}.` : '',
  ];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ');
}

/**
 * Builds one tasking statement in the course format — "[Unit]. You are the [ME/SE]. Upon
 * [trigger], [task] [where] IOT [purpose]. [MHP/THP]." — and appends it to ¶3.c Tasks.
 */
const TaskingBuilder = () => {
  const [d, setD] = useLocalStorage<Draft>('tasking-builder', START);
  const listId = useId();
  const purposeId = useId();
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const match = TACTICAL_TASKS.find((t) => t.verb === d.task.trim().toLowerCase());
  const sentence = composeTasking(d);
  const isBuild = /^build\b/i.test(d.task.trim());

  return (
    <div className="builder">
      <div className="builder-title">TASKING STATEMENT BUILDER</div>
      <FieldRow>
        <TextField label="Who — unit" value={d.unit} onChange={(v) => set({ unit: v })} />
        <SelectField<Draft['role']>
          label="Role this part"
          value={d.role}
          onChange={(v) => set({ role: v })}
          options={[
            { value: 'ME', label: 'Main effort' },
            { value: 'SE1', label: 'Supporting effort 1' },
            { value: 'SE2', label: 'Supporting effort 2' },
            { value: 'SE3', label: 'Supporting effort 3' },
            { value: 'SE4', label: 'Supporting effort 4' },
            { value: 'none', label: '(not stated)' },
          ]}
        />
      </FieldRow>
      <TextField
        label="When — trigger / conditions set"
        value={d.trigger}
        onChange={(v) => set({ trigger: v })}
        placeholder="Upon CAAT 2 linkup at BLS Black Beach / NLT 0600 / On order"
      />
      <FieldRow>
        <div className="field">
          <label className="field-label" htmlFor={`${listId}-in`}>
            What — tactical task
          </label>
          <input
            id={`${listId}-in`}
            className="field-input"
            list={listId}
            value={d.task}
            onChange={(e) => set({ task: e.target.value })}
            placeholder="occupy / secure / establish"
          />
          <datalist id={listId}>
            {TACTICAL_TASKS.map((t) => (
              <option key={t.verb} value={t.verb} />
            ))}
          </datalist>
        </div>
        <TextField
          label="Where — object / grid"
          value={d.where}
          onChange={(v) => set({ where: v })}
          placeholder="MLR Obj 1 (10S FE 624 817)"
        />
      </FieldRow>
      <FieldRow>
        <div className="field">
          <label className="field-label" htmlFor={`${purposeId}-in`}>
            Why — purpose (IOT …)
          </label>
          <input
            id={`${purposeId}-in`}
            className="field-input"
            list={purposeId}
            value={d.purpose}
            onChange={(e) => set({ purpose: e.target.value })}
            placeholder="allow 2d Plt to occupy the western sector"
          />
          <datalist id={purposeId}>
            {PURPOSE_VERBS.map((v) => (
              <option key={v} value={`${v} `} />
            ))}
          </datalist>
        </div>
        <SelectField<Draft['priority']>
          label="Priority"
          value={d.priority}
          onChange={(v) => set({ priority: v })}
          options={[
            { value: 'MHP', label: 'MHP — mission has priority' },
            { value: 'THP', label: 'THP — time has priority' },
            { value: '', label: '(none)' },
          ]}
        />
      </FieldRow>
      {match && (
        <div className="field-hint field-hint-ok">
          <strong>{match.verb}</strong> — {match.gist}
        </div>
      )}
      {isBuild && (
        <div className="field-hint field-hint-bad">
          “Build” is not a tactical task — use “establish” (instructor guidance).
        </div>
      )}
      <div className="builder-out">{sentence}</div>
      <div className="chip-row">
        <button
          type="button"
          className="chip"
          onClick={() => copyText(sentence, 'TASKING STATEMENT COPIED')}
        >
          <ClipboardCopy size={11} /> COPY
        </button>
        <button
          type="button"
          className="chip chip-solid"
          onClick={() => {
            if (appendNote('osmeac-e-tk', sentence)) notify('Added to ¶3.c Tasks notes');
          }}
        >
          <Plus size={11} /> ADD TO TASKS
        </button>
      </div>
    </div>
  );
};

export default TaskingBuilder;
