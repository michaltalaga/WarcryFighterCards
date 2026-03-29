export type ImportedFighter = {
  name: string
}

export type ImportedRoster = {
  rosterName: string | null
  warband: string | null
  fighters: ImportedFighter[]
}

export function extractDelimitedContent(input: string): string {
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
  const match = withoutBullet.match(/^(.+?)(?:\s+\([^)]*\))?$/)
  if (!match) {
    return null
  }

  const name = match[1].trim()
  return { name }
}

export function parseWarcrierRoster(input: string): ImportedRoster {
  const lines = cleanLines(input)

  let rosterName: string | null = null
  let warband: string | null = null

  const fighters: ImportedFighter[] = []

  for (const line of lines) {
    if (line.startsWith('"') && line.endsWith('"')) {
      rosterName = line.slice(1, -1).trim()
      continue
    }

    const fighter = parseFighterLine(line)
    if (fighter) {
      fighters.push(fighter)
      continue
    }

    if (!warband) {
      warband = line
    }
  }

  return {
    rosterName,
    warband,
    fighters,
  }
}