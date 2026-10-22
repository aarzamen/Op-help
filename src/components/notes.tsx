import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import {
  NOTE_CHANGED_EVENT,
  noteKey,
  notify,
  readItem,
  readNote,
  safeSetItem,
} from '../lib/storage';
import { TEMPLATES } from '../content/templates';
import { Block } from './ui';

const hasNativeAppleSpeech = () =>
  typeof window !== 'undefined' && !!window.webkit?.messageHandlers?.opordSpeech;

/**
 * Provider-agnostic dictation. Uses the native Apple-Speech bridge when running inside a
 * WKWebView host (`window.webkit.messageHandlers.opordSpeech`), otherwise falls back to
 * the browser Web Speech API. Each hook instance owns a stable `targetId` so multiple
 * DICTATE buttons don't cross-wire. See docs/SPEC-dictation-apple-asr.md.
 */
const useDictation = (onResult: (text: string) => void) => {
  const [isDictating, setIsDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('');
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  // Stable, unique id per hook instance (React.useId) so multiple DICTATE buttons don't
  // cross-wire native-bridge events. No RNG needed (works under file:// in a WKWebView).
  const targetId = `dictation${useId()}`;

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Native Apple-ASR bridge: only fires inside a WKWebView host. Ignore events addressed
  // to another hook instance (targetId).
  useEffect(() => {
    const handleNative = (event: WindowEventMap['opord-asr-result']) => {
      const detail = event.detail;
      if (!detail || detail.targetId !== targetId) return;
      if (detail.type === 'status') {
        if (detail.status === 'stopped' || (detail.status ?? '').endsWith('denied')) {
          // 'stopped' also fires in response to our own explicit stop, which already
          // clears the status — don't flash it back on afterward.
          setIsDictating(false);
          setDictationStatus('');
        } else {
          setDictationStatus(detail.message || detail.status || '');
        }
        return;
      }
      if (detail.type === 'transcript') {
        if (detail.isFinal && detail.text) {
          onResultRef.current(detail.text);
          setDictationStatus('');
          setIsDictating(false);
        } else {
          setDictationStatus('Listening…');
        }
      }
    };
    window.addEventListener('opord-asr-result', handleNative);
    return () => window.removeEventListener('opord-asr-result', handleNative);
  }, [targetId]);

  // Browser Web Speech fallback — skipped when the native bridge is present.
  useEffect(() => {
    if (hasNativeAppleSpeech()) return;
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
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
        const message = event.error || 'speech error';
        setDictationStatus(message);
        setIsDictating(false);
        // Auto-clear so a stale error doesn't sit under the DICTATE button forever;
        // only clear if nothing newer has already replaced this message.
        setTimeout(() => {
          setDictationStatus((current) => (current === message ? '' : current));
        }, 4000);
      };

      rec.onend = () => {
        setIsDictating(false);
        // Clear the transient "Listening…" when recognition ends naturally (e.g. a
        // silence timeout) — but leave error text alone so onerror's message stays
        // readable until its own 4s auto-clear.
        setDictationStatus((current) => (current === 'Listening…' ? '' : current));
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleDictation = () => {
    // Native Apple-Speech bridge path (inside a WKWebView host).
    if (hasNativeAppleSpeech()) {
      const handler = window.webkit!.messageHandlers!.opordSpeech!;
      if (isDictating) {
        handler.postMessage({ command: 'stop', targetId });
        setIsDictating(false);
        setDictationStatus('');
      } else {
        handler.postMessage({ command: 'start', targetId, onDeviceOnly: true });
        setIsDictating(true);
        setDictationStatus('Requesting speech…');
      }
      return;
    }

    // Browser Web Speech fallback path.
    const recognition = recognitionRef.current;
    if (!recognition) {
      notify('Speech recognition is not supported in this browser.', 'error');
      return;
    }
    if (isDictating) {
      recognition.stop();
      setIsDictating(false);
      setDictationStatus('');
    } else {
      try {
        recognition.start();
        setIsDictating(true);
        setDictationStatus('Listening…');
      } catch (e) {
        console.error(e);
        setDictationStatus('Could not start dictation.');
      }
    }
  };

  return { isDictating, toggleDictation, dictationStatus };
};

/** Grow a textarea with its content (min height from CSS) so long notes don't scroll inside a scroll. */
function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [ref, value]);
}

const DictateButton = ({
  isDictating,
  onClick,
  long = false,
}: {
  isDictating: boolean;
  onClick: () => void;
  long?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`chip ${isDictating ? 'chip-live' : ''}`}
    aria-pressed={isDictating}
    title="Dictate"
  >
    {isDictating ? <MicOff size={11} /> : <Mic size={11} />}
    {isDictating && long ? 'STOP DICTATING' : 'DICTATE'}
  </button>
);

/**
 * Per-section notes field, persisted as `inline-note-<id>`. Optional quick-fill template
 * comes from content/templates.ts (keyed by the same id).
 */
export const InlineNotes = ({
  id,
  label,
  placeholder,
}: {
  id: string;
  label: string;
  placeholder?: string;
}) => {
  const [text, setText] = useState(() => readNote(id));
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(areaRef, text);

  // Another component appended to this note (GET GRID, tasking builder, CASEVAC insert).
  useEffect(() => {
    const handleChanged = (e: WindowEventMap['note-changed']) => {
      if (e.detail?.id === id) setText(readNote(id));
    };
    window.addEventListener(NOTE_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(NOTE_CHANGED_EVENT, handleChanged);
  }, [id]);

  const save = (next: string) => {
    setText(next);
    safeSetItem(noteKey(id), next);
  };

  const handleQuickFill = () => {
    if (TEMPLATES[id]) save(text ? `${text}\n\n${TEMPLATES[id]}` : TEMPLATES[id]);
  };

  const handleDictationResult = (transcript: string) => {
    setText((prev) => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      safeSetItem(noteKey(id), newText);
      return newText;
    });
  };

  const { isDictating, toggleDictation, dictationStatus } = useDictation(handleDictationResult);

  return (
    <div className="notes">
      <div className="notes-head">
        <div className="notes-label">{label} NOTES</div>
        <div className="notes-actions">
          <DictateButton isDictating={isDictating} onClick={toggleDictation} />
          {TEMPLATES[id] && (
            <button
              type="button"
              onClick={handleQuickFill}
              className="chip"
              title="Insert the outline for this section"
            >
              TEMPLATE
            </button>
          )}
        </div>
      </div>
      {dictationStatus && <div className="notes-status">{dictationStatus}</div>}
      <textarea
        ref={areaRef}
        className="notes-area"
        aria-label={`${label} notes`}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()} here…`}
        value={text}
        onChange={(e) => save(e.target.value)}
      />
    </div>
  );
};

/** Free-text notes for a whole view, persisted as `notes-<sectionKey>`. */
export const NotesBlock = ({ sectionKey, label }: { sectionKey: string; label: string }) => {
  const storageKey = `notes-${sectionKey}`;
  const [notes, setNotes] = useState(() => readItem(storageKey));
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(areaRef, notes);

  const handleDictationResult = (transcript: string) => {
    setNotes((prev) => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      safeSetItem(storageKey, newText);
      return newText;
    });
  };

  const { isDictating, toggleDictation, dictationStatus } = useDictation(handleDictationResult);

  return (
    <Block theme="slate" letter="✎" name="NOTES" desc={`Free notes for ${label}`}>
      <div className="notes" style={{ borderTop: 'none', marginTop: 0 }}>
        <div className="notes-head">
          <div className="notes-label">{label} NOTES</div>
          <div className="notes-actions">
            <DictateButton isDictating={isDictating} onClick={toggleDictation} long />
          </div>
        </div>
        {dictationStatus && <div className="notes-status">{dictationStatus}</div>}
        <textarea
          ref={areaRef}
          className="notes-area notes-area-tall"
          aria-label={`${label} notes`}
          placeholder="Enter your notes here…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            safeSetItem(storageKey, e.target.value);
          }}
        />
      </div>
    </Block>
  );
};
