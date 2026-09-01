import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Registers window.transitflowChip before anything renders — the desk reader
// calls it as soon as the page loads and should not have to wait for React.
import './tenant/chip';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
