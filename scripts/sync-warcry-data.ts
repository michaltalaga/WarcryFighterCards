import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

type WarbandEntry = {
  key: string
  grandAlliance: string
  warbandSlug: string
  fightersPath: string
  abilitiesPath: string
}

const root = process.cwd()
const sourceRepoDir = path.join(root, '_warcry_data_source')
const sourceDataDir = path.join(sourceRepoDir, 'data')
const targetRootDir = path.join(root, 'public', 'warcry_data')
const targetDataDir = path.join(targetRootDir, 'data')
const sourceRepoUrl = process.env.WARCRY_DATA_REPO_URL ?? 'https://github.com/krisling049/warcry_data.git'
const assetsRepoDir = path.join(root, '_warcry_card_creator_source')
const assetsTargetRootDir = path.join(root, 'public', 'warcry_assets')
const assetsRepoUrl =
  process.env.WARCRY_CARD_CREATOR_REPO_URL ?? 'https://github.com/barrysheppard/warcry-card-creator.git'
const assetsSubdirs = ['assets', 'runemarks']

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
    })

    proc.on('error', reject)
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code ?? 'unknown'})`))
    })
  })
}

async function hasGitRepoMetadata(repoDir: string): Promise<boolean> {
  return exists(path.join(repoDir, '.git'))
}

async function ensureGitRepoUpToDate(repoDir: string, repoUrl: string, label: string): Promise<void> {
  if (!(await exists(repoDir))) {
    console.log(`Cloning ${label} repository into ${repoDir}`)
    await runCommand('git', ['clone', '--depth', '1', repoUrl, repoDir], root)
    return
  }

  if (!(await hasGitRepoMetadata(repoDir))) {
    throw new Error(
      `Expected ${repoDir} to be a git repository. Remove it and rerun sync-data to re-clone.`,
    )
  }

  console.log(`Pulling latest ${label} in ${repoDir}`)
  await runCommand('git', ['-C', repoDir, 'pull', '--ff-only'], root)
}

async function copyDirectory(sourceDir: string, destinationDir: string): Promise<void> {
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

async function collectWarbandEntries(currentDir: string): Promise<WarbandEntry[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)

  const fightersFile = files.find((name) => name.endsWith('_fighters.json'))
  const abilitiesFile = files.find((name) => name.endsWith('_abilities.json'))

  const out: WarbandEntry[] = []

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

async function syncCreatorAssets(): Promise<void> {
  await fs.rm(assetsTargetRootDir, { recursive: true, force: true })
  await fs.mkdir(assetsTargetRootDir, { recursive: true })

  let copiedCount = 0

  for (const subdir of assetsSubdirs) {
    const sourceDir = path.join(assetsRepoDir, subdir)
    if (!(await exists(sourceDir))) {
      continue
    }

    const destinationDir = path.join(assetsTargetRootDir, subdir)
    await copyDirectory(sourceDir, destinationDir)
    copiedCount += 1
  }

  console.log(`Synced ${copiedCount}/${assetsSubdirs.length} asset directories to public/warcry_assets`)
}

async function main(): Promise<void> {
  await ensureGitRepoUpToDate(sourceRepoDir, sourceRepoUrl, 'warcry data')
  await ensureGitRepoUpToDate(assetsRepoDir, assetsRepoUrl, 'warcry card creator assets')

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

  await syncCreatorAssets()

  console.log(`Synced ${warbands.length} warbands to public/warcry_data`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})