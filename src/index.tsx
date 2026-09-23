import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { PreloadCache, PreloadProvider } from './data/preload';
import reportWebVitals from './reportWebVitals';

declare global {
  interface Window {
    /** The data scripts/prerender.js rendered this page with. */
    __ROGUEPOD_PRELOAD__?: PreloadCache;
  }
}

const container = document.getElementById('root') as HTMLElement;

const app = (
  <React.StrictMode>
    <PreloadProvider value={window.__ROGUEPOD_PRELOAD__ ?? {}}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PreloadProvider>
  </React.StrictMode>
);

/*
 * Hydrate only when the markup in #root was rendered for this exact path.
 * The home page's index.html is also what the 404.html redirect loads for any
 * path without a prerendered file, and hydrating the home page's markup as,
 * say, a brand-new episode would be a mismatch — so those get a fresh render.
 */
const normalise = (path: string) => path.replace(/\/+$/, '') || '/';
const renderedFor = container.dataset.prerendered;

if (renderedFor && normalise(renderedFor) === normalise(window.location.pathname)) {
  ReactDOM.hydrateRoot(container, app);
} else {
  ReactDOM.createRoot(container).render(app);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
