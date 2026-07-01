import React, { useState, useEffect, useRef } from 'react';
import { Share2, Download, Mic, MicOff, Moon, Compass, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as mgrs from 'mgrs';
import geomagnetism from 'geomagnetism';
import MapSymbolsSection from './MapSymbols';

// --- Toast / storage helpers ---

type ToastType = 'success' | 'error';

/** Fire a transient toast from anywhere in the tree (App renders it). */
function notify(msg: string, type: ToastType = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type } }));
}

/** localStorage.setItem that never throws mid-keystroke (e.g. QuotaExceededError). */
function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error('localStorage write failed', e);
    notify('Storage full — changes may not be saved', 'error');
    return false;
  }
}

/**
 * Single source of truth for every PCC/PCI checklist's storage key. Referenced both by
 * the CHECKLISTS export registry below and by the storageKey prop on each
 * <EditableChecklist> in the TOOLS tab JSX, so a rename can't silently desync the two
 * (it becomes a compile error instead of every checklist exporting "[No items]").
 */
const CHECKLIST_KEYS = {
  convoyGear: 'pcc-convoy-gear',
  convoyPeople: 'pci-convoy-people',
  missionGear: 'pcc-mission-gear',
  missionPeople: 'pci-mission-people',
  genericGear: 'pcc-generic-gear',
  genericPeople: 'pci-generic-people',
} as const;

/**
 * Registry of every PCC/PCI checklist, grouped by scenario, so the exporters (below)
 * can include user-edited checklist items without duplicating the scenario/label
 * strings that also live in the TOOLS tab JSX.
 */
const CHECKLISTS: { storageKey: string; label: string; scenario: string }[] = [
  { storageKey: CHECKLIST_KEYS.convoyGear, label: 'Gear (PCC)', scenario: 'Convoy' },
  { storageKey: CHECKLIST_KEYS.convoyPeople, label: 'People (PCI)', scenario: 'Convoy' },
  { storageKey: CHECKLIST_KEYS.missionGear, label: 'Gear (PCC)', scenario: 'Executing a Mission' },
  { storageKey: CHECKLIST_KEYS.missionPeople, label: 'People (PCI)', scenario: 'Executing a Mission' },
  { storageKey: CHECKLIST_KEYS.genericGear, label: 'Gear (PCC)', scenario: 'Generic / Any Tasking' },
  { storageKey: CHECKLIST_KEYS.genericPeople, label: 'People (PCI)', scenario: 'Generic / Any Tasking' },
];

/** Reads a checklist's item text, tolerating both the legacy string[] and current {id,text}[] shapes. */
function getChecklistItemTexts(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => (typeof entry === 'string' ? entry : (entry?.text ?? '')))
      .filter((text): text is string => Boolean(text));
  } catch (e) {
    console.error('Failed to read checklist', storageKey, e);
    return [];
  }
}

// --- Components ---

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // Route through safeSetItem so a QuotaExceededError surfaces a toast instead of
      // silently dropping the write (same hardening as InlineNotes/NotesBlock).
      safeSetItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

interface ChecklistItem {
  id: string;
  text: string;
}

function newChecklistItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `item-${crypto.randomUUID()}`;
  }
  // Fallback for contexts where crypto.randomUUID is unavailable (e.g. some file:// hosts).
  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Migrate legacy string[] checklist storage to {id,text}[] and validate deserialized
 * objects at runtime (a TS assertion alone wouldn't catch a corrupted/hand-edited entry
 * missing `id` — which would break delete/edit: handleDelete(undefined) would remove
 * every valid item instead of one, and items sharing `undefined` ids would co-edit).
 * Idempotent.
 */
function normalizeChecklistItems(parsed: unknown, fallback: string[]): ChecklistItem[] {
  const source: unknown[] = Array.isArray(parsed) ? parsed : fallback;
  return source.map((entry) => {
    if (typeof entry === 'string') {
      return { id: newChecklistItemId(), text: entry };
    }
    const candidate = entry as Partial<ChecklistItem> | null | undefined;
    return {
      id: typeof candidate?.id === 'string' && candidate.id ? candidate.id : newChecklistItemId(),
      text: typeof candidate?.text === 'string' ? candidate.text : '',
    };
  });
}

const EditableChecklist = ({ storageKey, initialItems, title }: { storageKey: string, initialItems: string[], title: string }) => {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const normalized = normalizeChecklistItems(parsed, initialItems);
      const migratedFromStrings = Array.isArray(parsed) && parsed.some((e) => typeof e === 'string');
      if (raw === null || migratedFromStrings) {
        safeSetItem(storageKey, JSON.stringify(normalized));
      }
      return normalized;
    } catch (e) {
      console.error(e);
      return initialItems.map((text) => ({ id: newChecklistItemId(), text }));
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const persist = (next: ChecklistItem[]) => {
    setItems(next);
    safeSetItem(storageKey, JSON.stringify(next));
  };

  const handleDelete = (id: string) => {
    persist(items.filter((item) => item.id !== id));
  };

  const handleEdit = (id: string, val: string) => {
    setEditingId(id);
    setEditValue(val);
  };

  const saveEdit = (id: string) => {
    persist(items.map((item) => (item.id === id ? { ...item, text: editValue } : item)));
    setEditingId(null);
  };

  const handleAdd = () => {
    if (newItemValue.trim()) {
      persist([...items, { id: newChecklistItemId(), text: newItemValue.trim() }]);
      setNewItemValue("");
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-4 mb-2">
      <div className="font-bold text-[11px] text-[var(--text-secondary)] mb-2 uppercase tracking-wider">{title}</div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 items-start text-[10px] text-[var(--text-primary)]">
            <div className="w-1.5 h-1.5 mt-1 rounded-full bg-[var(--text-secondary)] shrink-0" />
            <div className="flex-1 min-w-0">
              {editingId === item.id ? (
                <div className="flex flex-col gap-1">
                  <textarea
                    className="w-full bg-[var(--surface-alt)] text-[var(--text-primary)] border border-[var(--border)] p-1 rounded text-[10px] resize-none h-16 focus:outline-none focus:border-[var(--accent-blue)]"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X size={12} /></button>
                    <button onClick={() => saveEdit(item.id)} className="text-[var(--accent-green)] hover:text-green-400"><Check size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between gap-2 group">
                  <span className="leading-tight">{item.text}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(item.id, item.text)} className="text-[var(--text-tertiary)] hover:text-[var(--accent-blue)]" title="Edit item"><Edit2 size={10} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)]" title="Delete item"><Trash2 size={10} /></button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {isAdding ? (
        <div className="mt-2 flex flex-col gap-1">
          <textarea 
            className="w-full bg-[var(--surface-alt)] text-[var(--text-primary)] border border-[var(--border)] p-1 rounded text-[10px] resize-none h-12 focus:outline-none focus:border-[var(--accent-blue)]"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            placeholder="New item..."
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><X size={12} /></button>
            <button onClick={handleAdd} className="text-[var(--accent-green)] hover:text-green-400"><Check size={12} /></button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAdding(true)}
          className="mt-2 text-[9px] flex items-center gap-1 font-bold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <Plus size={10} /> ADD ITEM
        </button>
      )}
    </div>
  );
};

const Block = ({ theme, letter, name, desc, children, defaultOpen = false }: { theme: string, letter: string, name: string, desc: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`block theme-${theme} ${isOpen ? 'open' : ''}`}>
      <div className="block-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="block-letter">{letter}</div>
        <div className="block-info">
          <div className="block-name">{name}</div>
          <div className="block-desc">{desc}</div>
        </div>
        <div className="block-chevron">▸</div>
      </div>
      <div className="block-body">
        <div className="block-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const SubBlock = ({ theme, letter, name, children }: { theme: string, letter: string, name: string, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`sub-block theme-${theme} ${isOpen ? 'open' : ''}`}>
      <div className="sub-header" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
        <div className="sub-letter">{letter}</div>
        <div className="sub-name">{name}</div>
        <div className="sub-chevron">▸</div>
      </div>
      <div className="sub-body">
        <div className="sub-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const LeafItem = ({ letter, text, style }: { letter: string, text: React.ReactNode, style?: React.CSSProperties }) => (
  <div className="leaf-item">
    <div className="leaf-letter" style={style}>{letter}</div>
    <div className="leaf-text">{text}</div>
  </div>
);

const GetGridButton = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      notify('Geolocation not supported by this browser', 'error');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        const { latitude, longitude } = position.coords;
        try {
          const grid = mgrs.forward([longitude, latitude], 5);
          let formattedGrid = grid;
          if (grid.length === 15) {
            formattedGrid = `${grid.substring(0, 3)} ${grid.substring(3, 5)} ${grid.substring(5, 10)} ${grid.substring(10, 15)}`;
          } else if (grid.length === 14) {
            formattedGrid = `${grid.substring(0, 2)} ${grid.substring(2, 4)} ${grid.substring(4, 9)} ${grid.substring(9, 14)}`;
          }
          window.dispatchEvent(new CustomEvent('insert-note', { detail: { id: 'osmeac-o', text: `Present Location: ${formattedGrid}` } }));
          notify('Grid added to Orientation notes', 'success');
        } catch (e) {
          console.error(e);
          notify('Could not convert location to MGRS (out of range?)', 'error');
        }
      },
      (err) => {
        setLoading(false);
        console.error(err);
        notify('Location failed — check permissions & services', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="ml-2 mt-0.5 shrink-0 bg-[var(--text-secondary)] text-[var(--bg)] text-[9px] font-bold px-2 py-1 rounded active:bg-[var(--text-primary)] hover:bg-[var(--text-tertiary)] transition-colors disabled:opacity-60"
    >
      {loading ? 'LOCATING…' : 'GET GRID'}
    </button>
  );
};

// --- Compass helpers ---

type IOSOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

type PermissionCapableCtor = {
  requestPermission?: () => Promise<PermissionState>;
};

const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

// Keeps rotation smooth across 359 -> 0 instead of spinning the long way around.
const smoothCompassDeg = (previousContinuousDeg: number, nextNormalizedDeg: number, factor = 0.28): number => {
  const previousNormalized = normalizeDeg(previousContinuousDeg);
  const delta = ((nextNormalizedDeg - previousNormalized + 540) % 360) - 180;
  return previousContinuousDeg + delta * factor;
};

const isInsideFrame = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const CompassArrow = ({
  label,
  rotationDeg,
  color,
  length = 31,
}: {
  label: string;
  rotationDeg: number;
  color: string;
  length?: number;
}) => (
  <div
    className="absolute inset-0 origin-center transition-transform duration-75 ease-linear"
    style={{ transform: `rotate(${rotationDeg}deg)` }}
  >
    <div className="absolute left-1/2 top-[9px] -translate-x-1/2 flex flex-col items-center">
      <div className="font-mono text-[11px] font-black leading-none" style={{ color }}>
        {label}
      </div>
      <div className="relative mt-[2px] w-[2px]" style={{ height: length, backgroundColor: color }}>
        <div
          className="absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent"
          style={{ borderBottomColor: color }}
        />
      </div>
    </div>
  </div>
);

const TopCompass = () => {
  const [isActive, setIsActive] = useState(false);
  const [magHeadingDeg, setMagHeadingDeg] = useState<number | null>(null);
  const [declination, setDeclination] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const lastHeadingRef = useRef<number | null>(null);
  const noEventTimerRef = useRef<number | null>(null);

  const clearNoEventTimer = () => {
    if (noEventTimerRef.current !== null) {
      window.clearTimeout(noEventTimerRef.current);
      noEventTimerRef.current = null;
    }
  };

  const stopCompass = () => {
    clearNoEventTimer();
    lastHeadingRef.current = null;
    setMagHeadingDeg(null);
    setStatusMsg('');
    setIsActive(false);
  };

  const startCompass = async () => {
    setStatusMsg('Requesting motion…');

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setStatusMsg('HTTPS required for compass.');
      return;
    }

    const orientationCtor = (window as any).DeviceOrientationEvent as PermissionCapableCtor | undefined;
    const motionCtor = (window as any).DeviceMotionEvent as PermissionCapableCtor | undefined;

    if (!orientationCtor) {
      setStatusMsg('Compass unsupported on this device.');
      return;
    }

    try {
      // Request BOTH sensor permissions immediately from the tap gesture. Do NOT await
      // geolocation first — on iOS that can consume the user gesture and fail the prompt.
      const requests: Promise<PermissionState>[] = [];
      if (typeof orientationCtor.requestPermission === 'function') {
        requests.push(orientationCtor.requestPermission());
      }
      if (typeof motionCtor?.requestPermission === 'function') {
        requests.push(motionCtor.requestPermission());
      }
      if (requests.length > 0) {
        const results = await Promise.all(requests.map((r) => r.catch(() => 'denied' as PermissionState)));
        if (results.some((r) => r !== 'granted')) {
          setStatusMsg(isInsideFrame() ? 'Motion blocked in preview frame.' : 'Motion permission denied.');
          return;
        }
      }

      lastHeadingRef.current = null;
      setMagHeadingDeg(null);
      setIsActive(true);
      setStatusMsg('Move phone to wake compass…');

      clearNoEventTimer();
      noEventTimerRef.current = window.setTimeout(() => {
        if (lastHeadingRef.current === null) {
          setStatusMsg(isInsideFrame() ? 'No sensor events — open as a standalone app.' : 'No compass events yet.');
        }
      }, 3000);

      // Real magnetic declination (WMM) from location — fetched AFTER activation so a
      // slow or denied GPS fix never blocks the compass. Leaves declination null on failure.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const { latitude, longitude } = position.coords;
              setDeclination(geomagnetism.model().point([latitude, longitude]).decl);
            } catch (e) {
              console.error('Declination calc failed:', e);
            }
          },
          (error) => console.warn('Geolocation for declination failed:', error),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      }
    } catch (error) {
      console.error('Compass permission error:', error);
      setStatusMsg(isInsideFrame() ? 'Sensor blocked by app frame.' : 'Compass permission failed.');
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const handleOrientation = (rawEvent: Event) => {
      const event = rawEvent as IOSOrientationEvent;
      let nextMagHeading: number | null = null;

      if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
        // iPhone/iPad WebKit — best real-world heading source (0 = north, clockwise).
        nextMagHeading = normalizeDeg(event.webkitCompassHeading);
        if (typeof event.webkitCompassAccuracy === 'number' && event.webkitCompassAccuracy > 30) {
          setStatusMsg('CAL: move phone in a figure-8');
        } else {
          setStatusMsg('');
        }
      } else if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
        // Android / other browsers — absolute alpha ≈ 360 - heading.
        nextMagHeading = normalizeDeg(360 - event.alpha);
        setStatusMsg('');
      }

      if (nextMagHeading === null) return;

      const previous = lastHeadingRef.current;
      const smoothed = previous === null ? nextMagHeading : smoothCompassDeg(previous, nextMagHeading);
      lastHeadingRef.current = smoothed;
      setMagHeadingDeg(smoothed);
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
      clearNoEventTimer();
    };
  }, [isActive]);

  if (!isActive) {
    return (
      <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={startCompass}
          className="rounded-full p-1 text-[var(--text-tertiary)] opacity-80 transition-colors hover:text-[var(--text-secondary)] hover:opacity-100 active:bg-[var(--surface-alt)]"
          title="Tap to enable compass"
          aria-label="Tap to enable compass"
        >
          <Compass size={20} strokeWidth={2.5} />
        </button>
        {statusMsg && (
          <div className="mt-1 max-w-[170px] whitespace-normal px-2 text-center font-mono text-[9px] leading-tight text-[var(--text-secondary)]">
            {statusMsg}
          </div>
        )}
      </div>
    );
  }

  // "G" arrow = grid/true north, corrected by the real WMM declination (East positive).
  // declination ≈ the map's G-M angle (ignores small UTM grid convergence — see to-dos).
  const gm = declination ?? 0;
  const magneticNorthRotation = magHeadingDeg === null ? gm : -magHeadingDeg;
  const gridNorthRotation = magHeadingDeg === null ? 0 : -(magHeadingDeg + gm);

  const magDisplay =
    magHeadingDeg === null
      ? '---°M'
      : `${Math.round(normalizeDeg(magHeadingDeg)).toString().padStart(3, '0')}°M`;
  const gmDisplay =
    declination === null ? 'G-M --' : `G-M ${Math.abs(Math.round(declination))}°${declination >= 0 ? 'E' : 'W'}`;

  return (
    <div className="absolute left-1/2 top-[-12px] z-50 flex -translate-x-1/2 flex-col items-center">
      <button
        type="button"
        onClick={stopCompass}
        className="relative h-[86px] w-[86px] rounded-full border border-[var(--border)] bg-[var(--surface-alt)] shadow-sm"
        title="Tap to close compass"
        aria-label="Tap to close compass"
      >
        <CompassArrow label="G" rotationDeg={gridNorthRotation} color="var(--text-primary)" length={33} />
        <CompassArrow label="M" rotationDeg={magneticNorthRotation} color="var(--accent-red)" length={28} />

        <div className="absolute left-1/2 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-primary)]" />

        <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] font-bold leading-none text-[var(--text-primary)]">
          {magDisplay}
        </div>
        <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] font-bold leading-none text-[var(--text-tertiary)]">
          {gmDisplay}
        </div>
      </button>
      {statusMsg && (
        <div className="mt-3 max-w-[180px] whitespace-normal px-2 text-center font-mono text-[8px] leading-tight text-[var(--text-secondary)]">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

const TEMPLATES: Record<string, string> = {
  // OSMEAC
  'osmeac-s-en': 'SALUTE (Current/Recent Actions):\n- Size (How many?):\n- Activity (What are they doing?):\n- Location (Grid/Description):\n- Unit (Type/Designation):\n- Time (When observed?):\n- Equipment (Weapons/Vehicles):\n\nDRAW-D (Capabilities):\n- Defend:\n- Reinforce:\n- Attack:\n- Withdraw:\n- Delay:',
  'osmeac-s-fr': 'HAS:\n- Higher: \n- Adjacent: \n- Supporting: ',
  'osmeac-e-ci': 'Purpose: \nMethod: \nEnd State: ',
  'osmeac-e-co': 'Phase I: \nPhase II: \nPhase III: \nPhase IV: ',
  'osmeac-e-coord': 'Timeline:\n- Check-on-station:\n- Rehearsals (Time/Type):\n\nCCIR (Commander\'s Critical Information Requirements):\n- PIR (Priority Intelligence):\n- FFIR (Friendly Force):\n\nPACE Plan (Communications):\n- Primary:\n- Alternate:\n- Contingency:\n- Emergency:\n\nOther Instructions:\n- ROE:\n- Sleep Plan:',
  'osmeac-a': 'Beans: \nBullets: \nBand-aids: \nBatteries: \nBad Guys: ',
  
  // METT-T
  'mettt-m': 'Task: \nPurpose: \nConstraints: ',
  'mettt-e-emlcoa': 'Most Likely Course of Action:\n\nMost Dangerous Course of Action:\n',
  'mettt-t-kocoa': 'Key Terrain: \nObservation/Fields of Fire: \nCover/Concealment: \nObstacles: \nAvenues of Approach: ',
  'mettt-t-wx': 'Visibility: \nWind: \nPrecipitation: \nCloud Cover: \nTemperature: \nSea State: ',
  'mettt-tr': 'Task Organization: \nOrganic Assets: \nHuman Factors: ',
  'mettt-fs': 'General Support: \nDirect Support: \nAttached: ',
  'mettt-time': 'Planning Factors Timeline:\n- Admin/Logistics (hrs):\n- Actions on Objective (mins):\n\nKey Times:\n- NLT:\n- Step Off:\n- Actions On:'
};

const useDictation = (onResult: (text: string) => void) => {
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      
      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onResultRef.current(finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsDictating(false);
      };

      rec.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleDictation = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isDictating) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsDictating(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return { isDictating, toggleDictation };
};

const InlineNotes = ({ id, label }: { id: string, label: string }) => {
  const [text, setText] = useState(() => localStorage.getItem(`inline-note-${id}`) || '');

  useEffect(() => {
    const handleInsert = (e: any) => {
      if (e.detail.id === id) {
        setText(prev => {
          const newText = prev ? `${prev}\n${e.detail.text}` : e.detail.text;
          safeSetItem(`inline-note-${id}`, newText);
          return newText;
        });
      }
    };
    window.addEventListener('insert-note', handleInsert);
    return () => window.removeEventListener('insert-note', handleInsert);
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    safeSetItem(`inline-note-${id}`, e.target.value);
  };

  const handleQuickFill = () => {
    if (TEMPLATES[id]) {
      const newText = text ? `${text}\n\n${TEMPLATES[id]}` : TEMPLATES[id];
      setText(newText);
      safeSetItem(`inline-note-${id}`, newText);
    }
  };

  const handleDictationResult = (transcript: string) => {
    setText(prev => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      safeSetItem(`inline-note-${id}`, newText);
      return newText;
    });
  };

  const { isDictating, toggleDictation } = useDictation(handleDictationResult);

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <div className="flex justify-between items-center mb-1.5">
        <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{label} NOTES</div>
        <div className="flex gap-2">
          <button
            onClick={toggleDictation}
            className={`text-[9px] flex items-center gap-1 font-bold px-2 py-0.5 rounded transition-colors ${isDictating ? 'bg-[var(--accent-red)] text-white' : 'text-[var(--bg)] bg-[var(--text-secondary)] hover:bg-[var(--text-tertiary)] active:bg-[var(--text-primary)]'}`}
            title="Dictate"
          >
            {isDictating ? <MicOff size={10} /> : <Mic size={10} />}
            DICTATE
          </button>
          {TEMPLATES[id] && (
            <button
              onClick={handleQuickFill}
              className="text-[9px] font-bold text-[var(--bg)] bg-[var(--text-secondary)] hover:bg-[var(--text-tertiary)] px-2 py-0.5 rounded transition-colors active:bg-[var(--text-primary)]"
            >
              QUICK FILL
            </button>
          )}
        </div>
      </div>
      <textarea
        className="w-full h-24 p-2 text-xs bg-[var(--surface-alt)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-blue)] resize-none"
        placeholder={`Enter ${label.toLowerCase()} here...`}
        value={text}
        onChange={handleChange}
      />
    </div>
  );
};

const NotesBlock = ({ sectionKey }: { sectionKey: string }) => {
  const [notes, setNotes] = useState(() => localStorage.getItem(`notes-${sectionKey}`) || '');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    safeSetItem(`notes-${sectionKey}`, e.target.value);
  };

  const handleDictationResult = (transcript: string) => {
    setNotes(prev => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      safeSetItem(`notes-${sectionKey}`, newText);
      return newText;
    });
  };

  const { isDictating, toggleDictation } = useDictation(handleDictationResult);

  return (
    <Block theme="blue" letter="✎" name="SECTION NOTES" desc={`Custom notes for ${sectionKey.toUpperCase()}`}>
      <div className="flex justify-end mb-1 mt-2">
         <button
            onClick={toggleDictation}
            className={`text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded transition-colors ${isDictating ? 'bg-[var(--accent-red)] text-white' : 'text-[var(--bg)] bg-[var(--text-secondary)] hover:bg-[var(--text-tertiary)] active:bg-[var(--text-primary)]'}`}
            title="Dictate"
          >
            {isDictating ? <MicOff size={12} /> : <Mic size={12} />}
            {isDictating ? 'STOP DICTATING' : 'DICTATE'}
          </button>
      </div>
      <textarea
        className="w-full h-32 p-2 text-xs bg-[var(--surface-alt)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-blue)] resize-none"
        placeholder="Enter your notes here..."
        value={notes}
        onChange={handleChange}
      />
    </Block>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'smeac' | 'mettt' | 'tools'>('smeac');
  const [timeL, setTimeL] = useState('0947L');
  const [timeZ, setTimeZ] = useState('1747Z');
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [isBlackoutMode, setIsBlackoutMode] = useLocalStorage<boolean>('blackout-mode', false);

  useEffect(() => {
    if (isBlackoutMode) {
      document.documentElement.setAttribute('data-theme', 'blackout');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isBlackoutMode]);

  useEffect(() => {
    const handler = (e: any) => setToast({ msg: e.detail.msg, type: e.detail.type || 'success' });
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleBlackoutMode = () => {
    setIsBlackoutMode(!isBlackoutMode);
  };

  const generateExportText = () => {
    let text = '';
    if (view === 'smeac') {
      const getNote = (id: string) => localStorage.getItem(`inline-note-${id}`) || '';
      const buildSection = (title: string, note: string, indent: string = '') => {
        const content = note.trim() || '[No notes provided]';
        return `${indent}${title}\n${indent}${content}\n\n`;
      };
      
      text = 'OPORD (OSMEAC)\n\n';
      text += buildSection('[O] ORIENTATION', getNote('osmeac-o'));
      
      text += '[S] SITUATION\n';
      text += buildSection('Enemy Forces:', getNote('osmeac-s-en'), '  ');
      text += buildSection('Friendly Forces:', getNote('osmeac-s-fr'), '  ');
      text += buildSection('Attachments & Detachments:', getNote('osmeac-s-ad'), '  ');
      
      text += buildSection('[M] MISSION', getNote('osmeac-m'));
      
      text += '[E] EXECUTION\n';
      text += buildSection('Commander\'s Intent:', getNote('osmeac-e-ci'), '  ');
      text += buildSection('Concept of Operations:', getNote('osmeac-e-co'), '  ');
      text += buildSection('Tasks:', getNote('osmeac-e-tk'), '  ');
      text += buildSection('Coordinating Instructions:', getNote('osmeac-e-coord'), '  ');
      
      text += buildSection('[A] ADMIN & LOGISTICS', getNote('osmeac-a'));
      text += buildSection('[C] COMMAND & SIGNAL', getNote('osmeac-c'));

      const generalNotes = localStorage.getItem('notes-smeac') || '';
      if (generalNotes.trim()) {
        text += `--- GENERAL NOTES ---\n${generalNotes}`;
      }
    } else if (view === 'mettt') {
      const getNote = (id: string) => localStorage.getItem(`inline-note-${id}`) || '';
      const buildSection = (title: string, note: string, indent: string = '') => {
        const content = note.trim() || '[No notes provided]';
        return `${indent}${title}\n${indent}${content}\n\n`;
      };
      
      text = 'METT-T ANALYSIS\n\n';
      text += buildSection('[M] MISSION', getNote('mettt-m'));
      
      text += '[E] ENEMY\n';
      text += buildSection('EMLCOA:', getNote('mettt-e-emlcoa'), '  ');

      text += '[T] TERRAIN & WEATHER\n';
      text += buildSection('KOCOA:', getNote('mettt-t-kocoa'), '  ');
      text += buildSection('Weather:', getNote('mettt-t-wx'), '  ');
      
      text += '[T] TROOPS & FIRE SUPPORT\n';
      text += buildSection('Troops:', getNote('mettt-tr'), '  ');
      text += buildSection('Fire Support:', getNote('mettt-fs'), '  ');
      
      text += buildSection('[T] TIME AVAILABLE', getNote('mettt-time'));

      const generalNotes = localStorage.getItem('notes-mettt') || '';
      if (generalNotes.trim()) {
        text += `--- GENERAL NOTES ---\n${generalNotes}`;
      }
    } else {
      const notes = localStorage.getItem('notes-tools') || '';
      text = 'TACTICAL TOOLS\n\n';

      text += '--- PCC / PCI CHECKLISTS ---\n\n';
      const scenarios = Array.from(new Set(CHECKLISTS.map((c) => c.scenario)));
      scenarios.forEach((scenario) => {
        text += `${scenario.toUpperCase()}\n`;
        CHECKLISTS.filter((c) => c.scenario === scenario).forEach((c) => {
          const checklistItems = getChecklistItemTexts(c.storageKey);
          text += `  ${c.label}:\n`;
          if (checklistItems.length === 0) {
            text += `    [No items]\n`;
          } else {
            checklistItems.forEach((item) => {
              text += `    - ${item}\n`;
            });
          }
        });
        text += '\n';
      });

      text += `--- NOTES ---\n${notes || 'No notes provided.'}`;
    }
    return text;
  };

  const handleShare = () => {
    const text = generateExportText();
    if (!navigator.clipboard) {
      notify('Clipboard unavailable — needs a secure (https) context', 'error');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => notify('COPIED TO CLIPBOARD', 'success'))
      .catch(err => {
        console.error('Failed to copy', err);
        notify('Copy failed — check clipboard permissions', 'error');
      });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin * 2;
    let cursorY = margin;
    
    const checkPageBreak = (neededHeight: number) => {
      if (cursorY + neededHeight > doc.internal.pageSize.height - 25) {
        doc.addPage();
        cursorY = margin;
        return true;
      }
      return false;
    };

    const getNote = (id: string) => localStorage.getItem(`inline-note-${id}`) || '';

    const printSection = (letter: string, title: string, content: string, isSubSection = false, isFirstMain = false) => {
      checkPageBreak(isSubSection ? 15 : 25);
      
      if (!isSubSection) {
        if (!isFirstMain) {
          cursorY += 4;
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 8;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(180, 180, 180);
        if (letter) {
           doc.text(letter, margin, cursorY);
        }
        doc.setTextColor(30, 30, 30);
        doc.text(title, margin + 12, cursorY);
        cursorY += 8;
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(45, 106, 79); // Green color for subheaders
        doc.text(title, margin + 12, cursorY);
        cursorY += 6;
      }

      if (content && content.trim() !== "") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const splitText = doc.splitTextToSize(content, maxLineWidth - 12);
        splitText.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 12, cursorY);
          cursorY += 5;
        });
        cursorY += 6; // Spacing after content
      } else {
         if (isSubSection) cursorY += 2;
      }
    };

    if (view === 'smeac') {
      // Header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("O P E R A T I O N   O R D E R", margin, cursorY);
      cursorY += 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text("OPORD // O·S·M·E·A·C", margin, cursorY);
      cursorY += 6;
      
      // Separator
      doc.setDrawColor(45, 106, 79); // Accent green
      doc.setLineWidth(1);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 10;

      printSection("O", "ORIENTATION", getNote('osmeac-o'), false, true);
      
      printSection("S", "SITUATION", "");
      printSection("", "ENEMY FORCES", getNote('osmeac-s-en'), true);
      printSection("", "FRIENDLY FORCES", getNote('osmeac-s-fr'), true);
      printSection("", "ATTACHMENTS & DETACHMENTS", getNote('osmeac-s-ad'), true);

      printSection("M", "MISSION", getNote('osmeac-m'));
      
      printSection("E", "EXECUTION", "");
      printSection("", "COMMANDER'S INTENT", getNote('osmeac-e-ci'), true);
      printSection("", "CONCEPT OF OPERATIONS", getNote('osmeac-e-co'), true);
      printSection("", "TASKS", getNote('osmeac-e-tk'), true);
      printSection("", "COORDINATING INSTRUCTIONS", getNote('osmeac-e-coord'), true);

      printSection("A", "ADMIN & LOGISTICS", getNote('osmeac-a'));
      printSection("C", "COMMAND & SIGNAL", getNote('osmeac-c'));

      const generalNotes = localStorage.getItem('notes-smeac') || '';
      if (generalNotes.trim() !== "") {
        printSection("", "GENERAL NOTES", generalNotes, false);
      }

    } else if (view === 'mettt') {
      // Header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("A N A L Y S I S", margin, cursorY);
      cursorY += 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text("METT-T", margin, cursorY);
      cursorY += 6;
      
      // Separator
      doc.setDrawColor(45, 106, 79); // Accent green
      doc.setLineWidth(1);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 10;

      printSection("M", "MISSION", getNote('mettt-m'), false, true);
      
      printSection("E", "ENEMY", "");
      printSection("", "EMLCOA", getNote('mettt-e-emlcoa'), true);

      printSection("T", "TERRAIN & WEATHER", "");
      printSection("", "KOCOA", getNote('mettt-t-kocoa'), true);
      printSection("", "WEATHER", getNote('mettt-t-wx'), true);

      printSection("T", "TROOPS & FIRE SUPPORT", "");
      printSection("", "TROOPS", getNote('mettt-tr'), true);
      printSection("", "FIRE SUPPORT", getNote('mettt-fs'), true);

      printSection("T", "TIME AVAILABLE", getNote('mettt-time'));

      const generalNotes = localStorage.getItem('notes-mettt') || '';
      if (generalNotes.trim() !== "") {
        printSection("", "GENERAL NOTES", generalNotes, false);
      }
    } else {
      // Fallback for other views
      const text = generateExportText();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
      const splitText = doc.splitTextToSize(text, maxLineWidth);
      splitText.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, cursorY);
        cursorY += 5;
      });
    }
    
    // Add Footer to all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, doc.internal.pageSize.height - 20, pageWidth - margin, doc.internal.pageSize.height - 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("WCC · SEABEE CONSTRUCTION ORDER", margin, doc.internal.pageSize.height - 15);
      
      const footerRight = view === 'smeac' ? "OSMEAC FORMAT" : `${view.toUpperCase()} FORMAT`;
      const textWidth = doc.getTextWidth(footerRight);
      doc.text(footerRight, pageWidth - margin - textWidth, doc.internal.pageSize.height - 15);
    }

    doc.save(`OPORD_Notes_${view.toUpperCase()}.pdf`);
  };

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const local = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
      const zulu = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).replace(':', '');
      setTimeL(`${local}L`);
      setTimeZ(`${zulu}Z`);
    };
    updateTimes();
    const timer = setInterval(updateTimes, 1000);
    return () => clearInterval(timer);
  }, []);

  const scrollToTop = () => {
    const el = document.getElementById('scroll-area');
    if (el) el.scrollTop = 0;
  };

  const handleViewChange = (newView: 'smeac' | 'mettt' | 'tools') => {
    setView(newView);
    scrollToTop();
  };

  return (
    <div className="iphone-frame">
      <div className={`absolute top-20 left-1/2 -translate-x-1/2 ${toast?.type === 'error' ? 'bg-[var(--accent-red)] text-white' : 'bg-[var(--text-primary)] text-[var(--bg)]'} text-[11px] font-bold tracking-wider px-4 py-2 rounded-full z-[200] transition-opacity duration-300 pointer-events-none max-w-[85%] text-center ${toast ? 'opacity-100' : 'opacity-0'}`}>
        {toast?.msg}
      </div>
      <div className="notch"></div>
      <div className="status-bar items-start mt-1">
        <div className="flex flex-col ml-6 text-[10px] leading-tight font-mono tracking-wider font-bold">
          <span>{timeL}</span>
          <span className="text-[var(--text-tertiary)]">{timeZ}</span>
        </div>
        <span className="icons mt-1 mr-6">▐▐▐▐ ⟋ ■</span>
      </div>

      <div className="app-header flex justify-between items-center relative">
        <TopCompass />
        <div>
          <div className="app-title">OPORD ANALYST</div>
          <div className="app-subtitle">
            {view === 'smeac' ? 'SMEAC' : view === 'mettt' ? 'METT-T' : 'TOOLS'}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleBlackoutMode}
            className={`p-2 transition-colors rounded-full active:bg-[var(--surface-alt)] ${isBlackoutMode ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent-blue)]'}`}
            title="Toggle Blackout Mode"
            aria-label="Toggle Blackout Mode"
          >
            <Moon size={20} strokeWidth={2.5} />
          </button>
          <button 
            onClick={handleExportPDF}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors rounded-full active:bg-[var(--surface-alt)]"
            title="Export to PDF"
            aria-label="Export to PDF"
          >
            <Download size={20} strokeWidth={2.5} />
          </button>
          <button 
            onClick={handleShare}
            className="p-2 -mr-2 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors rounded-full active:bg-[var(--surface-alt)]"
            title="Copy to Clipboard"
            aria-label="Copy to Clipboard"
          >
            <Share2 size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <div className={`tab ${view === 'smeac' ? 'active' : ''}`} onClick={() => handleViewChange('smeac')}>SMEAC</div>
        <div className={`tab ${view === 'mettt' ? 'active' : ''}`} onClick={() => handleViewChange('mettt')}>METT-T</div>
        <div className={`tab ${view === 'tools' ? 'active' : ''}`} onClick={() => handleViewChange('tools')}>TOOLS</div>
      </div>

      <div className="scroll-area" id="scroll-area">

        {/* ========== SMEAC VIEW ========== */}
        {view === 'smeac' && (
          <div id="view-smeac">
            <div className="section-label">FIVE PARAGRAPH ORDER</div>

            {/* O — ORIENTATION (ADDED) */}
            <Block theme="blue" letter="O" name="ORIENTATION" desc="Present Location, Direction, Objective">
              <div className="info-text">Prior to issuing the order, orient subordinates to the ground.</div>
              <LeafItem letter="PL" text={
                <div className="flex justify-between items-start">
                  <span><strong>Present Location</strong> — Where we are now (Grid/Terrain Feature)</span>
                  <GetGridButton />
                </div>
              } />
              <LeafItem letter="DOA" text={<span><strong>Direction of Attack</strong> — Cardinal direction (North, NE, etc.)</span>} />
              <LeafItem letter="OBJ" text={<span><strong>Objective Location</strong> — Where we are going relative to PL</span>} />
              <LeafItem letter="T" text={<span><strong>Terrain</strong> — Key features visible from current position</span>} />
              <LeafItem letter="TC" text={<span><strong>Tactical Control</strong> — Boundaries, Phase Lines, etc.</span>} />
              <InlineNotes id="osmeac-o" label="Orientation" />
            </Block>

            {/* S — SITUATION */}
            <Block theme="blue" letter="S" name="SITUATION" desc="Enemy, Friendly, Attachments & Detachments">
              <SubBlock theme="blue" letter="EN" name="ENEMY FORCES">
                <div className="info-text">Composition, disposition, strength, weapons, equipment, tactics. <em>See reference (b)</em> for detailed intel. Feeds directly into METT-T Enemy analysis.</div>
                <div className="connector">FEEDS → METT-T ENEMY</div>
                <InlineNotes id="osmeac-s-en" label="Enemy Forces" />
              </SubBlock>

              <SubBlock theme="blue" letter="FR" name="FRIENDLY FORCES">
                <LeafItem letter="H" text={<span><strong>Higher</strong> — Mission & intent of higher HQ (MEF → MEB)</span>} />
                <LeafItem letter="A" text={<span><strong>Adjacent</strong> — Units operating alongside (31st MEU)</span>} />
                <LeafItem letter="S" text={<span><strong>Supporting</strong> — Aviation, arty, recon, sealift assets with callsigns & priorities</span>} />
                <InlineNotes id="osmeac-s-fr" label="Friendly Forces" />
              </SubBlock>

              <SubBlock theme="blue" letter="A/D" name="ATTACHMENTS & DETACHMENTS">
                <div className="info-text">Units attached to or detached from the command for the operation. <em>Feeds into METT-T Troops analysis.</em></div>
                <div className="connector">FEEDS → METT-T TROOPS</div>
                <InlineNotes id="osmeac-s-ad" label="Attachments & Detachments" />
              </SubBlock>
            </Block>

            {/* M — MISSION */}
            <Block theme="red" letter="M" name="MISSION" desc="Single sentence: Who, What, When, Where, Why">
              <div className="info-text">The mission statement answers the <em>5 W's</em> in a single sentence. Contains your <em>task</em> (what to do) and <em>purpose</em> (why you're doing it — the "IOT" clause).</div>
              <div className="mettt-connector"><span>▶ ANALYZED USING METT-T</span></div>
              <div className="info-text">Your tasking statement from higher is where you find your mission. Priority is indicated by <em>MHP</em> (Mission Has Priority) or <em>THP</em> (Time Has Priority).</div>
              <InlineNotes id="osmeac-m" label="Mission" />
            </Block>

            {/* E — EXECUTION */}
            <Block theme="green" letter="E" name="EXECUTION" desc="CDR's Intent, Concept of Ops, Tasks, Coord Instructions">
              <SubBlock theme="green" letter="CI" name="COMMANDER'S INTENT">
                <LeafItem letter="P" text={<span><strong>Purpose</strong> — Why we're doing this</span>} />
                <LeafItem letter="M" text={<span><strong>Method</strong> — How we accomplish it</span>} />
                <LeafItem letter="E" text={<span><strong>Endstate</strong> — What right looks like when done</span>} />
                <div className="connector">INCLUDES</div>
                <LeafItem letter="⊕" text={<span><strong>COG</strong> — Center of Gravity: EN's source of strength</span>} />
                <LeafItem letter="⊖" text={<span><strong>CV</strong> — Critical Vulnerability: weakness that undermines COG</span>} />
                <LeafItem letter="⚡" text={<span><strong>Exploitation Plan</strong> — How to exploit CV</span>} />
                <InlineNotes id="osmeac-e-ci" label="Commander's Intent" />
              </SubBlock>

              <SubBlock theme="green" letter="CO" name="CONCEPT OF OPERATIONS">
                <div className="info-text">Phased approach to the operation. Describes how the unit conducts the mission.</div>
                <LeafItem letter="I" text={<span><strong>Phase I</strong> — Secure</span>} />
                <LeafItem letter="II" text={<span><strong>Phase II</strong> — Advance</span>} />
                <LeafItem letter="III" text={<span><strong>Phase III</strong> — Deny, Deceive, Influence</span>} />
                <LeafItem letter="IV" text={<span><strong>Phase IV</strong> — Consolidation</span>} />
                <InlineNotes id="osmeac-e-co" label="Concept of Operations" />
              </SubBlock>

              <SubBlock theme="green" letter="TK" name="TASKS">
                <LeafItem letter="S" text={<span><strong>Specified</strong> — Directly stated from higher. Use tactical task definitions from FM 1-02 / MCRP 5-12A</span>} />
                <LeafItem letter="I" text={<span><strong>Implied</strong> — Not stated but necessary for mission accomplishment. Deduced from CDR's intent & situation</span>} />
                <LeafItem letter="E" text={<span><strong>Essential</strong> — Must be accomplished to achieve overall mission</span>} />
                <InlineNotes id="osmeac-e-tk" label="Tasks" />
              </SubBlock>

              <SubBlock theme="green" letter="CI" name="COORDINATING INSTRUCTIONS">
                <LeafItem letter="🚫" text={<span><strong>NO GO Criteria</strong> — Conditions that abort the mission</span>} />
                <LeafItem letter="🔒" text={<span><strong>OPSEC</strong> — Operational Security</span>} />
                <LeafItem letter="👁" text={<span><strong>SIGNMAN</strong> — Signature Management</span>} />
                <LeafItem letter="⚖" text={<span><strong>ROE</strong> — PID of hostile act/intent required before deadly force</span>} />
                <InlineNotes id="osmeac-e-coord" label="Coordinating Instructions" />
              </SubBlock>
            </Block>

            {/* A — ADMIN & LOGISTICS */}
            <Block theme="amber" letter="A" name="ADMIN & LOGISTICS" desc="Five B's: Beans, Bullets, Bandaids, Batteries, Bad Guys">
              <LeafItem letter="B" style={{ background: '#FFF3CD', color: '#8B6914' }} text={<span><strong>Beans</strong> — Food & water sustainment</span>} />
              <LeafItem letter="B" style={{ background: '#FFF3CD', color: '#8B6914' }} text={<span><strong>Bullets</strong> — Ammunition & ordnance</span>} />
              <LeafItem letter="B" style={{ background: '#FFF3CD', color: '#8B6914' }} text={<span><strong>Bandaids</strong> — Medical support & CASEVAC</span>} />
              <LeafItem letter="B" style={{ background: '#FFF3CD', color: '#8B6914' }} text={<span><strong>Batteries</strong> — Power, fuel, energy</span>} />
              <LeafItem letter="B" style={{ background: '#FFF3CD', color: '#8B6914' }} text={<span><strong>Bad Guys</strong> — EPW handling & detainees</span>} />
              <div className="info-text" style={{ marginTop: 6 }}>Sustain ops for <em>no less than 6 days</em> before resupply. BPT back brief prior to execution.</div>
              <InlineNotes id="osmeac-a" label="Admin & Logistics" />
            </Block>

            {/* C — COMMAND & SIGNAL */}
            <Block theme="purple" letter="C" name="COMMAND & SIGNAL" desc="COC/TOC, Comms Plan, Succession of Command">
              <LeafItem letter="C" style={{ background: '#F3E5F5', color: '#5A189A' }} text={<span><strong>Command</strong> — As per SOP. COC/TOC watch officer manages access & ensures authorized personnel</span>} />
              <LeafItem letter="S" style={{ background: '#F3E5F5', color: '#5A189A' }} text={<span><strong>Signal</strong> — As per SOP. Comms plan, frequencies, callsigns, challenge/password</span>} />
              <div className="info-text" style={{ marginTop: 6 }}>Three levels of operations center: <em>Strategic, Operational, Tactical</em>. COC watch officer controls entry access.</div>
              <InlineNotes id="osmeac-c" label="Command & Signal" />
            </Block>

            <NotesBlock sectionKey="smeac" />
          </div>
        )}

        {/* ========== METT-T VIEW ========== */}
        {view === 'mettt' && (
          <div id="view-mettt">
            <div className="section-label">MISSION ANALYSIS FRAMEWORK</div>

            {/* M — MISSION */}
            <Block theme="red" letter="M" name="MISSION" desc="Task & Purpose from higher's tasking statement">
              <SubBlock theme="red" letter="TK" name="TASK — The &quot;What&quot;">
                <LeafItem letter="S" text={<span><strong>Specified</strong> — Exactly what you're told. Tactical tasks from FM 1-02. <em>"Words mean things."</em></span>} />
                <LeafItem letter="I" text={<span><strong>Implied</strong> — Not stated but required. Deduced from CDR intent, coord instructions, & estimate of situation</span>} />
                <LeafItem letter="E" text={<span><strong>Essential</strong> — Must be accomplished for overall mission success</span>} />
              </SubBlock>

              <SubBlock theme="red" letter="PU" name="PURPOSE — The &quot;Why&quot; (IOT)">
                <LeafItem letter="S" text={<span><strong>Specified</strong> — Expressed as "in order to." Places mission in context of bigger picture</span>} />
                <LeafItem letter="I" text={<span><strong>Implied</strong> — Unstated purposes that if not accomplished prevent specified purpose</span>} />
              </SubBlock>

              <SubBlock theme="red" letter="EP" name="ENGINEERING PRIORITIES">
                <div className="info-text">Determined by: CDR's intent, enemy actions, engineer capability, mission type (ABCC), logistical support, operational need, priority of effort, resource availability, time constraints. Higher HQ maintains <em>PEPL</em> (Prioritized Engineer Project List).</div>
              </SubBlock>
              <InlineNotes id="mettt-m" label="Mission" />
            </Block>

            {/* E — ENEMY */}
            <Block theme="blue" letter="E" name="ENEMY" desc="SALUTE → DRAWD → EMLCOA">
              <SubBlock theme="blue" letter="CDS" name="COMP / DISP / STRENGTH">
                <div className="section-label" style={{ paddingTop: 4 }}>SALUTE</div>
                <LeafItem letter="S" text={<span><strong>Size</strong> — How many? Larger/smaller than your force?</span>} />
                <LeafItem letter="A" text={<span><strong>Activity</strong> — What are they doing? Patrols, security, recon?</span>} />
                <LeafItem letter="L" text={<span><strong>Location</strong> — Where? Orientation? Grid coordinates</span>} />
                <LeafItem letter="U" text={<span><strong>Unit</strong> — Guerilla or conventional? Human factors?</span>} />
                <LeafItem letter="T" text={<span><strong>Time</strong> — Last seen/heard? What could they accomplish by now?</span>} />
                <LeafItem letter="E" text={<span><strong>Equipment</strong> — Weapons, comms, indirect fire, vehicles</span>} />
                <div className="info-text" style={{ marginTop: 4, fontStyle: 'italic' }}>Best practice: Bulletize SALUTE for briefing. Paragraph form OK for planning.</div>
              </SubBlock>

              <SubBlock theme="blue" letter="C&L" name="CAPABILITIES & LIMITATIONS">
                <div className="section-label" style={{ paddingTop: 4 }}>DRAWD — Rate: Most Likely / Likely / Unlikely</div>
                <div className="info-text" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>⚠ Only ONE can be "most likely"</div>
                <LeafItem letter="D" text={<span><strong>Defend</strong> — Can they defend? Formation? Weapons?</span>} />
                <LeafItem letter="R" text={<span><strong>Reinforce</strong> — From where? How many? How long?</span>} />
                <LeafItem letter="A" text={<span><strong>Attack</strong> — Formations? Probability? Timing?</span>} />
                <LeafItem letter="W" text={<span><strong>Withdraw</strong> — Direction? At what casualty %? Fight to death?</span>} />
                <LeafItem letter="D" text={<span><strong>Delay</strong> — IEDs, harassing fires, impeding logistics</span>} />
              </SubBlock>

              <SubBlock theme="blue" letter="EM" name="EMLCOA">
                <div className="info-text"><strong>Enemy's Most Likely Course of Action.</strong> Marry SALUTE + DRAWD. Lay out on the ground using each portion. This is your professional estimate of what the enemy will do when you execute your mission.</div>
                <div className="connector">SALUTE + DRAWD = EMLCOA</div>
                <InlineNotes id="mettt-e-emlcoa" label="EMLCOA" />
              </SubBlock>
            </Block>

            {/* T — TERRAIN & WEATHER */}
            <Block theme="green" letter="T" name="TERRAIN & WEATHER" desc="KOCOA + Weather factors">
              <SubBlock theme="green" letter="KO" name="KOCOA — Terrain">
                <LeafItem letter="K" text={<span><strong>Key Terrain</strong> — What, where, what advantage. Be mission-specific, don't just narrate the map</span>} />
                <LeafItem letter="O" text={<span><strong>Observation / Fields of Fire</strong> — How far can I see? How far can I shoot? Consider EN weapons too</span>} />
                <LeafItem letter="C" text={<span><strong>Cover & Concealment</strong> — Cover stops bullets. Concealment stops observation.</span>} />
                <LeafItem letter="O" text={<span><strong>Obstacles</strong> — Natural & manmade. How do they impede movement, defense, construction?</span>} />
                <LeafItem letter="A" text={<span><strong>Avenues of Approach</strong> — Specific routes with pros/cons for friendly & enemy. Don't just list roads.</span>} />
                <InlineNotes id="mettt-t-kocoa" label="KOCOA" />
              </SubBlock>

              <SubBlock theme="green" letter="WX" name="WEATHER">
                <LeafItem letter="V" text={<span><strong>Visibility</strong> — Affects thermal sights, NVGs, target acquisition</span>} />
                <LeafItem letter="W" text={<span><strong>Wind</strong> — Affects dust, aviation, cranes, sUAS, comms. NO GO at 50 mph</span>} />
                <LeafItem letter="P" text={<span><strong>Precipitation</strong> — Soil trafficability, digging, concrete placement, equipment</span>} />
                <LeafItem letter="C" text={<span><strong>Cloud Cover</strong> — Illumination, sensor degradation, CAS availability</span>} />
                <LeafItem letter="T" text={<span><strong>Temperature</strong> — Troop endurance, equipment performance, fuel consumption</span>} />
                <LeafItem letter="S" text={<span><strong>Sea State</strong> — Wave height, swell. Affects ship-to-shore movement</span>} />
                <div className="info-text" style={{ marginTop: 4 }}>Remember: <em>Astronomical</em> data, not <em>astrological</em>. Say WHY the weather matters to your mission.</div>
                <InlineNotes id="mettt-t-wx" label="Weather" />
              </SubBlock>
            </Block>

            {/* T — TROOPS & FIRE SUPPORT */}
            <Block theme="amber" letter="T" name="TROOPS & FIRE SUPPORT" desc="Task org, assets, human factors, fire support">
              <SubBlock theme="amber" letter="TR" name="TROOPS">
                <LeafItem letter="1" text={<span><strong>Task Organization</strong> — How you break up your unit (security / construction / defense teams)</span>} />
                <LeafItem letter="2" text={<span><strong>Organic Assets</strong> — Equipment: when & how to employ. Don't convoy gear not needed for weeks</span>} />
                <LeafItem letter="3" text={<span><strong>Human Factors</strong> — Training level, morale, headspace, certifications. Know your people.</span>} />
                <InlineNotes id="mettt-tr" label="Troops" />
              </SubBlock>

              <SubBlock theme="amber" letter="FS" name="FIRE SUPPORT">
                <LeafItem letter="GS" text={<span><strong>General Support</strong> — Available to all. Priority list determines who gets served first</span>} />
                <LeafItem letter="DS" text={<span><strong>Direct Support</strong> — Tasked to you, but tasking authority stays with higher</span>} />
                <LeafItem letter="AT" text={<span><strong>Attached</strong> — Tasking authority resides with YOU. Best case scenario.</span>} />
                <div className="connector">TYPES</div>
                <LeafItem letter="D" text={<span><strong>Direct Fire</strong> — Heavy MGs (.50 cal, 240, Mk 19)</span>} />
                <LeafItem letter="I" text={<span><strong>Indirect Fire</strong> — Artillery, mortars (Tango Co 5/11)</span>} />
                <div className="info-text" style={{ marginTop: 4 }}>Plan fire support for <em>all phases</em>. Task them out just like subordinate elements.</div>
                <InlineNotes id="mettt-fs" label="Fire Support" />
              </SubBlock>
            </Block>

            {/* T — TIME */}
            <Block theme="purple" letter="T" name="TIME AVAILABLE" desc="Backwards plan from actions on objective">
              <div className="info-text">Most difficult factor to shape. More time can never be made. Always affected by enemy actions and chaos of battle.</div>
              <SubBlock theme="purple" letter="TL" name="PLANNING FACTORS">
                <LeafItem letter="M" text={<span><strong>Mission vs Time</strong> — How long to accomplish? Set realistic NLTs. Align with CDR's priorities</span>} />
                <LeafItem letter="E" text={<span><strong>Enemy vs Time</strong> — How long to reinforce, withdraw, establish defense? Analyze their rate of speed</span>} />
                <LeafItem letter="T" text={<span><strong>Troops vs Time</strong> — Engineers on security can't build. Time your setups. Know your crew rates</span>} />
                <LeafItem letter="D" text={<span><strong>Distance vs Time</strong> — Increased space = increased time. Loading, offloading, security all add up</span>} />
                <LeafItem letter="W" text={<span><strong>Terrain & Wx vs Time</strong> — Frozen soil, mud, vegetation all slow engineer ops. Heat fatigues troops</span>} />
              </SubBlock>
              <div className="info-text" style={{ marginTop: 6 }}>Build two timelines: <em>Admin/Logistics</em> (hours) and <em>Actions On Objective</em> (minutes). Plan backwards from mission accomplishment.</div>
              <InlineNotes id="mettt-time" label="Time Available" />
            </Block>

            <NotesBlock sectionKey="mettt" />
          </div>
        )}

        {/* ========== TOOLS VIEW ========== */}
        {view === 'tools' && (
          <div id="view-tools">
            <div className="section-label">DECISION MAKING</div>

            <Block theme="blue" letter="⟳" name="OODA LOOP" desc="Observe → Orient → Decide → Act">
              <div className="info-text">Continuous decision cycle. Whoever controls tempo controls the fight. Speed and timing — know when to act and when NOT to act. Think: no-huddle offense.</div>
            </Block>

            <Block theme="green" letter="✓" name="PCC / PCI" desc="Pre-Combat Checks / Pre-Combat Inspections">
              <div className="info-text mb-4">
                <strong>PCC</strong> — Checks for <em>gear</em>. Accountability & functionality.<br/>
                <strong>PCI</strong> — Inspections for <em>people</em>. Mental state, knowledge, readiness.
              </div>

              <SubBlock theme="blue" letter="C" name="Convoy">
                <EditableChecklist 
                  storageKey={CHECKLIST_KEYS.convoyGear} 
                  title="Gear (PCC)"
                  initialItems={[
                    "Vehicles dispatched, fluids/tires checked, no deadline issues; recovery vehicle and tow straps/chains staged",
                    "Fuel topped off, jerry cans secured",
                    "Comms — radios up, fills loaded, PACE plan set, spare batteries; check-in with COC before SP",
                    "Blue Force Tracker / nav up, strip map and route loaded",
                    "Weapons cleaned, function-checked, accountable by serial; crew-served mounted with correct ammo and headspace/timing set",
                    "Med gear — IFAKs on every body, vehicle trauma kit / litter staged, CASEVAC vehicle identified",
                    "Load secured, blocking/bracing in place, nothing shifting or protruding; hazmat documented if carried",
                    "Fire extinguishers, spare tire, basic tools per vehicle"
                  ]} 
                />
                <EditableChecklist 
                  storageKey={CHECKLIST_KEYS.convoyPeople} 
                  title="People (PCI)"
                  initialItems={[
                    "Every driver/A-driver/gunner briefed on route, order of march, speeds, intervals, and the SP/RP times",
                    "Actions-on rehearsed — contact, IED/blast, vehicle down, CASEVAC, breakdown, separation from convoy",
                    "Everyone can state the mission and the immediate-action drills cold",
                    "Bump plan and recovery plan known — who cross-loads where if a vehicle drops",
                    "Convoy commander and assistant identified; succession known",
                    "Challenge/password and far/near recognition signals known",
                    "Hydration/chow status good; heat-cat and work/rest understood (relevant in Okinawa)",
                    "PPE worn — IBA/plates, helmet, eye pro, hearing pro, gloves, seatbelts",
                    "Sensitive items inventoried before SP"
                  ]} 
                />
              </SubBlock>

              <SubBlock theme="red" letter="M" name="Executing a Mission">
                <EditableChecklist 
                  storageKey={CHECKLIST_KEYS.missionGear} 
                  title="Gear (PCC)"
                  initialItems={[
                    "CESE for the task dispatched and PMCS'd; MHE/crane inspected, rigging gear (slings, shackles) inspected and rated",
                    "Class IV staged and inventoried against the BOM — don't roll out short on materials",
                    "Tools accounted for, power/fuel for equipment confirmed",
                    "Comms up to higher; PACE set",
                    "Weapons and ammo accountable; security element's gear checked",
                    "Corpsman's bag stocked, CASEVAC plan and 9-line staged, nearest MTF known",
                    "Site safety gear — barricades, signage, fire watch equipment, spill kit"
                  ]} 
                />
                <EditableChecklist 
                  storageKey={CHECKLIST_KEYS.missionPeople} 
                  title="People (PCI)"
                  initialItems={[
                    "Every Seabee can state the mission, their task, and the commander's intent",
                    "Crew can name the top hazards of the specific evolution — not a generic list",
                    "Security plan briefed; who pulls security while the crew builds, sectors assigned",
                    "Actions-on rehearsed — contact, casualty, equipment failure mid-task, fire",
                    "Medical/admin currency checked — no profiles or non-deployables put on a 12-hour pour",
                    "Fatigue and mental state read honestly — who's been on nights, who got bad news",
                    "PPE worn for the trade — hearing pro for operators, eye pro, hard hats, hi-viz",
                    "Hydration/work-rest cycle set for the heat"
                  ]} 
                />
              </SubBlock>

              <SubBlock theme="amber" letter="G" name="Generic / Any Tasking">
                <div className="info-text">The mnemonic that travels: <strong>METT-SLANT</strong> mindset, but for checks just run <strong>gear → security → comms → med → people</strong>.</div>
                <EditableChecklist 
                  storageKey={CHECKLIST_KEYS.genericGear} 
                  title="Gear (PCC)"
                  initialItems={[
                    "Sensitive items — weapons, optics, comms, NVDs, crypto — inventoried by serial, before and after",
                    "Comms — radios up, PACE plan, check-in complete",
                    "Weapons — clean, function-checked, correct ammo",
                    "Med — IFAKs on every body, CASEVAC plan known, corpsman located"
                  ]} 
                />
                <EditableChecklist 
                  storageKey={CHECKLIST_KEYS.genericPeople} 
                  title="People (PCI)"
                  initialItems={[
                    "Every individual can state: the mission, their job in it, and what to do when it goes wrong",
                    "Actions-on rehearsed for the most likely and most dangerous contingencies",
                    "Leadership and succession identified",
                    "Hydration, chow, PPE, work/rest — individual readiness to actually execute"
                  ]} 
                />
              </SubBlock>
            </Block>

            <div className="section-label">WARFARE CONCEPTS</div>

            <Block theme="red" letter="⚔" name="WARFARE STYLES" desc="Attrition vs Maneuver">
              <LeafItem letter="A" text={<span><strong>Attrition</strong> — Attacks enemy's <em>capability</em> to fight. Superior numbers, firepower, logistics</span>} />
              <LeafItem letter="M" text={<span><strong>Maneuver</strong> — Attacks enemy's <em>ability and will</em> to fight. Speed, surprise, positioning</span>} />
              <div className="info-text" style={{ marginTop: 4 }}>Better forces use both. Combat power = tangible (known facts) + intangible (morale, momentum, the "12th man")</div>
            </Block>

            <Block theme="purple" letter="▲" name="LEVELS OF WAR" desc="Strategic → Operational → Tactical">
              <LeafItem letter="S" text={<span><strong>Strategic</strong> — National policy & objectives. Senior civilian/military leadership</span>} />
              <LeafItem letter="O" text={<span><strong>Operational</strong> — Campaigns & major operations. When, where, & conditions of engagement</span>} />
              <LeafItem letter="T" text={<span><strong>Tactical</strong> — Specific missions, battles, engagements. <em>Where we live.</em></span>} />
              <div className="info-text" style={{ marginTop: 4 }}>Everything flows downward. If you don't understand the strategic goal and you're just doing stuff at the tactical level, you're working hard for nothing.</div>
            </Block>

            <Block theme="amber" letter="◎" name="TACTICAL TENETS" desc="How fights are actually won">
              <LeafItem letter="1" text={<span><strong>Achieving a Decision</strong> — Objective is a clear outcome, not just contact</span>} />
              <LeafItem letter="2" text={<span><strong>Gaining Advantage</strong> — Complementary forces, surprise, asymmetry. Combine arms</span>} />
              <LeafItem letter="3" text={<span><strong>Adapting / Tempo</strong> — Control the rate of action. Timing matters. Anticipation + improv</span>} />
              <LeafItem letter="4" text={<span><strong>Exploiting Success</strong> — Momentum through continuous pressure. Train subordinates to recognize opportunity. Commit fully.</span>} />
            </Block>

            <div className="section-label">TACTICAL CONTROL MEASURES</div>

            <Block theme="green" letter="⬒" name="TCMs — BOUNDARIES" desc="Define areas of responsibility & coordination">
              <LeafItem letter="BD" text={<span><strong>Boundary</strong> — Defines unit's AO. Establishes responsibility between adjacent units. No unit fires across a boundary without coordination</span>} />
              <LeafItem letter="AO" text={<span><strong>Area of Operations</strong> — Geographic area assigned to a commander. Responsible for all activity within it</span>} />
              <LeafItem letter="AI" text={<span><strong>Area of Interest</strong> — Extends beyond AO. Area that can influence current & future ops</span>} />
              <LeafItem letter="ZN" text={<span><strong>Zone of Action</strong> — Assigned for advance. Unit clears within zone, maintaining contact with adjacent units</span>} />
              <LeafItem letter="SC" text={<span><strong>Sector of Fire</strong> — Area assigned to a weapon or unit for fire coverage. Establishes fields of fire responsibility</span>} />
            </Block>

            <Block theme="blue" letter="⊸" name="TCMs — LINEAR" desc="Phase lines, LOAs, axes, routes, directions">
              <LeafItem letter="PL" text={<span><strong>Phase Line</strong> — Easily identifiable terrain feature used to control movement & coordinate fires. Named (PL RED, PL BLUE). Crossed, not held</span>} />
              <LeafItem letter="LD" text={<span><strong>Line of Departure</strong> — Coordinated line where the attack begins. Crossed at H-Hour. Orients the force</span>} />
              <LeafItem letter="LOA" text={<span><strong>Limit of Advance</strong> — Line beyond which attacking forces will not advance. Prevents overextension & fratricide</span>} />
              <LeafItem letter="FL" text={<span><strong>FEBA / FLOT</strong> — Forward Edge of Battle Area / Forward Line of Own Troops. Where friendly forces face the enemy</span>} />
              <LeafItem letter="AX" text={<span><strong>Axis of Advance</strong> — General route of advance. Directs scheme of maneuver. Unit is not restricted to the road itself</span>} />
              <LeafItem letter="DA" text={<span><strong>Direction of Attack</strong> — More restrictive than axis. Specifies direction but not specific route</span>} />
              <LeafItem letter="RT" text={<span><strong>Route</strong> — Prescribed course of travel. Specific road/path. Most restrictive movement control measure</span>} />
              <LeafItem letter="MSR" text={<span><strong>Main Supply Route</strong> — Designated route for movement of supplies & logistics. Critical for sustainment</span>} />
              <LeafItem letter="ASR" text={<span><strong>Alternate Supply Route</strong> — Backup route if MSR is compromised or congested</span>} />
            </Block>

            <Block theme="red" letter="◎" name="TCMs — POINTS & AREAS" desc="Objectives, checkpoints, rally points, EAs">
              <SubBlock theme="red" letter="OBJ" name="OBJECTIVES & TARGETS">
                <LeafItem letter="OBJ" text={<span><strong>Objective</strong> — Physical area to be seized, secured, or controlled. Named (OBJ LION). Drives scheme of maneuver</span>} />
                <LeafItem letter="MLR" text={<span><strong>MLR Objective</strong> — Marine Littoral Regiment objective. In this OPORD: MLR Obj 1 (airstrip/EAB site) and MLR Obj 2</span>} />
                <LeafItem letter="TRP" text={<span><strong>Target Reference Point</strong> — Easily identifiable point on the ground used to orient & focus fires. Controls indirect fire</span>} />
                <LeafItem letter="EA" text={<span><strong>Engagement Area</strong> — Clearly defined area intended to contain & destroy an enemy force. You want to engage the enemy HERE</span>} />
              </SubBlock>

              <SubBlock theme="red" letter="CP" name="CONTROL POINTS">
                <LeafItem letter="CP" text={<span><strong>Checkpoint</strong> — Predetermined point on the ground for orientation & reporting. Named/numbered</span>} />
                <LeafItem letter="CC" text={<span><strong>Contact Point</strong> — Where two adjacent units make physical contact. Ensures no gaps between units</span>} />
                <LeafItem letter="PP" text={<span><strong>Passage Point</strong> — Where units pass through another unit's position. Coordinated to prevent fratricide</span>} />
                <LeafItem letter="RP" text={<span><strong>Release Point</strong> — Where subordinate elements leave the main body to execute assigned missions</span>} />
                <LeafItem letter="SP" text={<span><strong>Start Point</strong> — Where movement begins. Units cross at prescribed time</span>} />
              </SubBlock>

              <SubBlock theme="red" letter="RP" name="RALLY POINTS & ASSEMBLY">
                <LeafItem letter="ORP" text={<span><strong>Objective Rally Point</strong> — Last covered & concealed position before the objective. Leaders recon & brief from here. Key implied task</span>} />
                <LeafItem letter="IRP" text={<span><strong>Initial Rally Point</strong> — Designated point for link-up before movement. First assembly</span>} />
                <LeafItem letter="AA" text={<span><strong>Assembly Area</strong> — Position where units prepare for operations. Staging, resupply, reorganization</span>} />
                <LeafItem letter="SA" text={<span><strong>Staging Area</strong> — Area where units are positioned prior to execution. Final prep before LD</span>} />
              </SubBlock>
            </Block>

            <Block theme="amber" letter="⊘" name="TCMs — FIRE CONTROL" desc="CFL, NFL, RFL, fire support coordination">
              <LeafItem letter="CFL" text={<span><strong>Coordinated Fire Line</strong> — Beyond this line, fires may be delivered without additional coordination. Below it, requires coordination with ground units</span>} />
              <LeafItem letter="NFL" text={<span><strong>No-Fire Line</strong> — Line beyond which no fires or effects are delivered without specific coordination. Protects friendly/civilian areas</span>} />
              <LeafItem letter="RFL" text={<span><strong>Restrictive Fire Line</strong> — Between adjacent units. Neither unit fires across without coordination from the establishing HQ</span>} />
              <LeafItem letter="RFA" text={<span><strong>Restrictive Fire Area</strong> — Specific area with restrictions. Requires coordination to fire into. Protects assets or populations</span>} />
              <LeafItem letter="FFA" text={<span><strong>Free Fire Area</strong> — Area into which any weapon system may fire without additional coordination. All targets considered hostile</span>} />
              <LeafItem letter="NFA" text={<span><strong>No-Fire Area</strong> — No fires or effects. Period. Except in self-defense or with specific approval from establishing HQ</span>} />
              <LeafItem letter="FPF" text={<span><strong>Final Protective Fire</strong> — Preplanned barrier of fire. Last resort. Designed to stop enemy assault directly in front of defensive positions</span>} />
              <LeafItem letter="PDF" text={<span><strong>Principal Direction of Fire</strong> — Direction a weapon is oriented to cover. Priority sector for MGs and crew-served weapons</span>} />
            </Block>

            <Block theme="purple" letter="◫" name="TCMs — ENGINEER SPECIFIC" desc="Obstacle control, EAB, ADR measures">
              <LeafItem letter="EAB" text={<span><strong>Expeditionary Advanced Base</strong> — Forward operating location established to support operations. Your ABCC mission: establish & maintain</span>} />
              <LeafItem letter="ADR" text={<span><strong>Airfield Damage Repair</strong> — Rapid restoration of airfield surfaces to minimum operating standards. BPT task in this OPORD</span>} />
              <LeafItem letter="MOS" text={<span><strong>Minimum Operating Strip</strong> — Shortest runway length for mission-essential aircraft. Drives ADR priorities</span>} />
              <LeafItem letter="OZ" text={<span><strong>Obstacle Zone</strong> — Commander's intent for obstacle placement. Broad area guidance</span>} />
              <LeafItem letter="OB" text={<span><strong>Obstacle Belt</strong> — More specific than zone. Tied to terrain. Channels or disrupts enemy movement</span>} />
              <LeafItem letter="OG" text={<span><strong>Obstacle Group</strong> — Individual obstacles placed to accomplish specific tactical purpose within a belt</span>} />
              <LeafItem letter="LP" text={<span><strong>Listening Post / Observation Post</strong> — Forward security positions. Early warning. Critical for EAB defense</span>} />
              <LeafItem letter="ECP" text={<span><strong>Entry Control Point</strong> — Controlled access point to a secured area. Manages who enters & exits your site</span>} />
            </Block>

            <div className="section-label">COMBAT ORDERS</div>

            <Block theme="blue" letter="📋" name="ORDER TYPES" desc="OPORD, WARNORD, FRAGORD">
              <LeafItem letter="O" text={<span><strong>OPORD</strong> — Full five-paragraph order (SMEAC)</span>} />
              <LeafItem letter="W" text={<span><strong>WARNORD</strong> — Issued immediately upon receipt of mission. Initiates preparation. Essential details + planning time</span>} />
              <LeafItem letter="F" text={<span><strong>FRAGORD</strong> — Fragment order. Focuses on <em>Execution</em> paragraph. Everything else stays the same.</span>} />
            </Block>

            <MapSymbolsSection />

            <NotesBlock sectionKey="tools" />
          </div>
        )}

      </div>

      <div className="bottom-nav">
        <div className={`nav-item ${view === 'smeac' ? 'active' : ''}`} onClick={() => handleViewChange('smeac')}>
          <div className="nav-icon">▤</div>
          <div className="nav-label">ORDER</div>
        </div>
        <div className={`nav-item ${view === 'mettt' ? 'active' : ''}`} onClick={() => handleViewChange('mettt')}>
          <div className="nav-icon">◈</div>
          <div className="nav-label">ANALYZE</div>
        </div>
        <div className={`nav-item ${view === 'tools' ? 'active' : ''}`} onClick={() => handleViewChange('tools')}>
          <div className="nav-icon">⚙</div>
          <div className="nav-label">TOOLS</div>
        </div>
      </div>
    </div>
  );
}
