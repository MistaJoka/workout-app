import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

// Fills in public/sw.js's BUILD_ID and BUILD_ASSETS once dist/ is written,
// so the worker precaches every chunk (including the lazily-loaded library)
// at install — the app works offline after one visit, not only after the
// chunks happen to be fetched under the worker — and so every build changes
// the worker's bytes, which is what makes an installed PWA update.
function swBuildManifest(): Plugin {
  return {
    name: 'sw-build-manifest',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist')
      const assets = Object.keys(bundle)
        .filter((file) => !file.endsWith('.html') && !file.endsWith('.map'))
        .sort()
      const hash = createHash('sha256')
      hash.update(assets.join('\n'))
      // Public files that change without touching a chunk.
      for (const file of ['manifest.json', 'rae/loops.json']) hash.update(readFileSync(path.join(outDir, file)))
      const buildId = hash.digest('hex').slice(0, 12)

      const swPath = path.join(outDir, 'sw.js')
      const source = readFileSync(swPath, 'utf8')
      const stamped = source
        .replace("const BUILD_ID = 'dev'", `const BUILD_ID = '${buildId}'`)
        .replace('const BUILD_ASSETS = []', `const BUILD_ASSETS = ${JSON.stringify(assets)}`)
      if (!stamped.includes(buildId) || stamped.includes('const BUILD_ASSETS = []')) {
        throw new Error('sw-build-manifest: BUILD_ID/BUILD_ASSETS placeholders not found in dist/sw.js')
      }
      writeFileSync(swPath, stamped)
    },
  }
}

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string }

export default defineConfig({
  plugins: [react(), swBuildManifest()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_SHA__: JSON.stringify(gitSha()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // The exercise library is a deliberately separate, lazily-loaded chunk
    // (~1.4MB raw / ~185KB gzip); the default 500kB warning is noise here.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Third-party code (react/react-dom/react-router-dom/dexie/zod)
        // changes far less often than our own screens, and splitting it
        // out shrinks the one chunk every route needs regardless of
        // React.lazy. The service worker precaches every built chunk
        // either way (sw-build-manifest below), so this only changes how
        // the bytes are grouped, not whether they're all available offline.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
