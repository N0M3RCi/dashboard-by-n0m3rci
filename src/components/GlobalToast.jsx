import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

// Toast context for global use
const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 6000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Listen for global show-toast events (dispatched from useApi hook)
  useEffect(() => {
    const handler = (e) => {
      const { message, type, duration } = e.detail;
      addToast(message, type || 'error', duration || 6000);
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const icons = {
    error: <AlertCircle size={16} className="text-danger shrink-0" />,
    success: <CheckCircle size={16} className="text-success shrink-0" />,
    warning: <AlertTriangle size={16} className="text-yellow-500 shrink-0" />,
    info: <Info size={16} className="text-primary shrink-0" />,
  };

  const borderColors = {
    error: 'border-l-danger',
    success: 'border-l-success',
    warning: 'border-l-yellow-500',
    info: 'border-l-primary',
  };

  return (
    <div
      className={`pointer-events-auto bg-surface-800 border border-border rounded-xl shadow-2xl border-l-4 ${borderColors[toast.type] || borderColors.error} p-3 flex items-start gap-3 transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      {icons[toast.type] || icons.error}
      <p className="text-xs text-text-primary flex-1 min-w-0 break-words leading-relaxed">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-text-muted hover:text-text-primary transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}