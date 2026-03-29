import type { ImportedRoster } from '../import/warcrierImport'
import type { WarcryFighter } from '../types/warcry'

export type RosterSelectionResult = {
  rosterName: string | null
  warband: string | null
  fighters: WarcryFighter[]
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  const normalizedToFighter = new Map<string, WarcryFighter>()
  const selectedFighters: WarcryFighter[] = []

  for (const fighter of fighters) {
    normalizedToFighter.set(normalizeText(fighter.name), fighter)
  }

  for (const rosterFighter of importedRoster.fighters) {
    const matchedFighter = findBestFighterMatch(fighters, normalizedToFighter, rosterFighter.name)
    if (!matchedFighter) {
      continue
    }

    selectedFighters.push(matchedFighter)
  }

  return {
    rosterName: importedRoster.rosterName,
    warband: importedRoster.warband,
    fighters: selectedFighters,
  }
}
