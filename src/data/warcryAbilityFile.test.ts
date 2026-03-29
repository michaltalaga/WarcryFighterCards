import { describe, expect, it } from 'vitest'
import { readWarcryAbilitiesFromFile } from './warcryAbilityFile'

const skavenAbilitiesFile = new URL(
  '../../public/warcry_data/data/chaos/skaven/skaven_abilities.json',
  import.meta.url,
)

describe('readWarcryAbilitiesFromFile', () => {
  it('reads skaven abilities with required fields', async () => {
    const abilities = await readWarcryAbilitiesFromFile(skavenAbilitiesFile)

    expect(abilities.length).toBeGreaterThan(0)

    const crackTheWhip = abilities.find((ability) => ability.name === 'Crack the Whip')
    expect(crackTheWhip).toBeDefined()
    expect(crackTheWhip?.warband).toBe('Skaven')
    expect(typeof crackTheWhip?.cost).toBe('string')
    expect(Array.isArray(crackTheWhip?.runemarks)).toBe(true)
  })
})
