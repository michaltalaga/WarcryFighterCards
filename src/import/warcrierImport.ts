export type ImportedFighter = {
  name: string
  points: number | null
  tags: string[]
}

export type ImportedRoster = {
  rosterName: string | null
  warband: string | null
  totalPoints: number | null
  listedFighterCount: number | null
  isValid: boolean | null
  fighters: ImportedFighter[]
  fighterCounts: Record<string, number>
  source: string | null
}

const SUMMARY_LINE_REGEX = /^(\d+)\s*pts\s*\|\s*(\d+)\s*fighters\s*\|\s*valid\s*(✓)?\s*$/i

function extractDelimitedContent(input: string): string {
  const lines = input.split(/\r?\n/)
  const delimiterIndexes: number[] = []

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === '----------') {
      delimiterIndexes.push(i)
    }
  }

  if (delimiterIndexes.length < 2) {
    return input
  }

  const start = delimiterIndexes[0] + 1
  const end = delimiterIndexes[1]
  return lines.slice(start, end).join('\n')
}

function cleanLines(input: string): string[] {
  const content = extractDelimitedContent(input)
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function parseFighterLine(line: string): ImportedFighter | null {
  if (!line.startsWith('- ')) {
    return null
  }

  const withoutBullet = line.replace(/^[-]\s+/, '')
  const match = withoutBullet.match(/^(.+?)(?:\s+\(([^)]*)\))?$/)
  if (!match) {
    return null
  }

  const name = match[1].trim()
  const metadata = (match[2] ?? '').trim()
  if (!metadata) {
    return { name, points: null, tags: [] }
  }

  const segments = metadata
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  let points: number | null = null
  const tags: string[] = []

  for (const segment of segments) {
    const pointsMatch = segment.match(/^(\d+)\s*pts$/i)
    if (pointsMatch) {
      points = Number(pointsMatch[1])
      continue
    }
    tags.push(segment)
  }

  return { name, points, tags }
}

export function parseWarcrierRoster(input: string): ImportedRoster {
  const lines = cleanLines(input)

  let rosterName: string | null = null
  let warband: string | null = null
  let totalPoints: number | null = null
  let listedFighterCount: number | null = null
  let isValid: boolean | null = null
  let source: string | null = null

  const fighters: ImportedFighter[] = []
  const fighterCounts: Record<string, number> = {}

  for (const line of lines) {
    if (line.startsWith('"') && line.endsWith('"')) {
      rosterName = line.slice(1, -1).trim()
      continue
    }

    if (/^generated on\s+/i.test(line)) {
      source = line.replace(/^generated on\s+/i, '').trim()
      continue
    }

    const summaryMatch = line.match(SUMMARY_LINE_REGEX)
    if (summaryMatch) {
      totalPoints = Number(summaryMatch[1])
      listedFighterCount = Number(summaryMatch[2])
      isValid = Boolean(summaryMatch[3])
      continue
    }

    const fighter = parseFighterLine(line)
    if (fighter) {
      fighters.push(fighter)
      fighterCounts[fighter.name] = (fighterCounts[fighter.name] ?? 0) + 1
      continue
    }

    if (!warband) {
      warband = line
    }
  }

  return {
    rosterName,
    warband,
    totalPoints,
    listedFighterCount,
    isValid,
    fighters,
    fighterCounts,
    source,
  }
}