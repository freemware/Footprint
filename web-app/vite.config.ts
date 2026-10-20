import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { PRO } from './src/pro/config';

/**
 * Strict Content Security Policy, added to production builds only
 * (the dev server needs inline scripts and a websocket for hot reload).
 *
 * connect-src allows only the app itself, plus the Pro license service when PRO.LICENSE_API is
 * set. That service receives only a Stripe checkout id after a purchase, never export data.
 */
const licenseOrigin = (() => {
  try {
    return PRO.LICENSE_API ? new URL(PRO.LICENSE_API).origin : '';
  } catch {
    return '';
  }
})();

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // charts and animations set inline styles
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  `connect-src 'self'${licenseOrigin ? ` ${licenseOrigin}` : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    ),
});

/**
 * `vite build --mode single` packs the whole app (scripts, styles, fonts, place lists, the
 * import worker) into one HTML file. That copy works where a host page sandboxes the app so
 * strictly that it can't load its own separate files, and it's easy to save and open offline.
 * It skips the CSP meta tag, which would block its inline script; the host's own policy applies.
 */
export default defineConfig(({ mode }) => ({
  // Relative base so the build works from any folder, GitHub Pages, or opened offline.
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile({ removeViteModuleLoader: true })] : [cspPlugin()])],
  build: mode === 'single' ? { outDir: 'dist-single', chunkSizeWarningLimit: 20000 } : undefined,
}));
