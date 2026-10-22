import { useId, useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useLocalStorage } from '../lib/storage';
import { RUBRIC, RUBRIC_TOTAL, sectionPts } from '../content/rubric';
import { GLOSSARY } from '../content/glossary';
import { TACTICAL_TASKS, PURPOSE_VERBS } from '../content/tacticalTasks';

export interface BriefState {
  done: Record<string, boolean>;
  owner: Record<string, string>;
}

const BRIEFER_HINT = {
  officer: 'officer briefer',
  enlisted: 'enlisted briefer',
  everyone: 'everyone',
} as const;

/**
 * The graded checklist as a rehearsal tool: assign each section to a briefer, tick items
 * off as the group rehearses, watch the points covered. Persisted as `brief-rubric`.
 */
export const RubricChecklist = () => {
  const [s, setS] = useLocalStorage<BriefState>('brief-rubric', { done: {}, owner: {} });
  const covered = RUBRIC.flatMap((sec) => sec.items).reduce(
    (n, i) => n + (s.done[i.id] ? i.pts : 0),
    0
  );

  return (
    <div className="rubric">
      <div className="rubric-total">
        <div className="rubric-bar" aria-hidden="true">
          <div className="rubric-fill" style={{ width: `${(covered / RUBRIC_TOTAL) * 100}%` }} />
        </div>
        <div className="rubric-score">
          <strong>{covered}</strong> / {RUBRIC_TOTAL} PTS REHEARSED
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Clear checkmarks"
          title="Clear checkmarks"
          onClick={() =>
            window.confirm('Clear all checkmarks? Owners are kept.') && setS({ ...s, done: {} })
          }
        >
          <RotateCcw size={14} />
        </button>
      </div>
      {RUBRIC.map((sec) => {
        const got = sec.items.reduce((n, i) => n + (s.done[i.id] ? i.pts : 0), 0);
        return (
          <div key={sec.id} className="rubric-sec">
            <div className="rubric-sec-head">
              <span className="rubric-sec-title">{sec.title}</span>
              <span className="pts">
                {got}/{sectionPts(sec)} PTS
              </span>
            </div>
            <input
              className="field-input rubric-owner"
              aria-label={`${sec.title} briefer`}
              placeholder={`Who briefs it? (usually the ${BRIEFER_HINT[sec.briefer]})`}
              value={s.owner[sec.id] ?? ''}
              onChange={(e) => setS({ ...s, owner: { ...s.owner, [sec.id]: e.target.value } })}
            />
            {sec.items.map((it) => (
              <label key={it.id} className={`rubric-item ${s.done[it.id] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!s.done[it.id]}
                  onChange={(e) => setS({ ...s, done: { ...s.done, [it.id]: e.target.checked } })}
                />
                <span className="rubric-text">
                  <strong>{it.label}</strong>
                  {it.prompt && <span className="rubric-prompt"> — {it.prompt}</span>}
                </span>
                <span className="pts">{it.pts}</span>
              </label>
            ))}
          </div>
        );
      })}
      <div className="field-hint">
        Structure from the EULC “Issue a Combat Order” evaluation checklist; point values from a Feb
        2026 reconstruction — confirm against your class's sheet. “You cannot fail if you hit the
        required wickets and your order makes general sense.”
      </div>
    </div>
  );
};

export const Glossary = () => {
  const [q, setQ] = useState('');
  const id = useId();
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter((g) =>
      `${g.term} ${g.expansion ?? ''} ${g.def}`.toLowerCase().includes(needle)
    );
  }, [q]);

  return (
    <div className="glossary">
      <label htmlFor={id} className="search">
        <Search size={14} aria-hidden="true" />
        <input
          id={id}
          type="search"
          placeholder={`Search ${GLOSSARY.length} terms — e.g. “IOT”, “CCP”, “parts”`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <dl>
        {hits.map((g) => (
          <div key={g.term} className="gloss-row">
            <dt>
              {g.term}
              {g.expansion && <span className="gloss-exp"> · {g.expansion}</span>}
            </dt>
            <dd>{g.def}</dd>
          </div>
        ))}
      </dl>
      {hits.length === 0 && <div className="field-hint">No match — try a shorter search.</div>}
    </div>
  );
};

export const TaskVerbList = () => {
  const groups = Array.from(new Set(TACTICAL_TASKS.map((t) => t.group)));
  return (
    <div>
      {groups.map((g) => (
        <div key={g} className="verb-group">
          <div className="verb-group-title">{g.toUpperCase()}</div>
          {TACTICAL_TASKS.filter((t) => t.group === g).map((t) => (
            <div key={t.verb} className="verb-row">
              <span className="verb">{t.verb}</span>
              <span className="verb-gist">{t.gist}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="verb-group">
        <div className="verb-group-title">PURPOSE VERBS — THE “IOT …”</div>
        <div className="verb-gist">{PURPOSE_VERBS.join(' · ')}</div>
      </div>
      <div className="field-hint">
        Plain-English gists of FM 3-90-1 / MCRP 1-10.2 definitions. Check the manual for exact
        wording.
      </div>
    </div>
  );
};
