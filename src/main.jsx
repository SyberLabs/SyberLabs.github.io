import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// index.html ships a prerendered copy of this page (scripts/prerender.mjs) so
// crawlers and applicant-tracking tools that do not run JavaScript can read it.
createRoot(document.getElementById('root')).render(<App />);
