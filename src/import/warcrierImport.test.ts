import { describe, expect, it } from 'vitest'
import { parseWarcrierRoster } from './warcrierImport'

describe('parseWarcrierRoster', () => {
  it('parses the provided Warcrier export including duplicate fighters', () => {
    const input = `----------
"My Warband"
Skaven
800pts | 4 fighters | Valid ✓  

- Clawlord on Gnaw-Beast (230pts, Hero)
- Stormfiend with Doomflayer gauntlets (270pts)
- Warplock Jezzail (150pts)
- Warplock Jezzail (150pts)
----------
Generated on Warcrier.net`

    const parsed = parseWarcrierRoster(input)

    expect(parsed).toEqual({
      rosterName: 'My Warband',
      warband: 'Skaven',
      totalPoints: 800,
      listedFighterCount: 4,
      isValid: true,
      fighters: [
        {
          name: 'Clawlord on Gnaw-Beast',
          points: 230,
          tags: ['Hero'],
        },
        {
          name: 'Stormfiend with Doomflayer gauntlets',
          points: 270,
          tags: [],
        },
        {
          name: 'Warplock Jezzail',
          points: 150,
          tags: [],
        },
        {
          name: 'Warplock Jezzail',
          points: 150,
          tags: [],
        },
      ],
      fighterCounts: {
        'Clawlord on Gnaw-Beast': 1,
        'Stormfiend with Doomflayer gauntlets': 1,
        'Warplock Jezzail': 2,
      },
      source: null,
    })
  })
})