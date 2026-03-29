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

    expect(result.rosterName).toBe('My Warband')
    expect(result.warband).toBe('Skaven')

    const byName: Record<string, number> = {}
    for (const fighter of result.fighters) {
      byName[fighter.name] = (byName[fighter.name] ?? 0) + 1
    }

    expect(byName['Clawlord on Gnaw-Beast']).toBe(1)
    expect(byName['Stormfiend with Doomflayer gauntlets']).toBe(1)
    expect(byName['Warplock Jezzail']).toBe(2)
    expect(byName['Clawleader']).toBeUndefined()
  })

  it('matches fighters when pasted names contain unicode dash variants', async () => {
    const importedRoster = {
      rosterName: 'My Warband',
      warband: 'Skaven',
      fighters: [
        { name: 'Clawlord on Gnaw−Beast' },
        { name: 'Stormfiend with Doomflayer gauntlets' },
        { name: 'Warplock Jezzail' },
      ],
    }

    const fighters = await readWarcryFightersFromFile(skavenFightersFile)
    const result = buildRosterSelection(fighters, importedRoster)

    const names = result.fighters.map((fighter) => fighter.name)
    expect(names).toContain('Clawlord on Gnaw-Beast')
    expect(names).toContain('Stormfiend with Doomflayer gauntlets')
    expect(names).toContain('Warplock Jezzail')
  })
})
