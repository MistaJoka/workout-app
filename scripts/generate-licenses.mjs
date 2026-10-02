// Generates src/presentation/legal/licenses.generated.json for the
// in-app /licenses screen: one entry per production runtime dependency
// (license field + LICENSE file text, when present), walked recursively
// from the package.json "dependencies" of each of this app's own runtime
// deps — never devDependencies/peerDependencies, since those never ship
// in the built app. Also records content credits that aren't npm packages
// (free-exercise-db data, FitnessTrack behavior) per
// docs/rnd/foss-fitness/LICENSE_REGISTER.md.
//
// Usage: node scripts/generate-licenses.mjs  (npm run generate:licenses)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// The app's own direct runtime dependencies (package.json "dependencies"),
// not devDependencies. Everything else in the output is pulled in by
// walking each of these packages' own "dependencies" recursively.
const ROOT_PACKAGES = [
  'react',
  'react-dom',
  'react-router-dom',
  'dexie',
  'zod',
  '@capacitor/core',
  '@capacitor/android',
  '@fontsource-variable/nunito',
]

const LICENSE_FILE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT', 'COPYING', 'COPYING.md']

function findPackageDir(name, startDir) {
  let dir = startDir
  for (;;) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function readLicenseText(pkgDir) {
  let entries
  try {
    entries = readdirSync(pkgDir)
  } catch {
    return null
  }
  for (const fileName of LICENSE_FILE_NAMES) {
    const match = entries.find((entry) => entry.toLowerCase() === fileName.toLowerCase())
    if (match) {
      try {
        return readFileSync(join(pkgDir, match), 'utf8')
      } catch {
        return null
      }
    }
  }
  return null
}

function licenseIdFrom(pkgJson) {
  if (typeof pkgJson.license === 'string') return pkgJson.license
  if (pkgJson.license && typeof pkgJson.license === 'object' && pkgJson.license.type) return pkgJson.license.type
  if (Array.isArray(pkgJson.licenses) && pkgJson.licenses.length > 0) {
    return pkgJson.licenses.map((entry) => entry.type ?? entry).join(' OR ')
  }
  return null
}

function homepageFrom(pkgJson) {
  if (typeof pkgJson.homepage === 'string') return pkgJson.homepage
  const repo = pkgJson.repository
  if (typeof repo === 'string') return repo
  if (repo && typeof repo === 'object' && typeof repo.url === 'string') return repo.url
  return null
}

function collectPackages() {
  /** @type {Map<string, { name: string, version: string, license: string | null, licenseText: string | null, homepage: string | null }>} */
  const collected = new Map()
  const queue = ROOT_PACKAGES.map((name) => ({ name, fromDir: ROOT }))

  while (queue.length > 0) {
    const { name, fromDir } = queue.shift()
    if (collected.has(name)) continue
    const pkgDir = findPackageDir(name, fromDir)
    if (!pkgDir) {
      console.warn(`generate:licenses — could not resolve "${name}" from ${fromDir}; skipping`)
      continue
    }
    const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
    collected.set(name, {
      name,
      version: pkgJson.version ?? 'unknown',
      license: licenseIdFrom(pkgJson),
      licenseText: readLicenseText(pkgDir),
      homepage: homepageFrom(pkgJson),
    })
    const deps = pkgJson.dependencies ?? {}
    for (const depName of Object.keys(deps)) {
      queue.push({ name: depName, fromDir: pkgDir })
    }
  }

  return Array.from(collected.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// Content that isn't an npm package, but still carries a license/credit
// obligation per docs/rnd/foss-fitness/LICENSE_REGISTER.md.
const CONTENT_CREDITS = [
  {
    name: 'free-exercise-db',
    attribution: 'yuhonas/free-exercise-db',
    license: 'Unlicense',
    note:
      'Exercise names, instructions and photos used by the in-app exercise library come from this public-domain ' +
      'dataset, which itself credits its imagery to wrkout/exercises.json.',
    homepage: 'https://github.com/yuhonas/free-exercise-db',
  },
  {
    name: 'FitnessTrack',
    attribution: 'Gman0909/FitnessTrack',
    license: 'MIT',
    note:
      "This app's double-progression logic is an independent implementation adapted from the behavior of " +
      'FitnessTrack, not copied source code.',
    homepage: 'https://github.com/Gman0909/FitnessTrack',
  },
]

function main() {
  const packages = collectPackages()
  const output = {
    generatedAt: new Date().toISOString(),
    packages,
    contentCredits: CONTENT_CREDITS,
  }
  const outDir = join(ROOT, 'src', 'presentation', 'legal')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'licenses.generated.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
  console.log(`generate:licenses — wrote ${packages.length} packages to ${outPath}`)
}

main()
