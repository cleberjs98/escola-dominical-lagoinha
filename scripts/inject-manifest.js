const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const FILES_TO_COPY = [
  {
    from: path.join(PUBLIC_DIR, 'manifest.json'),
    to: path.join(DIST_DIR, 'manifest.json'),
    label: 'manifest.json',
  },
  {
    from: path.join(ROOT_DIR, 'assets', 'images', 'pwa-icon-192.png'),
    to: path.join(DIST_DIR, 'pwa-icon-192.png'),
    label: 'pwa-icon-192.png',
  },
  {
    from: path.join(ROOT_DIR, 'assets', 'images', 'pwa-icon-512.png'),
    to: path.join(DIST_DIR, 'pwa-icon-512.png'),
    label: 'pwa-icon-512.png',
  },
];

const TAGS = [
  { test: 'rel="manifest"', tag: '<link rel="manifest" href="/manifest.json" />' },
  { test: 'rel="icon"', tag: '<link rel="icon" href="/pwa-icon-192.png" />' },
  { test: 'rel="apple-touch-icon"', tag: '<link rel="apple-touch-icon" href="/pwa-icon-192.png" />' },
  { test: 'name="theme-color"', tag: '<meta name="theme-color" content="#7A1422" />' },
];

function collectHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

for (const { from, to, label } of FILES_TO_COPY) {
  if (!fs.existsSync(from)) {
    console.warn(`Skipping copy: source not found ${from}`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`Copied ${label} to dist.`);
}

const htmlFiles = collectHtmlFiles(DIST_DIR);
let updated = 0;

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  const missing = TAGS.filter(({ test }) => !html.includes(test));

  if (!missing.length) continue;

  if (!/<head[^>]*>/i.test(html)) {
    console.warn(`Skipping ${file} because <head> tag was not found.`);
    continue;
  }

  const inject = missing.map(({ tag }) => `    ${tag}`).join('\n');
  html = html.replace(/<head([^>]*)>/i, match => `${match}\n${inject}`);
  fs.writeFileSync(file, html, 'utf8');
  updated += 1;
}

console.log(`Injected manifest meta into ${updated}/${htmlFiles.length} HTML files.`);
