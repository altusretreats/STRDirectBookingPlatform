import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './admin.css';
import 'material-symbols/outlined.css';

// Material Symbols render as ligature text (e.g. "wifi") until the self-hosted
// font loads; keep glyphs invisible until then so raw words never flash.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => document.documentElement.classList.add('symbols-ready'));
} else {
  document.documentElement.classList.add('symbols-ready');
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider><App /></AuthProvider>
  </React.StrictMode>
);
