import React from 'react';
import { createRoot } from 'react-dom/client';
import "bootstrap/dist/css/bootstrap.min.css";
import App from './components/App';
import "./index.css";
import { QueryClientProvider, QueryClient } from 'react-query';

// import Modal from 'react-modal'
// Modal.setAppElement('#root')

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const queryClient = new QueryClient();
const root = createRoot(container as HTMLElement);

root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>
)


