import { describe, expect, it } from 'vitest'
import { readWarcryFightersFromFile } from './warcryFighterFile'

const skavenFightersFile = new URL(
  '../../public/warcry_data/data/chaos/skaven/skaven_fighters.json',
  import.meta.url,
)

describe('readWarcryFightersFromFile', () => {
  it('reads skaven fighters into canonical WarcryFighter structure', async () => {
    const fighters = await readWarcryFightersFromFile(skavenFightersFile)

    expect(fighters.length).toBeGreaterThan(0)

    const clawlord = fighters.find((fighter) => fighter.name === 'Clawlord on Gnaw-Beast')
    expect(clawlord).toBeDefined()
    expect(clawlord?.warband).toBe('Skaven')
    expect(clawlord?.points).toBe(230)
    expect(Array.isArray(clawlord?.weapons)).toBe(true)
    expect(clawlord?.weapons.length).toBeGreaterThan(0)
  })

  it('preserves distinct fighter names from source data', async () => {
    const fighters = await readWarcryFightersFromFile(skavenFightersFile)

    const jezzails = fighters.filter((fighter) => fighter.name === 'Warplock Jezzail')
    expect(jezzails.length).toBe(1)

    const stormfiendDoomflayer = fighters.filter(
      (fighter) => fighter.name === 'Stormfiend with Doomflayer gauntlets',
    )
    expect(stormfiendDoomflayer.length).toBe(1)
  })
})
