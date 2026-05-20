'use client';

import { useEffect } from 'react';

export function ErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Log the full event and reason for debugging
      console.error('Unhandled promise rejection:', {
        reason: event.reason,
        message: event.reason?.message || 'No message provided',
        stack: event.reason?.stack,
        type: typeof event.reason,
        string: String(event.reason)
      });
      
      // Provide user-friendly error message
      if (event.reason?.message?.includes('Supabase')) {
        console.error('Supabase connection issue detected. Check your .env.local file and database connection.');
      }
      
      // Prevent the default browser behavior
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', {
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
} 