import {
  buildReport,
  getExpectedTranslationPublicPath,
  installPipeFriendlyStdoutHandler,
  sortReportsByMissingCount,
} from './ability-translation-report.ts'

installPipeFriendlyStdoutHandler()

function printReport(reports: Awaited<ReturnType<typeof buildReport>>): void {
  const sourceFileCount = reports.length
  const sourceAbilityCount = reports.reduce((sum, report) => sum + report.totalSourceAbilities, 0)
  const filesNeedingWork = reports.filter(
    (report) => report.translationReadError !== null || report.missingTranslations.length > 0,
  )
  const missingFileCount = reports.filter((report) => !report.translationFileExists).length
  const errorCount = reports.filter((report) => report.translationReadError !== null).length
  const missingEntryCount = reports.reduce((sum, report) => sum + report.missingTranslations.length, 0)

  console.log('Missing Polish ability translations')
  console.log(`Source ability files checked: ${sourceFileCount}`)
  console.log(`Source abilities checked: ${sourceAbilityCount}`)
  console.log(`Files needing translation work: ${filesNeedingWork.length}`)
  console.log(`Missing translation files: ${missingFileCount}`)
  console.log(`Unreadable translation files: ${errorCount}`)
  console.log(`Abilities with missing translated fields: ${missingEntryCount}`)

  if (filesNeedingWork.length === 0) {
    console.log('')
    console.log('All Polish ability translations are present.')
    return
  }

  console.log('')
  console.log('Files needing translation work, sorted by missing ability count:')

  for (const report of sortReportsByMissingCount(filesNeedingWork)) {
    const status = report.translationReadError
      ? `unreadable (${report.translationReadError})`
      : report.translationFileExists
        ? 'partial'
        : 'file missing'
    console.log(
      `- ${report.missingTranslations.length} missing | ${report.sourceRelativePath} | ${status} | ${getExpectedTranslationPublicPath(report.translationRelativePath)}`,
    )
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
