import { useEffect, useState } from 'react';
import {
  Ambulance,
  BookOpen,
  Download,
  FileText,
  Moon,
  ScanSearch,
  Share2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { TopCompass } from './components/compass';
import { copyText, notify, useLocalStorage, type ToastType } from './lib/storage';
import { clockLZ } from './lib/dtg';
import { exportPdf, exportText } from './export/exporters';
import GuideView from './views/GuideView';
import AnalyzeView from './views/AnalyzeView';
import OrderView from './views/OrderView';
import CasevacView from './casevac/CasevacTab';
import { incomingPayload } from './casevac/handoff';
import ToolsView from './views/ToolsView';
import OperationManager from './components/OperationManager';
import { buildStamp, setNativeStatusBar } from './lib/native';

export type ViewId = 'guide' | 'analyze' | 'order' | 'casevac' | 'tools';

const NAV: { id: ViewId; label: string; title: string; Icon: LucideIcon }[] = [
  { id: 'guide', label: 'GUIDE', title: 'GUIDE', Icon: BookOpen },
  { id: 'analyze', label: 'ANALYZE', title: 'METT-T', Icon: ScanSearch },
  { id: 'order', label: 'ORDER', title: 'OSMEAC', Icon: FileText },
  { id: 'casevac', label: 'CASEVAC', title: 'CASEVAC', Icon: Ambulance },
  { id: 'tools', label: 'TOOLS', title: 'TOOLS', Icon: Wrench },
];

/** Local + Zulu clock in its own component so the ticking doesn't re-render every view. */
const Clock = () => {
  const [[l, z], setNow] = useState(() => clockLZ());
  useEffect(() => {
    const t = setInterval(() => setNow(clockLZ()), 10_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="clock">
      <span className="clock-local">{l} · </span>
      {z}
    </span>
  );
};

const NavButtons = ({ view, onGo }: { view: ViewId; onGo: (v: ViewId) => void }) => (
  <>
    {NAV.map(({ id, label, Icon }) => (
      <button
        key={id}
        type="button"
        className={`nav-btn ${view === id ? 'active' : ''}`}
        aria-current={view === id ? 'page' : undefined}
        onClick={() => onGo(id)}
      >
        <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
        <span>{label}</span>
      </button>
    ))}
  </>
);

export default function App() {
  const [stored, setView] = useLocalStorage<ViewId>('active-view', 'guide');
  // A shared CASEVAC link (#cv=…) opens straight onto the CASEVAC tab.
  const [linkOpen, setLinkOpen] = useState(() => incomingPayload() !== null);
  const view: ViewId = linkOpen ? 'casevac' : NAV.some((n) => n.id === stored) ? stored : 'guide';
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [isBlackoutMode, setIsBlackoutMode] = useLocalStorage<boolean>('blackout-mode', false);
  const [exporting, setExporting] = useState(false);

  // A link pasted into a tab that already has the app open only changes the fragment.
  useEffect(() => {
    const onHash = () => {
      if (incomingPayload() !== null) setLinkOpen(true);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (isBlackoutMode) document.documentElement.setAttribute('data-theme', 'blackout');
    else document.documentElement.removeAttribute('data-theme');
    setNativeStatusBar(isBlackoutMode).catch(() => {});
  }, [isBlackoutMode]);

  useEffect(() => {
    const handler = (e: WindowEventMap['app-toast']) =>
      setToast({ msg: e.detail.msg, type: e.detail.type || 'success' });
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const go = (v: ViewId) => {
    setLinkOpen(false);
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const handlePdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportPdf(view);
    } catch (e) {
      console.error(e);
      notify('PDF export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const current = NAV.find((n) => n.id === view)!;

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div
        role="status"
        aria-live="polite"
        className={`toast ${toast?.type === 'error' ? 'toast-error' : ''} ${toast ? 'show' : ''}`}
      >
        {toast?.msg}
      </div>

      <header className="app-header">
        <div className="header-row">
          <div className="title-stack">
            <div className="app-title">
              OPORD ANALYST <Clock />
            </div>
            <h1 className="app-subtitle">{current.title}</h1>
          </div>
          <TopCompass />
          <div className="header-actions">
            <button
              type="button"
              onClick={() => setIsBlackoutMode(!isBlackoutMode)}
              className={`icon-btn icon-btn-lg ${isBlackoutMode ? 'icon-btn-on' : ''}`}
              title="Toggle blackout mode"
              aria-label="Toggle blackout mode"
              aria-pressed={isBlackoutMode}
            >
              <Moon size={20} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={exporting}
              className="icon-btn icon-btn-lg"
              title="Export this tab to PDF"
              aria-label="Export this tab to PDF"
            >
              <Download size={20} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => copyText(exportText(view))}
              className="icon-btn icon-btn-lg"
              title="Copy this tab as text"
              aria-label="Copy this tab as text"
            >
              <Share2 size={20} strokeWidth={2.4} />
            </button>
          </div>
        </div>
        <OperationManager />
        <nav className="top-nav" aria-label="Sections">
          <NavButtons view={view} onGo={go} />
        </nav>
      </header>

      <main id="main" className={`content ${view === 'casevac' ? 'content-wide' : ''}`}>
        {view === 'guide' && <GuideView onNavigate={go} />}
        {view === 'analyze' && <AnalyzeView onNavigate={go} />}
        {view === 'order' && <OrderView onNavigate={go} />}
        {view === 'casevac' && <CasevacView />}
        {view === 'tools' && <ToolsView />}
        <footer className="build-stamp">OPORD Analyst · {buildStamp()}</footer>
      </main>

      <nav className="bottom-nav" aria-label="Sections">
        <NavButtons view={view} onGo={go} />
      </nav>
    </div>
  );
}
