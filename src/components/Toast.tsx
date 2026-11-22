import React from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type?: 'success' | 'warning' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-medium border animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'warning'
              ? 'bg-[#ba1a1a] text-white border-red-800'
              : toast.type === 'info'
              ? 'bg-[#0e1c2f] text-white border-slate-700'
              : 'bg-[#0e1c2f] text-white border-[#009299]/40'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] text-[#009299]">
            {toast.type === 'warning' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span className="flex-1">{toast.text}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-gray-400 hover:text-white p-0.5 ml-2"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
