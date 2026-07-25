import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import './Toast.css';
import { CloseIcon } from './Icons';

const ToastContext = createContext(null);

let _showToastFn = null;

/** Call from anywhere: showToast('message', 'success'|'error'|'info') */
export function showToast(message, type = 'info') {
  if (_showToastFn) _showToastFn(message, type);
}

export function ToastProvider({ children }) {
  return <>{children}</>;
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    _showToastFn = addToast;
    return () => { _showToastFn = null; };
  }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type} animate-fade-in-up`}>
          <span>{toast.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}><CloseIcon size={13} /></button>
        </div>
      ))}
    </div>
  );
}
