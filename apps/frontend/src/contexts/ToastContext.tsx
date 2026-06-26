import { createContext, useContext, createSignal, For, JSX } from 'solid-js';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toasts: () => Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>();

export function ToastProvider(props: { children: JSX.Element }) {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {props.children}
      
      {/* Toast Portal Container */}
      <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <For each={toasts()}>
          {(toast) => (
            <div
              class={`p-4 rounded-lg shadow-lg text-white font-medium transition-all duration-300 transform translate-x-0 pointer-events-auto flex items-center justify-between border ${
                toast.type === 'success'
                  ? 'bg-emerald-600 border-emerald-500'
                  : toast.type === 'error'
                  ? 'bg-rose-600 border-rose-500'
                  : 'bg-blue-600 border-blue-500'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                class="ml-4 text-white hover:text-gray-200 focus:outline-none"
                aria-label="Tutup notifikasi"
              >
                &times;
              </button>
            </div>
          )}
        </For>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
