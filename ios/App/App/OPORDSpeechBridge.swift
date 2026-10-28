import AVFoundation
import Foundation
import Speech
import UIKit
import WebKit

/// On-device dictation for the web app's DICTATE buttons (docs/SPEC-dictation-apple-asr.md §6).
///
/// JS → Swift: `window.webkit.messageHandlers.opordSpeech.postMessage({command, targetId, onDeviceOnly})`
/// Swift → JS: `window.dispatchEvent(new CustomEvent('opord-asr-result', {detail}))` where `detail` is
///   `{type: 'transcript', targetId, text, isFinal}` or `{type: 'status', targetId, status, message}`.
///
/// Rules: audio never leaves the phone (on-device only, never a silent cloud fallback), no audio is
/// stored, partial text is for display only, and every stop path releases the microphone.
@MainActor
final class OPORDSpeechBridge: NSObject, WKScriptMessageHandler {
    static let handlerName = "opordSpeech"

    /// Words the recognizer should expect, so doctrine terms come out right.
    static let vocabulary = [
        "SMEAC", "OSMEAC", "METT-T", "KOCOA", "OCOKA", "SALUTE", "DRAW-D", "MGRS", "OPORD", "FRAGO",
        "WARNO", "COC", "TOC", "BAS", "CCP", "HLZ", "LZ", "CASEVAC", "MEDEVAC", "MIST", "nine-line",
        "MSR", "ASR", "phase line", "checkpoint", "grid", "easting", "northing", "azimuth", "PCC",
        "PCI", "EPW", "IED", "Seabee", "NMCB", "battalion", "company", "platoon", "squad", "fire team",
    ]

    /// Longest single dictation before the microphone turns itself off.
    private static let maxSeconds: TimeInterval = 120
    /// How long to wait for the final text after the person taps stop.
    private static let finalWait: TimeInterval = 3

    private weak var webView: WKWebView?
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var targetId: String?
    private var lastText = ""
    /// True once the person has tapped stop; a recognizer error after that is just the end.
    private var finishing = false
    private var capTimer: Timer?
    private var finalTimer: Timer?

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(stopForSystem),
                           name: UIApplication.didEnterBackgroundNotification, object: nil)
        center.addObserver(self, selector: #selector(stopForSystem),
                           name: AVAudioSession.interruptionNotification, object: nil)
    }

    // MARK: - Messages from the page

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let command = body["command"] as? String,
              let target = body["targetId"] as? String else { return }
        switch command {
        case "start":
            start(target: target, onDeviceOnly: body["onDeviceOnly"] as? Bool ?? true)
        case "stop":
            if target == targetId { finish() }
        default:
            break
        }
    }

    // MARK: - Start

    private func start(target: String, onDeviceOnly: Bool) {
        // One microphone: a second DICTATE button takes over from the first.
        if let current = targetId {
            teardown()
            send(status: "stopped", message: nil, to: current)
        }
        targetId = target
        lastText = ""
        finishing = false
        send(status: "requesting", message: "Requesting speech…", to: target)

        SFSpeechRecognizer.requestAuthorization { status in
            Task { @MainActor in
                guard self.targetId == target else { return }
                guard status == .authorized else {
                    self.fail(target, status: "speech-permission-denied",
                              "Speech recognition is off for OPORD. Turn it on in Settings › OPORD.")
                    return
                }
                self.requestMicrophone { granted in
                    guard self.targetId == target else { return }
                    guard granted else {
                        self.fail(target, status: "mic-permission-denied",
                                  "Microphone is off for OPORD. Turn it on in Settings › OPORD.")
                        return
                    }
                    self.begin(target: target, onDeviceOnly: onDeviceOnly)
                }
            }
        }
    }

    private func requestMicrophone(_ done: @escaping @MainActor (Bool) -> Void) {
        let reply: @Sendable (Bool) -> Void = { granted in Task { @MainActor in done(granted) } }
        if #available(iOS 17.0, *) {
            AVAudioApplication.requestRecordPermission(completionHandler: reply)
        } else {
            AVAudioSession.sharedInstance().requestRecordPermission(reply)
        }
    }

    private func begin(target: String, onDeviceOnly: Bool) {
        guard let recognizer, recognizer.isAvailable else {
            fail(target, status: "error", "Speech recognition isn't available right now.")
            return
        }
        // OPSEC: never fall back to Apple's servers without the person choosing it.
        if onDeviceOnly && !recognizer.supportsOnDeviceRecognition {
            fail(target, status: "error",
                 "On-device dictation isn't available for English on this device. Add English under Settings › General › Keyboard › Dictation.")
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        request.requiresOnDeviceRecognition = onDeviceOnly
        request.contextualStrings = Self.vocabulary
        if #available(iOS 16.0, *) { request.addsPunctuation = true }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let input = audioEngine.inputNode
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in
                request.append(buffer)
            }
            audioEngine.prepare()
            try audioEngine.start()
        } catch {
            teardown()
            fail(target, status: "error", "Couldn't start the microphone: \(error.localizedDescription)")
            return
        }

        self.request = request
        task = recognizer.recognitionTask(with: request) { result, error in
            let text = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal ?? false
            let failure = error?.localizedDescription
            Task { @MainActor in self.handle(text: text, isFinal: isFinal, failure: failure, for: target) }
        }
        capTimer = Timer.scheduledTimer(withTimeInterval: Self.maxSeconds, repeats: false) { _ in
            Task { @MainActor in if self.targetId == target { self.finish() } }
        }
        send(status: "listening", message: "Listening…", to: target)
    }

    // MARK: - Results

    private func handle(text: String?, isFinal: Bool, failure: String?, for target: String) {
        guard targetId == target else { return }
        if let text, !text.isEmpty { lastText = text }
        if let failure, !finishing, lastText.isEmpty {
            // The recognizer gave up on its own before hearing anything: say why.
            fail(target, status: "error", "Dictation stopped: \(failure)")
        } else if isFinal || failure != nil {
            // A failure after speech still delivers what was heard.
            deliverFinal(to: target)
        } else if let text, !text.isEmpty {
            send(["type": "transcript", "targetId": target, "text": text, "isFinal": false])
        }
    }

    private func deliverFinal(to target: String) {
        let text = lastText.trimmingCharacters(in: .whitespacesAndNewlines)
        teardown()
        if text.isEmpty {
            send(status: "stopped", message: nil, to: target)
        } else {
            send(["type": "transcript", "targetId": target, "text": text, "isFinal": true])
        }
    }

    // MARK: - Stop

    /// The person tapped stop (or the time cap hit): stop listening, then wait briefly for the final text.
    private func finish() {
        guard let target = targetId else { return }
        finishing = true
        capTimer?.invalidate()
        capTimer = nil
        stopAudio()
        request?.endAudio()
        finalTimer?.invalidate()
        finalTimer = Timer.scheduledTimer(withTimeInterval: Self.finalWait, repeats: false) { _ in
            Task { @MainActor in if self.targetId == target { self.deliverFinal(to: target) } }
        }
    }

    /// Going to the background or a phone call: keep what was heard and release the microphone.
    @objc private func stopForSystem() {
        if let target = targetId { deliverFinal(to: target) }
    }

    private func stopAudio() {
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
    }

    /// Releases everything: engine, tap, request, task, timers and the audio session.
    private func teardown() {
        capTimer?.invalidate()
        finalTimer?.invalidate()
        capTimer = nil
        finalTimer = nil
        stopAudio()
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        targetId = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Messages to the page

    private func fail(_ target: String, status: String, _ message: String) {
        if targetId == target { teardown() }
        send(status: status, message: message, to: target)
    }

    private func send(status: String, message: String?, to target: String) {
        var detail: [String: Any] = ["type": "status", "targetId": target, "status": status]
        if let message { detail["message"] = message }
        send(detail)
    }

    private func send(_ detail: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: detail),
              let json = String(data: data, encoding: .utf8) else { return }
        #if DEBUG
        NSLog("OPORDSpeech → page: %@", json)
        #endif
        webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('opord-asr-result', { detail: \(json) }));")
    }
}

/// WKUserContentController keeps a strong reference to its handlers; this breaks the cycle.
final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
