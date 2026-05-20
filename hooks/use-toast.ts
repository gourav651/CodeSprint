import { useState, useCallback } from 'react';

export interface Toast {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const { title, description, variant } = options;
    let type: Toast['type'] = 'info';
    if (variant === 'destructive' || variant === 'error') type = 'error';
    else if (variant === 'success') type = 'success';
    else type = 'info';
    showToast(`${title}${description ? ': ' + description : ''}`, type);
  }, [showToast]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, showToast, toast, removeToast };
} 