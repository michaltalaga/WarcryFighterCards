import {
  buildReportForSourceRelativePath,
  getExpectedTranslationPublicPath,
  installPipeFriendlyStdoutHandler,
} from './ability-translation-report.ts'

installPipeFriendlyStdoutHandler()

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

function getRequestedSourcePath(): string {
  const requestedPath = process.argv[2]

  if (!requestedPath) {
    throw new Error(
      'Usage: npm run translations:missing-file -- data/<grand_alliance>/<warband>/<warband>_abilities.json',
    )
  }

  return requestedPath
}

function printReport(report: Awaited<ReturnType<typeof buildReportForSourceRelativePath>>): void {
  const missingNameCount = report.missingTranslations.filter((entry) => entry.missingName).length
  const missingDescriptionCount = report.missingTranslations.filter((entry) => entry.missingDescription).length

  console.log('Missing Polish ability translations for file')
  console.log(`Source: ${report.sourceRelativePath}`)
  console.log(`Expected translation: ${getExpectedTranslationPublicPath(report.translationRelativePath)}`)
  console.log(`Source abilities checked: ${report.totalSourceAbilities}`)
  console.log(`Abilities with missing translated fields: ${report.missingTranslations.length}`)
  console.log(`Missing names: ${missingNameCount}`)
  console.log(`Missing descriptions: ${missingDescriptionCount}`)

  if (!report.translationFileExists) {
    console.log('Status: translation file is missing')
  }

  if (report.translationReadError) {
    console.log(`Status: translation file could not be read (${report.translationReadError})`)
  }

  if (report.translationReadError === null && report.missingTranslations.length === 0) {
    console.log('')
    console.log('This file has no missing Polish translations.')
    return
  }

  console.log('')

  for (const missing of report.missingTranslations) {
    console.log(`- ${missing._id} | ${missing.sourceName} | missing: ${formatMissingFields(missing.missingName, missing.missingDescription)}`)
  }
}

async function main(): Promise<void> {
  const requestedPath = getRequestedSourcePath()
  const report = await buildReportForSourceRelativePath(requestedPath)
  printReport(report)

  const hasMissingTranslations = report.translationReadError !== null || report.missingTranslations.length > 0
  if (hasMissingTranslations) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
