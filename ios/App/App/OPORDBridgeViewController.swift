import Capacitor
import WebKit

/// Capacitor's web view controller plus OPORD's own native bridge (on-device dictation).
/// SceneDelegate creates this instead of the plain CAPBridgeViewController.
class OPORDBridgeViewController: CAPBridgeViewController {
    private var speech: OPORDSpeechBridge?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView else { return }
        let speech = OPORDSpeechBridge(webView: webView)
        webView.configuration.userContentController.add(
            WeakScriptMessageHandler(speech), name: OPORDSpeechBridge.handlerName)
        self.speech = speech
    }
}
