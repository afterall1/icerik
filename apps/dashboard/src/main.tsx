/**
 * Dashboard Application Entry Point
 * 
 * Sets up React Query provider and global error handling.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, ToastProvider } from './components/atoms';
import './index.css';
import App from './App.tsx';

/**
 * Configure React Query client
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on error by default (can be overridden per query)
      retry: 1,
      // Consider data stale after 1 minute
      staleTime: 60 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * Global error handler for uncaught errors
 */
function handleGlobalError(error: Error, errorInfo: React.ErrorInfo): void {
  console.error('Global error caught:', error, errorInfo);
  // Could send to error tracking service here
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary onError={handleGlobalError} showDetails={import.meta.env.DEV}>
          <App />
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
);
