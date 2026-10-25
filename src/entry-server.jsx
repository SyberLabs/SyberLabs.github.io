import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import App from './App.jsx';
import { GitHitsPanel } from './githits-panel.jsx';

export function render() {
  return renderToString(<App />);
}

// The GitHits dependency totals for /stack/ (static: that page loads no React).
export function renderGitHits() {
  return renderToStaticMarkup(<GitHitsPanel />);
}
