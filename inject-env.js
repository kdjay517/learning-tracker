// inject-env.js — runs at Netlify build time
// Reads env vars, injects Firebase config into index.html, copies to dist/

const fs   = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist');
if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

// Copy all files to dist/
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(__dirname, dist);

// Build config object from env vars
const config = {
  apiKey:            process.env.FIREBASE_API_KEY            || '',
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
  projectId:         process.env.FIREBASE_PROJECT_ID         || '',
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID|| '',
  appId:             process.env.FIREBASE_APP_ID             || ''
};

// Inject into dist/index.html replacing the placeholder comment
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const injection = '<script>window.__FIREBASE_CONFIG__ = ' + JSON.stringify(config) + ';</script>';
html = html.replace('<!-- FIREBASE_CONFIG_INJECT -->', injection);
fs.writeFileSync(indexPath, html);

console.log('Build complete. Firebase config injected from environment variables.');
