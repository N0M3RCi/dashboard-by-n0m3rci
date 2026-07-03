import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/GlobalToast'
import ErrorBoundary from './components/ErrorBoundary'

// Global error handlers — catch uncaught JS errors and report them
window.onerror = (message, source, lineno, colno, error) => {
  try {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass-no-password' },
      body: JSON.stringify({
        message: typeof message === 'string' ? message : (error?.message || 'Uncaught error'),
        source: 'client',
        details: { stack: error?.stack || '', url: source || window.location.href, line: lineno, col: colno }
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
};

window.onunhandledrejection = (event) => {
  const err = event.reason;
  try {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass-no-password' },
      body: JSON.stringify({
        message: err?.message || err?.toString() || 'Unhandled Promise rejection',
        source: 'client',
        details: { stack: err?.stack || '', url: window.location.href }
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)