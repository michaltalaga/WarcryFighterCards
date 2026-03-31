import fs from 'node:fs/promises'
import path from 'node:path'
import { readWarcryAbilitiesFromFile } from '../src/data/warcryAbilityFile.ts'
import {
  findMissingAbilityTranslations,
  toTranslationRelativePath,
  type MissingAbilityTranslation,
  type WarcryAbilityTranslation,
} from '../src/i18n/abilityTranslationCoverage.ts'

export type AbilityFileReport = {
  sourceRelativePath: string
  translationRelativePath: string
  translationFileExists: boolean
  totalSourceAbilities: number
  missingTranslations: MissingAbilityTranslation[]
  translationReadError: string | null
}

const root = process.cwd()
const sourceRootDir = path.join(root, 'public', 'warcry_data')
const translationRootDir = path.join(root, 'public', 'warcry_i18n', 'pl')

function asStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function toPosixPath(filePath: string): string {
  return filePath.replaceAll('\\', '/')
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function collectAbilityFiles(currentDir: string): Promise<string[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      const childFiles = await collectAbilityFiles(fullPath)
      files.push(...childFiles)
      continue
    }

    if (entry.isFile() && entry.name.endsWith('_abilities.json')) {
      files.push(fullPath)
    }
  }

  return files
}

async function readTranslationFile(file: string): Promise<WarcryAbilityTranslation[]> {
  const rawText = await fs.readFile(file, 'utf8')
  const payload = JSON.parse(rawText) as unknown

  if (!Array.isArray(payload)) {
    throw new Error('Expected top-level translation JSON array')
  }

  return payload.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return []
    }

    const record = entry as Record<string, unknown>
    const id = record._id

    if (typeof id !== 'string' || id.trim().length === 0) {
      return []
    }

    return [
      {
        _id: id,
        name: asStringOrEmpty(record.name),
        description: asStringOrEmpty(record.description),
        sourceName: typeof record.sourceName === 'string' ? record.sourceName : undefined,
        sourceDescription: typeof record.sourceDescription === 'string' ? record.sourceDescription : undefined,
      },
    ]
  })
}

function normalizeSourceRelativePath(sourceRelativePath: string): string {
  let normalized = toPosixPath(sourceRelativePath).trim()

  normalized = normalized.replace(/^\.\/+/, '')
  normalized = normalized.replace(/^public\/warcry_data\/+/, '')

  if (!normalized.startsWith('data/')) {
    throw new Error(`Expected source ability path under data/: ${sourceRelativePath}`)
  }

  if (!normalized.endsWith('_abilities.json')) {
    throw new Error(`Expected source ability filename ending with _abilities.json: ${sourceRelativePath}`)
  }

  return normalized
}

export function installPipeFriendlyStdoutHandler(): void {
  process.stdout.on('error', (error) => {
    if (error.code === 'EPIPE') {
      process.exit(0)
    }

    throw error
  })
}

export function getExpectedTranslationPublicPath(translationRelativePath: string): string {
  return toPosixPath(path.join('public', 'warcry_i18n', 'pl', translationRelativePath))
}

export function sortReportsByMissingCount(reports: AbilityFileReport[]): AbilityFileReport[] {
  return [...reports].sort((left, right) => {
    const missingDiff = right.missingTranslations.length - left.missingTranslations.length
    if (missingDiff !== 0) {
      return missingDiff
    }

    return left.sourceRelativePath.localeCompare(right.sourceRelativePath)
  })
}

export async function buildReport(): Promise<AbilityFileReport[]> {
  const sourceFiles = await collectAbilityFiles(path.join(sourceRootDir, 'data'))
  sourceFiles.sort((left, right) => left.localeCompare(right))

  const reports: AbilityFileReport[] = []

  for (const sourceFile of sourceFiles) {
    const sourceRelativePath = toPosixPath(path.relative(sourceRootDir, sourceFile))
    reports.push(await buildReportForSourceRelativePath(sourceRelativePath))
  }

  return reports
}

export async function buildReportForSourceRelativePath(sourceRelativePath: string): Promise<AbilityFileReport> {
  const normalizedSourceRelativePath = normalizeSourceRelativePath(sourceRelativePath)
  const sourceFile = path.join(sourceRootDir, normalizedSourceRelativePath)
  const translationRelativePath = toTranslationRelativePath(normalizedSourceRelativePath)
  const translationFile = path.join(translationRootDir, translationRelativePath)
  const sourceAbilities = await readWarcryAbilitiesFromFile(sourceFile)

  let translatedAbilities: WarcryAbilityTranslation[] | null = null
  let translationReadError: string | null = null
  const translationFileExists = await exists(translationFile)

  if (translationFileExists) {
    try {
      translatedAbilities = await readTranslationFile(translationFile)
    } catch (error) {
      translationReadError = error instanceof Error ? error.message : 'Unknown translation read error'
    }
  }

  return {
    sourceRelativePath: normalizedSourceRelativePath,
    translationRelativePath,
    translationFileExists,
    totalSourceAbilities: sourceAbilities.length,
    missingTranslations: findMissingAbilityTranslations(sourceAbilities, translatedAbilities),
    translationReadError,
  }
}
