import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 9999 }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast show align-items-center text-white bg-${
              toast.type === 'error'
                ? 'danger'
                : toast.type === 'success'
                ? 'success'
                : toast.type === 'warning'
                ? 'warning text-dark'
                : 'primary'
            } border-0 mb-2 shadow`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <i
                  className={`bi bi-${
                    toast.type === 'error'
                      ? 'exclamation-octagon-fill'
                      : toast.type === 'success'
                      ? 'check-circle-fill'
                      : toast.type === 'warning'
                      ? 'exclamation-triangle-fill'
                      : 'info-circle-fill'
                  }`}
                ></i>
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => removeToast(toast.id)}
              ></button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
