const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WEB_DIR = path.resolve(__dirname, '..');
const APP_DIR = path.join(WEB_DIR, 'app');

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
const dynamicRegex = /export const dynamic = ['"]force-dynamic['"];/g;
const revalRegex = /export const revalidate = 3600;/g;

console.log('[build-cap] Masking edge runtime and force-dynamic exports...');
walk(APP_DIR, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    if (content.match(runtimeRegex)) {
      content = content.replace(runtimeRegex, '/* export const runtime = "edge"; */');
      changed = true;
    }
    if (content.match(dynamicRegex)) {
      content = content.replace(dynamicRegex, '/* export const dynamic = "force-dynamic"; */');
      changed = true;
    }
    if (content.includes('export const revalidate = 3600;')) {
      content = content.replace(revalRegex, '/* export const revalidate = 3600; */');
      changed = true;
    }
    if (changed) fs.writeFileSync(filePath, content);
  }
});

console.log('[build-cap] Hiding dynamic API/Manifest routes...');
try { fs.renameSync(path.join(APP_DIR, 'api'), path.join(WEB_DIR, '.api_temp')); } catch (e) {}
try { fs.renameSync(path.join(APP_DIR, 'manifest.ts'), path.join(WEB_DIR, '.manifest_temp')); } catch (e) {}

let success = true;
try {
  console.log('[build-cap] Running CAPACITOR_BUILD=true next build...');
  execSync('CAPACITOR_BUILD=true npx next build', { stdio: 'inherit', cwd: WEB_DIR });
} catch (e) {
  console.error('[build-cap] Build failed!');
  success = false;
}

console.log('[build-cap] Restoring dynamic routes...');
try { fs.renameSync(path.join(WEB_DIR, '.api_temp'), path.join(APP_DIR, 'api')); } catch (e) {}
try { fs.renameSync(path.join(WEB_DIR, '.manifest_temp'), path.join(APP_DIR, 'manifest.ts')); } catch (e) {}

console.log('[build-cap] Restoring exports...');
walk(APP_DIR, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    if (content.includes('/* export const runtime = "edge"; */')) {
      content = content.replace(/\/\* export const runtime = "edge"; \*\//g, 'export const runtime = "edge";');
      changed = true;
    }
    if (content.includes('/* export const dynamic = "force-dynamic"; */')) {
      content = content.replace(/\/\* export const dynamic = "force-dynamic"; \*\//g, 'export const dynamic = "force-dynamic";');
      changed = true;
    }
    if (content.includes('/* export const revalidate = 3600; */')) {
      content = content.replace(/\/\* export const revalidate = 3600; \*\//g, 'export const revalidate = 3600;');
      changed = true;
    }
    if (changed) fs.writeFileSync(filePath, content);
  }
});

if (!success) {
  process.exit(1);
}
