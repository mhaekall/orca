const fs = require('fs');
const path = require('path');
const APP_DIR = path.join(__dirname, 'app');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const runtimeRegex = /export const runtime = ['"]edge['"];/g;

walk(APP_DIR, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.match(runtimeRegex)) {
      console.log('Found in', filePath);
      const replaced = content.replace(runtimeRegex, '/* MASKED */');
      if (replaced.includes('export const runtime')) {
        console.log('Still has export const runtime:', replaced.split('\n').filter(l => l.includes('export const runtime')));
      }
    }
  }
});
