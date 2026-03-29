import type { ImportedRoster } from '../import/warcrierImport'
import type { WarcryFighter } from '../types/warcry'

export type SelectedRosterFighter = {
  fighter: WarcryFighter
  quantity: number
}

export type RosterSelectionResult = {
  rosterName: string | null
  warband: string | null
  fighters: SelectedRosterFighter[]
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['".,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeDefaultCounts(fighters: WarcryFighter[], value: number): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const fighter of fighters) {
    counts[fighter._id] = value
  }
  return counts
}

function findBestFighterMatch(
  fighters: WarcryFighter[],
  normalizedToFighter: Map<string, WarcryFighter>,
  rosterName: string,
): WarcryFighter | null {
  const normalizedRosterName = normalizeText(rosterName)
  const exactMatch = normalizedToFighter.get(normalizedRosterName)
  if (exactMatch) {
    return exactMatch
  }

  const looseMatches = fighters.filter((fighter) => {
    const normalizedFighterName = normalizeText(fighter.name)
    return (
      normalizedFighterName.includes(normalizedRosterName) ||
      normalizedRosterName.includes(normalizedFighterName)
    )
  })

  if (looseMatches.length === 0) {
    return null
  }

  looseMatches.sort((a, b) => {
    const aLengthDiff = Math.abs(a.name.length - rosterName.length)
    const bLengthDiff = Math.abs(b.name.length - rosterName.length)
    return aLengthDiff - bLengthDiff
  })

  return looseMatches[0]
}

export function buildRosterSelection(
  fighters: WarcryFighter[],
  importedRoster: ImportedRoster,
): RosterSelectionResult {
  const countsByFighterId = makeDefaultCounts(fighters, 0)
  const normalizedToFighter = new Map<string, WarcryFighter>()

  for (const fighter of fighters) {
    normalizedToFighter.set(normalizeText(fighter.name), fighter)
  }

  for (const rosterFighter of importedRoster.fighters) {
    const matchedFighter = findBestFighterMatch(fighters, normalizedToFighter, rosterFighter.name)
    if (!matchedFighter) {
      continue
    }

    countsByFighterId[matchedFighter._id] += 1
  }

  const selectedFighters: SelectedRosterFighter[] = []
  for (const fighter of fighters) {
    const quantity = countsByFighterId[fighter._id] ?? 0
    if (quantity > 0) {
      selectedFighters.push({ fighter, quantity })
    }
  }

  return {
    rosterName: importedRoster.rosterName,
    warband: importedRoster.warband,
    fighters: selectedFighters,
  }
}
