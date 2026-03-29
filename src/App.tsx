import { useState } from 'react'
import { parseWarcrierRoster } from './import/warcrierImport'
import type { WarcryAbility, WarcryFighter } from './types/warcry'
import './App.css'

type WarbandManifest = {
  key: string
  grandAlliance: string
  warbandSlug: string
  fightersPath: string
  abilitiesPath: string
}

type Manifest = {
  warbands: WarbandManifest[]
}

type ImportedCard = {
  importedName: string
  fighter: WarcryFighter | null
  abilities: WarcryAbility[]
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findWarbandEntry(manifest: Manifest, warbandName: string | null): WarbandManifest | null {
  if (!warbandName) {
    return null
  }

  const target = normalizeText(warbandName)
  const exact = manifest.warbands.find((entry) => normalizeText(entry.warbandSlug) === target)
  if (exact) {
    return exact
  }

  return (
    manifest.warbands.find((entry) => {
      const slug = normalizeText(entry.warbandSlug)
      return slug.includes(target) || target.includes(slug)
    }) ?? null
  )
}

function findBestFighterMatch(fighters: WarcryFighter[], importedName: string): WarcryFighter | null {
  const normalizedImported = normalizeText(importedName)

  const exact = fighters.find((fighter) => normalizeText(fighter.name) === normalizedImported)
  if (exact) {
    return exact
  }

  const looseMatches = fighters.filter((fighter) => {
    const normalizedFighterName = normalizeText(fighter.name)
    return (
      normalizedFighterName.includes(normalizedImported) ||
      normalizedImported.includes(normalizedFighterName)
    )
  })

  if (looseMatches.length === 0) {
    return null
  }

  looseMatches.sort((a, b) => {
    const aDiff = Math.abs(a.name.length - importedName.length)
    const bDiff = Math.abs(b.name.length - importedName.length)
    return aDiff - bDiff
  })

  return looseMatches[0]
}

function abilityAppliesToFighter(ability: WarcryAbility, fighter: WarcryFighter): boolean {
  if (!ability.runemarks || ability.runemarks.length === 0) {
    return true
  }

  return ability.runemarks.every((runemark) => fighter.runemarks.includes(runemark))
}

function normalizeCost(cost: string): string {
  const value = cost.trim().toLowerCase()
  if (!value) {
    return '-'
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function App() {
  const [rosterText, setRosterText] = useState('')
  const [rosterName, setRosterName] = useState<string | null>(null)
  const [warband, setWarband] = useState<string | null>(null)
  const [importedCards, setImportedCards] = useState<ImportedCard[]>([])
  const [importStatus, setImportStatus] = useState('')

  async function importRoster() {
    const parsed = parseWarcrierRoster(rosterText)
    const fighterNames = parsed.fighters.map((fighter) => fighter.name)

    if (fighterNames.length === 0) {
      setImportedCards([])
      setImportStatus('No fighter lines found. Paste the full roster export block.')
      return
    }

    setRosterName(parsed.rosterName)
    setWarband(parsed.warband)

    try {
      const manifestResponse = await fetch('/warcry_data/manifest.json')
      if (!manifestResponse.ok) {
        throw new Error('Failed to load warband manifest')
      }

      const manifest = (await manifestResponse.json()) as Manifest
      const warbandEntry = findWarbandEntry(manifest, parsed.warband)
      if (!warbandEntry) {
        const unmatchedCards = fighterNames.map((name) => ({
          importedName: name,
          fighter: null,
          abilities: [],
        }))
        setImportedCards(unmatchedCards)
        setImportStatus('Roster imported, but warband data was not found in local dataset.')
        return
      }

      const [fightersResponse, abilitiesResponse] = await Promise.all([
        fetch(warbandEntry.fightersPath),
        fetch(warbandEntry.abilitiesPath),
      ])

      if (!fightersResponse.ok || !abilitiesResponse.ok) {
        throw new Error('Failed to load fighters/abilities for detected warband')
      }

      const fighters = (await fightersResponse.json()) as WarcryFighter[]
      const abilities = (await abilitiesResponse.json()) as WarcryAbility[]

      const cards: ImportedCard[] = fighterNames.map((name) => {
        const fighter = findBestFighterMatch(fighters, name)
        if (!fighter) {
          return {
            importedName: name,
            fighter: null,
            abilities: [],
          }
        }

        return {
          importedName: name,
          fighter,
          abilities: abilities.filter((ability) => abilityAppliesToFighter(ability, fighter)),
        }
      })

      setImportedCards(cards)
      const matchedCount = cards.filter((card) => card.fighter).length
      setImportStatus(`Roster imported: matched ${matchedCount}/${cards.length}`)
    } catch (error) {
      setImportedCards([])
      setImportStatus(error instanceof Error ? error.message : 'Import failed')
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Roster Import</h1>
        <p>Paste roster text. One card is generated for each imported fighter entry.</p>
      </header>

      <section className="roster-import">
        <p className="roster-title">Roster Text</p>
        <textarea
          rows={10}
          value={rosterText}
          onChange={(event) => setRosterText(event.target.value)}
          placeholder="Paste full roster export text here"
        />
        <button type="button" onClick={importRoster}>
          Import roster
        </button>
        {importStatus && <p className="status">{importStatus}</p>}
      </section>

      <section className="cards-grid">
        {importedCards.map((card, index) => {
          const fighterName = card.fighter?.name ?? card.importedName
          return (
            <article key={`${fighterName}-${index}`} className="fighter-card">
              <h2>{fighterName}</h2>
              <p>
                {rosterName || 'Imported Roster'}
                {warband ? ` | ${warband}` : ''}
              </p>

              {card.fighter ? (
                <>
                  <dl className="stats-grid">
                    <div>
                      <dt>M</dt>
                      <dd>{card.fighter.movement}</dd>
                    </div>
                    <div>
                      <dt>T</dt>
                      <dd>{card.fighter.toughness}</dd>
                    </div>
                    <div>
                      <dt>W</dt>
                      <dd>{card.fighter.wounds}</dd>
                    </div>
                    <div>
                      <dt>PTS</dt>
                      <dd>{card.fighter.points}</dd>
                    </div>
                  </dl>

                  <section>
                    <h3>Abilities</h3>
                    <ul className="abilities-list">
                      {card.abilities.length === 0 ? (
                        <li>No matching abilities</li>
                      ) : (
                        card.abilities.map((ability) => (
                          <li key={ability._id}>
                            {ability.name} ({normalizeCost(ability.cost)})
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                </>
              ) : (
                <p className="unmatched">No fighter data match found in detected warband.</p>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
