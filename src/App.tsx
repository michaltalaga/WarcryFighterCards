import { useRef, useState } from 'react'
import { parseWarcrierRoster } from './import/warcrierImport'
import { isAbilityEligibleForFighter } from './integration/abilityEligibility'
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
  reactions: WarcryAbility[]
}

type WarbandHeaderInfo = {
  warband: string
  faction: string
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

function getAbilityCostIcon(cost: string): { icon: string; label: string } | null {
  switch (cost.trim().toLowerCase()) {
    case 'double':
      return { icon: '⚁', label: 'Double' }
    case 'triple':
      return { icon: '⚂', label: 'Triple' }
    case 'quad':
      return { icon: '⚃', label: 'Quad' }
    case 'passive':
      return { icon: '◌', label: 'Passive' }
    default:
      return null
  }
}

function abilityDiceOrder(cost: string): number {
  switch (cost.trim().toLowerCase()) {
    case 'double':
      return 2
    case 'triple':
      return 3
    case 'quad':
      return 4
    case 'passive':
      return 1
    default:
      return 99
  }
}

function sortAbilitiesByDice(abilities: WarcryAbility[]): WarcryAbility[] {
  return [...abilities].sort((a, b) => {
    const byDice = abilityDiceOrder(a.cost) - abilityDiceOrder(b.cost)
    if (byDice !== 0) {
      return byDice
    }
    return a.name.localeCompare(b.name)
  })
}

function App() {
  const [rosterText, setRosterText] = useState('')
  const [rosterName, setRosterName] = useState<string | null>(null)
  const [warbandInfo, setWarbandInfo] = useState<WarbandHeaderInfo | null>(null)
  const [battleTraits, setBattleTraits] = useState<WarcryAbility[]>([])
  const [importedCards, setImportedCards] = useState<ImportedCard[]>([])
  const [importStatus, setImportStatus] = useState('')
  const warbandDataCache = useRef<Record<string, { fighters: WarcryFighter[]; abilities: WarcryAbility[] }>>({})

  async function importRoster() {
    const parsed = parseWarcrierRoster(rosterText)
    const fighterNames = parsed.fighters.map((fighter) => fighter.name)

    if (fighterNames.length === 0) {
      setImportedCards([])
      setImportStatus('No fighter lines found. Paste the full roster export block.')
      return
    }

    setRosterName(parsed.rosterName)
    setWarbandInfo(null)
    setBattleTraits([])

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
          reactions: [],
        }))
        setImportedCards(unmatchedCards)
        setImportStatus('Roster imported, but warband data was not found in local dataset.')
        return
      }

      setWarbandInfo({ warband: warbandEntry.warbandSlug, faction: warbandEntry.grandAlliance })

      let fighters: WarcryFighter[]
      let abilities: WarcryAbility[]

      const cached = warbandDataCache.current[warbandEntry.key]
      if (cached) {
        fighters = cached.fighters
        abilities = cached.abilities
      } else {
        const [fightersResponse, abilitiesResponse] = await Promise.all([
          fetch(warbandEntry.fightersPath),
          fetch(warbandEntry.abilitiesPath),
        ])

        if (!fightersResponse.ok || !abilitiesResponse.ok) {
          throw new Error('Failed to load fighters/abilities for detected warband')
        }

        fighters = (await fightersResponse.json()) as WarcryFighter[]
        abilities = (await abilitiesResponse.json()) as WarcryAbility[]
        warbandDataCache.current[warbandEntry.key] = { fighters, abilities }
      }

      setBattleTraits(sortAbilitiesByDice(abilities.filter((ability) => ability.cost === 'battletrait')))

      const cards: ImportedCard[] = fighterNames.map((name) => {
        const fighter = findBestFighterMatch(fighters, name)
        if (!fighter) {
          return {
            importedName: name,
            fighter: null,
            abilities: [],
            reactions: [],
          }
        }

        const eligible = abilities.filter((ability) => isAbilityEligibleForFighter(ability, fighter))
        const reactions = sortAbilitiesByDice(
          eligible.filter((ability) => ability.cost.trim().toLowerCase() === 'reaction'),
        )
        const fighterAbilities = sortAbilitiesByDice(
          eligible.filter((ability) => {
            const cost = ability.cost.trim().toLowerCase()
            return cost !== 'reaction' && cost !== 'battletrait'
          }),
        )

        return {
          importedName: name,
          fighter,
          abilities: fighterAbilities,
          reactions,
        }
      })

      setImportedCards(cards)
      const matchedCount = cards.filter((card) => card.fighter).length
      setImportStatus(`Roster imported: matched ${matchedCount}/${cards.length}`)
    } catch (error) {
      setImportedCards([])
      setWarbandInfo(null)
      setBattleTraits([])
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
        {(rosterName || warbandInfo) && (
          <article className="warband-header-card">
            <h2>{rosterName || 'Imported Roster'}</h2>
            {warbandInfo && (
              <p>
                {warbandInfo.warband} | {warbandInfo.faction}
              </p>
            )}

            <section className="warband-traits">
              <h3>Battle Traits</h3>
              <ul className="abilities-list">
                {battleTraits.length === 0 ? (
                  <li>No battle traits</li>
                ) : (
                  battleTraits.map((ability) => <li key={ability._id}>{ability.name}</li>)
                )}
              </ul>
            </section>
          </article>
        )}

        {importedCards.map((card, index) => {
          const fighterName = card.fighter?.name ?? card.importedName
          return (
            <article key={`${fighterName}-${index}`} className="fighter-card">
              <div className="fighter-card-header">
                <h2>{fighterName}</h2>
                {card.fighter && <span className="points-pill">{card.fighter.points} pts</span>}
              </div>

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
                  </dl>

                  <section>
                    <h3>Abilities</h3>
                    <ul className="abilities-list">
                      {card.abilities.length === 0 ? (
                        <li>No matching abilities</li>
                      ) : (
                        card.abilities.map((ability) => {
                          const costIcon = getAbilityCostIcon(ability.cost)
                          return (
                            <li key={ability._id} className="ability-line">
                              {costIcon && (
                                <span className="cost-icon" aria-label={costIcon.label} title={costIcon.label}>
                                  {costIcon.icon}
                                </span>
                              )}
                              <span>{ability.name}</span>
                            </li>
                          )
                        })
                      )}
                    </ul>
                  </section>

                  <section>
                    <h3>Reactions</h3>
                    <ul className="abilities-list">
                      {card.reactions.length === 0 ? (
                        <li>No matching reactions</li>
                      ) : (
                        card.reactions.map((ability) => <li key={ability._id}>{ability.name}</li>)
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
