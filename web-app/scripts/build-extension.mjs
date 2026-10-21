#!/usr/bin/env node
/**
 * Builds the Footprint browser extension into extension/dist (load it unpacked in Chrome or Edge,
 * or convert it for Safari with Xcode; see extension/README.md), plus a ZIP for the stores.
 *
 *   node scripts/build-extension.mjs           production build
 *   FOOTPRINT_TEST=1 node scripts/build-extension.mjs   test build: platform pages point at local stand-ins
 *
 * FOOTPRINT_APP_ORIGINS: comma-separated origins of the Footprint web app, where the small bridge
 * runs so the app can see the extension is installed (e.g. https://footprint.example).
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ext = resolve(root, 'extension');
const test = process.env.FOOTPRINT_TEST === '1';
const version = '0.4.0';
const out = resolve(ext, test ? 'dist-test' : 'dist');


const STAND_IN = 'http://localhost:4310';
const define = {
  ...(test ? { __FB_ORIGIN__: JSON.stringify(`${STAND_IN}/fb`), __AC_ORIGIN__: JSON.stringify(`${STAND_IN}/ac`) } : {}),
  ...(process.env.FOOTPRINT_APP_URL ? { __APP_URL__: JSON.stringify(process.env.FOOTPRINT_APP_URL) } : {}),
};
const appOrigins = (process.env.FOOTPRINT_APP_ORIGINS ?? (test ? 'http://localhost:4311' : 'https://footprint.example'))
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Background, page helper and bridge: one self-contained file each (no module loading needed).
for (const [name, entry] of [['background', 'src/background/index.ts'], ['content', 'src/content.ts'], ['bridge', 'src/bridge.ts']]) {
  await build({
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    define,
    build: {
      outDir: out,
      emptyOutDir: false,
      minify: !test,
      target: 'es2022',
      lib: { entry: resolve(ext, entry), formats: ['iife'], name: `footprint_${name}`, fileName: () => `${name}.js` },
    },
  });
}

// Screens: the toolbar popup and the full dashboard.
await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  root: resolve(ext, 'ui'),
  base: './',
  define,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: out,
    emptyOutDir: false,
    target: 'es2022',
    rollupOptions: { input: { popup: resolve(ext, 'ui/popup.html'), dashboard: resolve(ext, 'ui/dashboard.html') } },
  },
});

cpSync(resolve(ext, 'public'), out, { recursive: true });

const hosts = ['https://www.facebook.com/*', 'https://web.facebook.com/*', 'https://accountscenter.facebook.com/*', 'https://accountscenter.meta.com/*', 'https://www.instagram.com/*', 'https://accountscenter.instagram.com/*'];
const manifest = {
  manifest_version: 3,
  name: test ? 'Footprint (test build)' : 'Footprint: privacy scans',
  short_name: 'Footprint',
  version,
  description: 'Scan your social media privacy settings, fix what you approve, untag yourself and clear old posts. Your data stays in your browser.',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_popup: 'popup.html', default_title: 'Footprint', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  background: { service_worker: 'background.js' },
  // storage: results stay on this device. alarms: autoscans. scripting: read and change settings
  // on the platform's own pages when you ask. notifications: autoscan results (Chrome and Edge).
  permissions: ['storage', 'alarms', 'scripting', 'notifications'],
  host_permissions: test ? [...hosts, `${STAND_IN}/*`] : hosts,
  content_scripts: [{ matches: appOrigins.map((o) => `${o}/*`), js: ['bridge.js'], run_at: 'document_start' }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'" },
};
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2));

if (!test) {
  const zip = resolve(ext, `footprint-extension-${version}.zip`);
  rmSync(zip, { force: true });
  if (existsSync(out)) execSync(`cd "${out}" && zip -qr "${zip}" .`);
  // Offered from the Footprint app's extension page until the store listings are live.
  mkdirSync(resolve(root, 'public'), { recursive: true });
  cpSync(zip, resolve(root, 'public/footprint-extension.zip'));
  console.log(`Built extension/dist and ${zip}`);
} else {
  console.log('Built extension/dist-test');
}
