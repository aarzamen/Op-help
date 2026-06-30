# Spec — Dictation: provider-agnostic ASR + optional Apple-native backend

Status: **proposed** (downstream coding task). Owner: TBD.
Source: synthesis of a GPT 5.5 Pro analysis + maintainer direction (prefer Apple
on-device models over cloud) + this repo's current state.

---

## 0. Correction up front (important)

Two assumptions floating around need to be corrected before any work starts:

1. **Gemini is NOT in the dictation path.** Dictation today is the browser **Web
   Speech API** (`window.SpeechRecognition || window.webkitSpeechRecognition`) in the
   `useDictation` hook in `src/App.tsx`. The `@google/genai` dependency that was in
   `package.json` was **already removed** in Milestone A and never touched dictation.
   So "replace the Google API call in dictation" is moot — there is no Google API call
   in dictation to replace. What remains is a *quality/OPSEC* motivation, below.

2. **"Apple Foundation Models" is not the ASR engine.** Apple's native
   speech-to-text is the **Speech framework** (`SFSpeechRecognizer`,
   `SFSpeechAudioBufferRecognitionRequest`, `SFSpeechRecognitionTask`). The
   **Foundation Models** framework (`LanguageModelSession`) is an on-device LLM used
   *after* transcription for cleanup/structuring — a separate, optional phase.

## 1. Why do this at all (the real motivation)

The current Web Speech path has two hard limits that matter for this app's stated
field/tactical use case:

- **OPSEC / network dependency.** Web Speech is cloud-backed: Chrome streams audio to
  Google's servers, and iOS Safari's implementation is unreliable and not guaranteed
  on-device. For a tool that captures operational content (enemy SALUTE, grids,
  mission), **sending dictation audio to a third-party cloud is an OPSEC problem**, and
  it doesn't work offline. Apple's Speech framework supports **on-device recognition**
  (`requiresOnDeviceRecognition`) — audio never leaves the device.
- **iOS Safari coverage.** `webkitSpeechRecognition` is effectively unsupported /
  flaky on iOS Safari. So today dictation realistically only works on desktop Chrome/
  Edge and Android Chrome — i.e. **not on the phone this app is designed for.**

So the goal is **on-device, offline, OPSEC-safe dictation on iPhone** — which Apple's
Speech framework provides and the browser cannot.

## 2. The hard constraint (feasibility)

A web app — whether served by Google AI Studio, a PWA, or plain Safari — **cannot
import Apple's `Speech` or `FoundationModels` Swift frameworks.** Those are native. To
use Apple-native ASR you must ship a **native iOS host** that runs the React build in a
`WKWebView` and bridges JS↔Swift. There is no web-only path to on-device Apple ASR.

This is a **significant scope addition**, not a code tweak:
- A separate Xcode/iOS project, Apple Developer Program membership ($99/yr), code
  signing, and a distribution channel (TestFlight / ad-hoc / MDM).
- **Two surfaces to maintain:** the web app (AI Studio preview + browser fallback) and
  the native iOS wrapper (Apple ASR). The web preview's "share a URL" simplicity is
  lost for the native build.
- Decide whether the native wrapper loads a **bundled** copy of the build (true offline)
  or a **hosted** URL (needs network for the UI). For field use, bundle it.

## 3. Architecture decision — keep the React app, swap the engine

The single most important design point (and the one GPT got right): **replace the
dictation *engine*, not the app's note model.** `InlineNotes` / `NotesBlock` already
have the right seam:

> DICTATE button → `useDictation(onResult)` → `onResult(text)` appends into the
> textarea + `safeSetItem` to localStorage.

Keep that seam. Make `useDictation` a **provider-agnostic adapter** that picks a backend
at runtime. Backends:

| Provider | Where it runs | On-device? |
|---|---|---|
| **WebSpeechProvider** (existing) | AI Studio preview, desktop/Android browsers | No (cloud) |
| **AppleBridgeProvider** (new) | native iOS WKWebView wrapper | Yes (Apple Speech) |
| *(future)* Whisper/edge/cloud | anywhere | varies |

Detection: `AppleBridgeProvider` is selected iff
`window.webkit?.messageHandlers?.opordSpeech` exists (only true inside the native
shell); otherwise fall back to `WebSpeechProvider`. **Never remove the web fallback** —
it's what keeps AI Studio + browsers working.

### 3a. Native host: raw WKWebView vs Capacitor (recommendation)

Two ways to build the native shell:

- **Raw WKWebView host** (GPT's skeleton): a hand-written `UIViewController` that owns a
  `WKWebView`, a `WKUserContentController`, and the `OPORDSpeechBridge`
  (`WKScriptMessageHandler`). Minimal deps, maximal control, more boilerplate (loading
  the bundle, lifecycle, signing wiring all by hand).
- **Capacitor** (recommended): wraps the existing Vite build into an iOS app and gives
  you the WKWebView + a typed JS↔Swift bridge **for free**. The Speech bridge becomes a
  small **Capacitor plugin** (`@capacitor/core` on the JS side, a Swift `CAPPlugin` on
  the native side) instead of hand-rolled message handlers. Less boilerplate, a
  conventional `npx cap add ios` / `npx cap sync` workflow, and it leaves a clean path
  to Android later. Cost: one build-tooling dependency.

**Recommendation:** Capacitor, unless the maintainer wants zero added tooling. The Swift
Speech logic is identical either way; only the bridge plumbing differs. The rest of this
spec uses the raw-WKWebView message names (`opordSpeech` / `opord-asr-result`) because
they're provider-agnostic; a Capacitor plugin would expose the same logical events.

## 4. Phasing

Do this in order. **Phase 1 ships in the current web repo today and de-risks everything.**

- **Phase 1 — Provider-agnostic `useDictation` (web repo, no native code).**
  Refactor `useDictation` into an adapter with a `SpeechProvider` interface, a
  `WebSpeechProvider` (the current logic, unchanged behavior), and an
  `AppleBridgeProvider` that talks to `window.webkit.messageHandlers.opordSpeech` and
  listens for `opord-asr-result`. Add a stable per-hook `targetId` so multiple DICTATE
  buttons don't cross-wire (fixes a latent bug: today two `useDictation` instances each
  make their own recognizer and can collide). Surface a `dictationStatus` string for the
  UI. **Fully backward-compatible**: with no native bridge present, behavior is identical
  to today. Independently testable with a mocked bridge. *This is the only phase that
  touches this repo.*

- **Phase 2 — Native iOS shell + Apple Speech bridge.**
  New iOS project (Capacitor or raw WKWebView). Implement `OPORDSpeechBridge` with the
  Speech framework. Wire Info.plist usage strings. This lives in a **native project**
  (likely a sibling repo or an `ios/` directory), not the React `src/`.

- **Phase 3 — Foundation Models post-processing (optional, later).**
  A *second*, separate bridge (`opordFoundationModel`) that takes a **final transcript
  only** and returns a cleaned/structured version via `LanguageModelSession`. Never used
  for raw ASR. Must be strictly non-inventive (see §7).

## 5. Phase 1 — React adapter (implementable now)

Refactor `src/App.tsx`'s `useDictation` into a provider-agnostic hook. Shape:

```ts
type DictationStatus = '' | 'requesting' | 'listening' | string; // free-text errors ok
interface UseDictation {
  isDictating: boolean;
  toggleDictation: () => void;
  dictationStatus: DictationStatus;
}
const useDictation = (onResult: (finalText: string) => void): UseDictation => { /* … */ };
```

Behavior:
- `targetIdRef = useRef('dictation-' + crypto.randomUUID())` — stable per instance.
  (Avoid `Math.random()` only if you adopt a deterministic test harness; fine for the app.)
- **Native present** (`window.webkit?.messageHandlers?.opordSpeech`):
  - `toggleDictation` posts `{command:'start'|'stop', targetId, onDeviceOnly:true}`.
  - Listen for `opord-asr-result`; **ignore events whose `detail.targetId` ≠ this hook's**.
  - `type:'transcript'` + `isFinal` → `onResult(text)`; partials → update `dictationStatus`
    for live display only (do **not** append partials to the note).
  - `type:'status'` → map to `dictationStatus`; `stopped`/`*-denied` → `isDictating=false`.
- **Native absent**: the existing `SpeechRecognition` path verbatim (keep the
  unsupported-browser alert).
- `InlineNotes`/`NotesBlock`: consume `dictationStatus` and render it under the DICTATE
  button in tiny mono text. **Do not** change localStorage keys or the append behavior.

> The full skeleton from the source analysis is a good starting implementation; align it
> with this repo's conventions (the shared `notify` toast can also surface dictation
> errors instead of `alert`).

## 6. Phase 2 — Apple Speech bridge (native)

Engine: `SFSpeechRecognizer` (locale `en-US`), `SFSpeechAudioBufferRecognitionRequest`,
`SFSpeechRecognitionTask`, `AVAudioEngine` for capture.

Required `Info.plist`: `NSMicrophoneUsageDescription`,
`NSSpeechRecognitionUsageDescription`.

Bridge contract (JS ↔ Swift), keep it provider-agnostic:
- JS → Swift: `window.webkit.messageHandlers.opordSpeech.postMessage({command, targetId, onDeviceOnly})`.
- Swift → JS: `window.dispatchEvent(new CustomEvent('opord-asr-result', { detail: {type, targetId, …} }))`
  via `evaluateJavaScript`, where `type` is `transcript` (`text`, `isFinal`) or `status`.

Required Swift behavior (correctness-critical):
- Request **speech** *and* **mic** authorization before starting; on denial send a
  `*-permission-denied` status.
- `request.shouldReportPartialResults = true`, `request.taskHint = .dictation`.
- **`request.contextualStrings`** seeded with OPORD/Seabee vocab to cut transcription
  errors on doctrine terms: `SMEAC, OSMEAC, METT-T, KOCOA, SALUTE, DRAW-D, MGRS, COC,
  TOC, BAS, CCP, CASEVAC, MEDEVAC, MSR, ASR, phase line, checkpoint, grid, easting,
  northing, Port Hueneme, Okinawa, NMCB, Seabee, battalion, company, platoon` (make this
  list configurable/extensible).
- **On-device:** if `supportsOnDeviceRecognition`, set `requiresOnDeviceRecognition =
  onDeviceOnly`. If on-device is requested but unsupported for the locale/device, send a
  clear status ("On-device speech unavailable for this locale/device") rather than
  silently falling back to cloud — **let the user decide** (OPSEC).
- **Lifecycle / cleanup (every stop path):** cancel + nil the previous `recognitionTask`
  before starting a new one; on stop, `audioEngine.stop()`, **remove the input tap**,
  `recognitionRequest.endAudio()`, nil request+task, deactivate the `AVAudioSession`.
  Stop on: user tap, navigation, app background, and audio-session interruption.
- **Never persist raw audio.** Partials are for live display only; append only finals.

A reference `OPORDSpeechBridge` skeleton (from the source analysis) is a sound starting
point — keep its structure but ensure the cleanup invariants above hold on *all* exit
paths, and route partial vs final exactly as in §5.

## 7. Phase 3 — Foundation Models cleanup (optional, strict)

Separate bridge `opordFoundationModel`, **final transcript only**, via
`LanguageModelSession`. Returns `{ rawTranscript, cleanedTranscript }`; the user chooses
which to keep (default to raw; cleaned is opt-in).

**Non-negotiable prompt constraint** (tactical safety — a hallucinated grid or callsign
can be dangerous):

> "Clean up punctuation, casing, military acronyms, and obvious dictation artifacts.
> Preserve all grids, times, names, call signs, quantities, and uncertainties exactly.
> Do not add facts. If unsure, leave the wording unchanged."

Surface a visible diff (raw vs cleaned) so the operator can verify nothing was invented.

## 8. Open decisions for the maintainer

1. **Commit to native?** This adds an iOS project, an Apple Developer account, signing,
   and a second distribution path. Confirm before Phase 2. (Phase 1 is safe regardless.)
2. **Capacitor vs raw WKWebView** (§3a) — recommend Capacitor.
3. **Bundled vs hosted web build** in the wrapper — recommend bundled (offline).
4. **On-device-only as the default** (recommend yes for OPSEC), with an explicit,
   visible opt-in if the user ever wants cloud recognition for accuracy.
5. Distribution: TestFlight, ad-hoc, or MDM?

## 9. Acceptance criteria

1. Existing DICTATE buttons still work; localStorage note behavior unchanged.
2. Browser Web Speech remains the fallback; AI Studio preview is unaffected.
3. Multiple DICTATE buttons no longer cross-wire (per-`targetId` routing).
4. In the native wrapper, DICTATE prompts for mic + speech permission.
5. Apple Speech returns partial (live display) and final (appended) transcripts.
6. Final transcript appends with the same behavior as today.
7. Stopping releases audio engine, request, task, and input tap on every path.
8. Contextual strings include the OPORD/Seabee vocabulary.
9. On-device recognition is attempted only when supported; a clear message otherwise.
10. No raw audio persisted.
11. Foundation Models used only post-transcription, never for raw ASR, never inventing facts.
12. With no native bridge, behavior is byte-for-byte the current web behavior.
