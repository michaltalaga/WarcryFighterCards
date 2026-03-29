import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readWarcryFightersFromFile } from '../data/warcryFighterFile'
import { parseWarcrierRoster } from '../import/warcrierImport'
import { buildRosterSelection } from './rosterSelection'

const rosterFixture = fs.readFileSync(
  new URL('../import/__fixtures__/warcrier-roster.txt', import.meta.url),
  'utf8',
)

const skavenFightersFile = new URL(
  '../../public/warcry_data/data/chaos/skaven/skaven_fighters.json',
  import.meta.url,
)

describe('buildRosterSelection', () => {
  it('maps sample roster input to fighter selection counts end to end', async () => {
    const importedRoster = parseWarcrierRoster(rosterFixture)
    const fighters = await readWarcryFightersFromFile(skavenFightersFile)
    const result = buildRosterSelection(fighters, importedRoster)

    expect(importedRoster.rosterName).toBe('My Warband')
    expect(importedRoster.warband).toBe('Skaven')
    expect(result.matched).toBe(4)
    expect(result.unmatched).toEqual([])

    const byName: Record<string, number> = {}
    for (const fighter of fighters) {
      byName[fighter.name] = result.countsByFighterId[fighter._id] ?? 0
    }

    expect(byName['Clawlord on Gnaw-Beast']).toBe(1)
    expect(byName['Stormfiend with Doomflayer gauntlets']).toBe(1)
    expect(byName['Warplock Jezzail']).toBe(2)
    expect(byName['Clawleader']).toBe(0)
  })
})
