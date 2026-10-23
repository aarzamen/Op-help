import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconPlans } from './icons';
import { operations, operationStorageError } from '../lib/storage';
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from '../lib/operationBackup';
import { fileSlug } from '../lib/dtg';
import './operations.css';

function currentPlan() {
  const id = operations.activeId();
  const meta = operations.list().find((plan) => plan.id === id);
  if (!meta) throw new Error('This plan was removed in another tab. Reload to continue.');
  // A reset invalidates stale documents even when the operation ID is unchanged.
  operations.scopedKey('notes-tools');
  return meta;
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not update saved plans.';

function PlansDialog({ onClose }: { onClose: () => void }) {
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(operationStorageError());
  const [status, setStatus] = useState('');
  const [plans, setPlans] = useState(() => {
    try {
      return operations.list();
    } catch {
      return [];
    }
  });
  const [current] = useState(() => {
    try {
      return currentPlan();
    } catch {
      return null;
    }
  });
  const [rename, setRename] = useState(current?.name ?? '');
  const [newName, setNewName] = useState('');
  const [wipeConfirmation, setWipeConfirmation] = useState('');

  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app');
    const wasInert = app?.inert ?? false;
    const overflow = document.body.style.overflow;
    const previous = document.activeElement as HTMLElement | null;
    if (app) app.inert = true;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose();
      if (event.key !== 'Tab') return;
      const controls = [
        ...(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled)'
        ) ?? []),
      ].filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', keys);
    return () => {
      if (app) app.inert = wasInert;
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', keys);
      previous?.focus();
    };
  }, [onClose]);

  const run = async (action: () => void | Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
      setPlans(operations.list());
    } catch (error) {
      setError(message(error));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const reload = () => window.location.reload();
  const download = (all: boolean) => {
    const text = serializeBackup(operations, all);
    const file = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OPORD_${fileSlug(all ? 'all_plans' : current!.name)}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Backup file prepared.');
  };
  const restore = async (file: File | undefined) => {
    if (!file) return;
    await run(async () => {
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error('That backup is too large (maximum 25 MB).');
      const backup = parseBackup(await file.text());
      if (
        !window.confirm(
          `Import ${backup.operations.length} plan(s) as new copies and restore display preferences? Existing plans are kept.`
        )
      )
        return;
      await operations.importSnapshots(backup.operations, backup.preferences, backup.activeId);
      reload();
    });
  };

  return createPortal(
    <div
      className="plans-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busyRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="plans-dialog theme-ref"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-busy={busy}
      >
        <div className="plans-heading">
          <h2 id={headingId}>PLANS & BACKUPS</h2>
          <button ref={closeRef} type="button" className="chip" disabled={busy} onClick={onClose}>
            DONE
          </button>
        </div>
        <p className="field-hint">
          Notes and maps stay in this browser. Use one editing tab per plan.
        </p>
        {error && (
          <div className="plans-error" role="alert">
            {error}
          </div>
        )}
        <div role="status" aria-live="polite" className="field-hint">
          {status}
        </div>
        {!current ? (
          <button className="chip" type="button" onClick={reload}>
            RELOAD SAVED PLANS
          </button>
        ) : (
          <>
            <section className="plans-section">
              <label className="field-label" htmlFor={`${headingId}-active`}>
                Active plan
              </label>
              <select
                id={`${headingId}-active`}
                className="field-input"
                value={current.id}
                disabled={busy}
                onChange={(event) => {
                  const id = event.target.value;
                  void run(async () => {
                    await operations.select(id);
                    reload();
                  });
                }}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <form
                className="plans-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await operations.rename(current.id, rename);
                    setStatus('Plan renamed.');
                  });
                }}
              >
                <label className="field">
                  {' '}
                  <span className="field-label">Plan name</span>
                  <input
                    className="field-input"
                    value={rename}
                    maxLength={80}
                    required
                    disabled={busy}
                    onChange={(event) => setRename(event.target.value)}
                  />
                </label>
                <button type="submit" className="chip" disabled={busy}>
                  RENAME
                </button>
              </form>
              <form
                className="plans-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await operations.create(newName);
                    reload();
                  });
                }}
              >
                <label className="field">
                  {' '}
                  <span className="field-label">New plan name</span>
                  <input
                    className="field-input"
                    value={newName}
                    maxLength={80}
                    required
                    disabled={busy}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </label>
                <button type="submit" className="chip chip-solid" disabled={busy}>
                  CREATE PLAN
                </button>
              </form>
            </section>
            <section className="plans-section">
              <h3>BACKUP / RESTORE</h3>
              <p className="field-hint">
                A JSON backup includes notes, checklists, order details, CASEVAC plans and map
                images. Restore adds copies. Backups are unencrypted; keep them private.
              </p>
              <div className="chip-row">
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() => void run(() => download(false))}
                >
                  BACKUP THIS PLAN
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() => void run(() => download(true))}
                >
                  BACKUP ALL PLANS
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  RESTORE BACKUP
                </button>
              </div>
            </section>
            <section className="plans-section">
              <h3>RESET / DELETE</h3>
              <p className="field-hint">
                Download a backup before removing work. Default operation can be reset and is kept
                for compatibility.
              </p>
              <div className="chip-row">
                <button
                  type="button"
                  className="chip plans-destructive"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Reset “${current.name}”? Its notes and maps will be removed, and the default examples will return. Other plans are kept.`
                      )
                    )
                      void run(async () => {
                        await operations.reset(current.id);
                        reload();
                      });
                  }}
                >
                  RESET THIS PLAN
                </button>
                <button
                  type="button"
                  className="chip plans-destructive"
                  disabled={busy || current.id === 'default'}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete “${current.name}” and all its notes and maps? Other plans are kept.`
                      )
                    )
                      void run(async () => {
                        await operations.remove(current.id);
                        reload();
                      });
                  }}
                >
                  DELETE THIS PLAN
                </button>
              </div>
            </section>
          </>
        )}
        <section className="plans-section">
          <h3>LOCAL DATA & PRIVACY</h3>
          <p className="field-hint">
            Saved plans and JSON backups are unencrypted. Anyone with access to this browser profile
            or a backup file can read them. Use only information you are authorized to store here.
          </p>
          <p className="field-hint">
            Wipe removes every plan, note and map saved in this browser and resets display
            preferences. Downloaded backups, PDFs and images remain on your device.
          </p>
          <div className="plans-row">
            <label className="field">
              <span className="field-label">Type WIPE to confirm</span>
              <input
                className="field-input"
                value={wipeConfirmation}
                onChange={(event) => setWipeConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="chip plans-destructive"
              disabled={busy || wipeConfirmation !== 'WIPE'}
              onClick={() => {
                if (wipeConfirmation !== 'WIPE') return;
                void run(async () => {
                  await operations.wipe();
                  reload();
                });
              }}
            >
              WIPE SAVED DATA
            </button>
          </div>
        </section>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void restore(file);
          }}
        />
      </div>
    </div>,
    document.body
  );
}

export default function OperationManager() {
  const [open, setOpen] = useState(false);
  const [, refresh] = useState(0);
  let name: string;
  try {
    name = currentPlan().name;
  } catch {
    name = 'Saved plan needs attention';
  }
  useEffect(() => {
    const changed = () => refresh((value) => value + 1);
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    refresh((value) => value + 1);
  }, []);
  return (
    <>
      <div className="plan-switcher">
        <button
          type="button"
          className="plan-trigger"
          aria-label={`Manage plans: ${name}`}
          onClick={() => setOpen(true)}
        >
          <IconPlans size={16} />
          <span>{name}</span>
          <span className="plan-trigger-action">PLANS</span>
        </button>
      </div>
      {open && <PlansDialog onClose={close} />}
    </>
  );
}
