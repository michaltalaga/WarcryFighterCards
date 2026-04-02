import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readWarcryAbilitiesFromFile } from '../data/warcryAbilityFile'
import { readWarcryFightersFromFile } from '../data/warcryFighterFile'
import { parseWarcrierRoster } from '../import/warcrierImport'
import type { Manifest, WarbandManifest } from '../types/cards'
import { findWarbandEntry } from '../utils/cardHelpers'
import { resolveRosterImport } from './rosterImportResolution'

const manifest = JSON.parse(
  fs.readFileSync(new URL('../../public/warcry_data/manifest.json', import.meta.url), 'utf8'),
) as Manifest

function toPublicFileUrl(resourcePath: string): URL {
  return new URL(`../../public${resourcePath}`, import.meta.url)
}

async function loadFighters(entry: WarbandManifest) {
  return readWarcryFightersFromFile(toPublicFileUrl(entry.fightersPath))
}

async function loadAbilities(entry: WarbandManifest) {
  return readWarcryAbilitiesFromFile(toPublicFileUrl(entry.abilitiesPath))
}

describe('resolveRosterImport', () => {
  it('matches allied fighters from the detected grand alliance and loads their abilities', async () => {
    const importedRoster = parseWarcrierRoster(`----------
"Krule Tyrant"
Kruleboyz
990pts | 9 fighters | Valid ✓

- Tyrant (325pts, Hero)
- Swampcalla Shaman (165pts, Hero)
- Man-skewer Boltboy (120pts)
- Gutrippa with Wicked Stikka (75pts)
- Gutrippa with Wicked Stikka (75pts)
- Gutrippa with Wicked Stikka (75pts)
- Shank (55pts)
- Gikkit (50pts)
- Pot-grot (50pts)
----------
Generated on Warcrier.net`)

    const warbandEntry = findWarbandEntry(manifest, importedRoster.warband)
    expect(warbandEntry).not.toBeNull()

    const resolved = await resolveRosterImport(manifest, importedRoster, warbandEntry!, {
      loadAbilities,
      loadFighters,
    })

    const tyrantCard = resolved.cards.find((card) => card.importedName === 'Tyrant')
    expect(tyrantCard?.fighter?.name).toBe('Tyrant')
    expect(tyrantCard?.fighter?.warband).toBe('Ogor Mawtribes')
    expect(tyrantCard?.abilities.map((ability) => ability.name)).toContain('Might Makes Right')
    expect(tyrantCard?.abilities.map((ability) => ability.name)).toContain('On the Mawpath')
    expect(tyrantCard?.reactions.map((ability) => ability.name)).toContain('Quick Bite')

    const swampcallaCard = resolved.cards.find((card) => card.importedName === 'Swampcalla Shaman')
    expect(swampcallaCard?.fighter?.warband).toBe('Kruleboyz')
    expect(swampcallaCard?.abilities.map((ability) => ability.name)).toContain('Summon Boggy Mist')
  })
})
