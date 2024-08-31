import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/app';
import '../css/index.css';

const container = document.getElementById('root');
const root = createRoot(container!);

try {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} catch (error) {
    console.error('Error rendering React app:', error);
    if (container) {
        container.innerHTML = '<h1>Error loading app. Check console for details.</h1>';
    }
}