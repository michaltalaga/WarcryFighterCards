import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceDataDir = path.join(root, '_warcry_data_source', 'data')
const targetRootDir = path.join(root, 'public', 'warcry_data')
const targetDataDir = path.join(targetRootDir, 'data')

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function copyDirectory(sourceDir, destinationDir) {
  await fs.mkdir(destinationDir, { recursive: true })
  const entries = await fs.readdir(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    const destinationPath = path.join(destinationDir, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath)
      continue
    }

    await fs.copyFile(sourcePath, destinationPath)
  }
}

async function collectWarbandEntries(currentDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)

  const fightersFile = files.find((name) => name.endsWith('_fighters.json'))
  const abilitiesFile = files.find((name) => name.endsWith('_abilities.json'))

  const out = []

  if (fightersFile && abilitiesFile) {
    const relative = path.relative(sourceDataDir, currentDir)
    const segments = relative.split(path.sep)

    if (segments.length >= 2) {
      const grandAlliance = segments[0]
      const warbandSlug = segments[1]

      out.push({
        key: `${grandAlliance}/${warbandSlug}`,
        grandAlliance,
        warbandSlug,
        fightersPath: `/warcry_data/data/${segments.join('/')}/${fightersFile}`,
        abilitiesPath: `/warcry_data/data/${segments.join('/')}/${abilitiesFile}`,
      })
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const childDir = path.join(currentDir, entry.name)
    const childEntries = await collectWarbandEntries(childDir)
    out.push(...childEntries)
  }

  return out
}

async function main() {
  if (!(await exists(sourceDataDir))) {
    throw new Error(`Source data directory not found: ${sourceDataDir}`)
  }

  await fs.rm(targetRootDir, { recursive: true, force: true })
  await copyDirectory(sourceDataDir, targetDataDir)

  const warbands = await collectWarbandEntries(sourceDataDir)
  warbands.sort((a, b) => a.key.localeCompare(b.key))

  await fs.writeFile(
    path.join(targetRootDir, 'manifest.json'),
    JSON.stringify({ warbands }, null, 2),
    'utf8',
  )

  console.log(`Synced ${warbands.length} warbands to public/warcry_data`) 
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
