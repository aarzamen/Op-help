import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary. Catches render/lifecycle throws (e.g. an unexpected
 * state in a deeply nested view) so a single failure doesn't white-screen the whole
 * app with no recovery. User notes live in localStorage and survive a reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: '#1A1A1A',
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>SOMETHING WENT WRONG</div>
          <div style={{ fontSize: 12, opacity: 0.8, maxWidth: 320, lineHeight: 1.5 }}>
            The app hit an unexpected error. Your saved notes are still stored in this browser.
          </div>
          <button
            onClick={this.handleReload}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              padding: '8px 16px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#2D6A4F',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
