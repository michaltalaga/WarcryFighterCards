import { describe, expect, it } from 'vitest'
import { parseWarcrierRosterFile, readWarcrierRosterFile } from './warcrierImportFile'

const sampleRosterFile = new URL('./__fixtures__/warcrier-roster.txt', import.meta.url)

describe('readWarcrierRosterFile', () => {
  it('reads sample roster file content', async () => {
    const raw = await readWarcrierRosterFile(sampleRosterFile)
    expect(raw).toContain('"My Warband"')
    expect(raw).toContain('Skaven')
    expect(raw).toContain('Warplock Jezzail (150pts)')
  })
})

describe('parseWarcrierRosterFile', () => {
  it('reads and parses the sample roster file', async () => {
    const parsed = await parseWarcrierRosterFile(sampleRosterFile)

    expect(parsed).toEqual({
      rosterName: 'My Warband',
      warband: 'Skaven',
      fighters: [
        { name: 'Clawlord on Gnaw-Beast' },
        { name: 'Stormfiend with Doomflayer gauntlets' },
        { name: 'Warplock Jezzail' },
        { name: 'Warplock Jezzail' },
      ],
    })
  })
})