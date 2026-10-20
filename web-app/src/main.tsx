import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled with the app, never loaded from a font CDN.
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/public-sans';
import '@fontsource/jetbrains-mono/400.css';
import './styles/index.css';
import App from './App';
import { ErrorBoundary } from './components/shell/ErrorBoundary';

/**
 * Last-resort error display: if anything fails outside React's own error handling
 * (a script error, a failed promise), show it on screen instead of leaving a blank page.
 * Plain DOM with inline colors, so it works even if the app's styles never loaded.
 * Shows only the error text, never any export data.
 */
function showFatal(message: string) {
  let box = document.getElementById('fatal-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fatal-error';
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-height:45vh;overflow:auto;padding:16px;border-radius:12px;background:#2a1215;color:#ffe4e4;border:1px solid #d03b3b;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap';
    const title = document.createElement('div');
    title.textContent = 'Footprint hit an error. Please share this message so it can be fixed:';
    title.style.cssText = 'font:600 14px system-ui,sans-serif;margin-bottom:8px';
    box.appendChild(title);
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.textContent = message;
  box.appendChild(line);
}
window.addEventListener('error', (e) => showFatal(`${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`));
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  showFatal(`Unhandled: ${r instanceof Error ? `${r.name}: ${r.message}` : String(r)}`);
});

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error) => showFatal(`Page error: ${error instanceof Error ? `${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 4).join('\n')}` : String(error)}`),
}).render(
  <StrictMode>
    <ErrorBoundary onReset={() => location.reload()}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
