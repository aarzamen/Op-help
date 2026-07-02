// Ambient globals not present in the standard lib.dom.d.ts.
// See docs/SPEC-dictation-apple-asr.md (§5, §3b).

/** React → native host (WKWebView) control message for dictation. */
type OpordSpeechMessage =
  | { command: 'start'; targetId: string; onDeviceOnly?: boolean }
  | { command: 'stop'; targetId: string };

/** Native host → React payload, delivered via the `opord-asr-result` CustomEvent. */
interface OpordAsrDetail {
  type: 'transcript' | 'status';
  targetId: string;
  text?: string;
  isFinal?: boolean;
  status?: string;
  message?: string;
}

/** Minimal Web Speech recognizer shape — enough to type our usage without a full lib. */
interface SpeechRecognitionCtor {
  new (): {
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
}

interface Window {
  /** Present only inside a WKWebView host (e.g. an Appifier iOS build). */
  webkit?: {
    messageHandlers?: {
      opordSpeech?: { postMessage: (message: OpordSpeechMessage) => void };
    };
  };
}

interface WindowEventMap {
  'opord-asr-result': CustomEvent<OpordAsrDetail>;
}
