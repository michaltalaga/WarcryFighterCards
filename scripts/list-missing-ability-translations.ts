import fs from 'node:fs/promises'
import path from 'node:path'
import { readWarcryAbilitiesFromFile } from '../src/data/warcryAbilityFile.ts'
import {
  findMissingAbilityTranslations,
  toTranslationRelativePath,
  type WarcryAbilityTranslation,
} from '../src/i18n/abilityTranslationCoverage.ts'

type AbilityFileReport = {
  sourceRelativePath: string
  translationRelativePath: string
  translationFileExists: boolean
  totalSourceAbilities: number
  missingTranslations: ReturnType<typeof findMissingAbilityTranslations>
  translationReadError: string | null
}

const root = process.cwd()
const sourceRootDir = path.join(root, 'public', 'warcry_data')
const translationRootDir = path.join(root, 'public', 'warcry_i18n', 'pl')

process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') {
    process.exit(0)
  }

  throw error
})

function asStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toPosixPath(filePath: string): string {
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

function formatMissingFields(missingName: boolean, missingDescription: boolean): string {
  const fields: string[] = []

  if (missingName) {
    fields.push('name')
  }

  if (missingDescription) {
    fields.push('description')
  }

  return fields.join(', ')
}

async function buildReport(): Promise<AbilityFileReport[]> {
  const sourceFiles = await collectAbilityFiles(path.join(sourceRootDir, 'data'))
  sourceFiles.sort((left, right) => left.localeCompare(right))

  const reports: AbilityFileReport[] = []

  for (const sourceFile of sourceFiles) {
    const sourceRelativePath = toPosixPath(path.relative(sourceRootDir, sourceFile))
    const translationRelativePath = toTranslationRelativePath(sourceRelativePath)
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

    reports.push({
      sourceRelativePath,
      translationRelativePath,
      translationFileExists,
      totalSourceAbilities: sourceAbilities.length,
      missingTranslations: findMissingAbilityTranslations(sourceAbilities, translatedAbilities),
      translationReadError,
    })
  }

  return reports
}

function printReport(reports: AbilityFileReport[]): void {
  const sourceFileCount = reports.length
  const sourceAbilityCount = reports.reduce((sum, report) => sum + report.totalSourceAbilities, 0)
  const missingFileCount = reports.filter((report) => !report.translationFileExists).length
  const errorCount = reports.filter((report) => report.translationReadError !== null).length
  const missingEntryCount = reports.reduce((sum, report) => sum + report.missingTranslations.length, 0)
  const missingNameCount = reports.reduce(
    (sum, report) => sum + report.missingTranslations.filter((entry) => entry.missingName).length,
    0,
  )
  const missingDescriptionCount = reports.reduce(
    (sum, report) => sum + report.missingTranslations.filter((entry) => entry.missingDescription).length,
    0,
  )

  console.log('Missing Polish ability translations')
  console.log(`Source ability files checked: ${sourceFileCount}`)
  console.log(`Source abilities checked: ${sourceAbilityCount}`)
  console.log(`Missing translation files: ${missingFileCount}`)
  console.log(`Unreadable translation files: ${errorCount}`)
  console.log(`Abilities with missing translated fields: ${missingEntryCount}`)
  console.log(`Missing names: ${missingNameCount}`)
  console.log(`Missing descriptions: ${missingDescriptionCount}`)

  const reportsWithMissing = reports.filter(
    (report) => report.translationReadError !== null || report.missingTranslations.length > 0,
  )

  if (reportsWithMissing.length === 0) {
    console.log('')
    console.log('All Polish ability translations are present.')
    return
  }

  for (const report of reportsWithMissing) {
    console.log('')
    console.log(`Source: ${report.sourceRelativePath}`)
    console.log(`Expected translation: ${toPosixPath(path.join('public', 'warcry_i18n', 'pl', report.translationRelativePath))}`)

    if (!report.translationFileExists) {
      console.log('Status: translation file is missing')
    }

    if (report.translationReadError) {
      console.log(`Status: translation file could not be read (${report.translationReadError})`)
    }

    for (const missing of report.missingTranslations) {
      console.log(`- ${missing._id} | ${missing.sourceName} | missing: ${formatMissingFields(missing.missingName, missing.missingDescription)}`)
    }
  }
}

async function main(): Promise<void> {
  const reports = await buildReport()
  printReport(reports)

  const hasMissingTranslations = reports.some(
    (report) => report.translationReadError !== null || report.missingTranslations.length > 0,
  )

  if (hasMissingTranslations) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
