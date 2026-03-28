import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0a0e1a', color: '#e8f4fd',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'monospace', padding: 40
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#ff4757', marginBottom: 16 }}>系统渲染异常</h2>
          <pre style={{
            background: '#0f1628', border: '1px solid rgba(255,71,87,0.3)',
            borderRadius: 8, padding: 20, maxWidth: 600, overflow: 'auto',
            color: '#ff6b35', fontSize: 13, lineHeight: 1.6
          }}>
            {(this.state.error as Error).message}
            {'\n'}
            {(this.state.error as Error).stack?.slice(0, 500)}
          </pre>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 24, padding: '10px 24px', background: '#00d4ff',
            color: '#0a0e1a', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 14, fontWeight: 600
          }}>
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
