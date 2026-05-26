import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{ style: { border: '1px solid #E2E8F0', padding: '10px 14px', fontSize: 14, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' } }} />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
