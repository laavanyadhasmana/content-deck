import React, { createContext, useContext, useState } from 'react';
import { CheckCircle, ChromiumIcon, HamIcon, Inspect, JapaneseYenIcon, KeyIcon, XCircle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const Toast = ({ message, type, onClose }) => {
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border animate-slideIn ${
      type === 'success' 
        ? 'bg-green-500/20 border-green-500/50 text-green-300'
        : 'bg-red-500/20 border-red-500/50 text-red-300'
    }`}>
      <div className="flex items-center gap-3">
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast 
        message={toast.show ? toast.message : ''} 
        type={toast.type}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
b};