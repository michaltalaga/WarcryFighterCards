import { useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiceD6, faStar } from '@fortawesome/free-solid-svg-icons'
import { parseWarcrierRoster } from './import/warcrierImport'
import { isAbilityEligibleForFighter } from './integration/abilityEligibility'
import type { WarcryAbility, WarcryFighter, WarcryWeaponProfile } from './types/warcry'
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
  warbandName: string
  warbandSlug: string
  faction: string
}

type FactionRunemarkProps = {
  candidates: string[]
  alt: string
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

function toWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/['`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function toSingularWord(word: string): string {
  if (word.length > 3 && word.endsWith('s')) {
    return word.slice(0, -1)
  }
  return word
}

function buildWarbandNameVariants(value: string): string[] {
  const words = toWords(value)
  if (words.length === 0) {
    return []
  }

  const singularWords = words.map((word) => toSingularWord(word))
  const variants = new Set<string>()

  variants.add(words.join('-'))
  variants.add(words.join(''))
  variants.add(singularWords.join('-'))
  variants.add(singularWords.join(''))
  variants.add(words[0])
  variants.add(singularWords[0])

  if (words.length >= 2) {
    variants.add(`${words[0]}-${words[1]}`)
    variants.add(`${singularWords[0]}-${singularWords[1]}`)
  }

  return [...variants].filter(Boolean)
}

function buildFactionRunemarkCandidates(warbandInfo: WarbandHeaderInfo): string[] {
  const candidates = new Set<string>()
  const faction = toWords(warbandInfo.faction).join('-')
  const baseNames = [warbandInfo.warbandSlug, warbandInfo.warbandName]

  for (const baseName of baseNames) {
    for (const variant of buildWarbandNameVariants(baseName)) {
      candidates.add(`/warcry_assets/runemarks/black/factions-${faction}-${variant}.svg`)
      candidates.add(`/warcry_assets/runemarks/black/bladeborn-${variant}.svg`)
    }
  }

  candidates.add(`/warcry_assets/runemarks/black/grand-alliance-${faction}.svg`)
  return [...candidates]
}

function FactionRunemark({ candidates, alt }: FactionRunemarkProps) {
  const [candidateIndex, setCandidateIndex] = useState(0)

  if (candidateIndex >= candidates.length) {
    return null
  }

  const src = candidates[candidateIndex]
  return (
    <img
      className="faction-runemark"
      src={src}
      alt={alt}
      onError={() => setCandidateIndex((prev) => prev + 1)}
    />
  )
}

function getAbilityCostVisual(cost: string):
  | { diceCount: number; label: string; isPassive?: false }
  | { diceCount: 0; label: string; isPassive: true }
  | null {
  switch (cost.trim().toLowerCase()) {
    case 'double':
      return { diceCount: 2, label: 'Double' }
    case 'triple':
      return { diceCount: 3, label: 'Triple' }
    case 'quad':
      return { diceCount: 4, label: 'Quad' }
    case 'passive':
      return { diceCount: 0, label: 'Passive', isPassive: true }
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

function formatWeaponRange(weapon: WarcryWeaponProfile): string {
  const min = Math.max(weapon.min_range, 0)
  const max = Math.max(weapon.max_range, 0)
  if (min <= 1 && max <= 1) {
    return '1"'
  }
  if (min <= 0) {
    return `${max}"`
  }
  return `${min}-${max}"`
}

function formatWeaponDamage(weapon: WarcryWeaponProfile): string {
  return `${weapon.dmg_hit}/${weapon.dmg_crit}`
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

      setWarbandInfo({
        warbandName: parsed.warband ?? warbandEntry.warbandSlug,
        warbandSlug: warbandEntry.warbandSlug,
        faction: warbandEntry.grandAlliance,
      })

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

  const runemarkCandidates = useMemo(
    () => (warbandInfo ? buildFactionRunemarkCandidates(warbandInfo) : []),
    [warbandInfo],
  )

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
            <div className="warband-header-top">
              <div>
                <h2>{rosterName || 'Imported Roster'}</h2>
                {warbandInfo && (
                  <p>
                    {warbandInfo.warbandName} | {warbandInfo.faction}
                  </p>
                )}
              </div>
              {warbandInfo && (
                <FactionRunemark
                  key={runemarkCandidates.join('|')}
                  candidates={runemarkCandidates}
                  alt={`${warbandInfo.warbandName} runemark`}
                />
              )}
            </div>

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
                    <h3>Weapons</h3>
                    <ul className="weapons-list">
                      {card.fighter.weapons.length === 0 ? (
                        <li className="weapon-row">No weapon profiles</li>
                      ) : (
                        card.fighter.weapons.map((weapon, idx) => (
                          <li key={`${card.fighter?._id}-weapon-${idx}`} className="weapon-row">
                            <span className="weapon-meta">{formatWeaponRange(weapon)}</span>
                            <span>
                              A{weapon.attacks} S{weapon.strength} D{formatWeaponDamage(weapon)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>

                  <section>
                    <h3>Abilities</h3>
                    <ul className="abilities-list">
                      {card.abilities.length === 0 ? (
                        <li>No matching abilities</li>
                      ) : (
                        card.abilities.map((ability) => {
                          const costVisual = getAbilityCostVisual(ability.cost)
                          return (
                            <li key={ability._id} className="ability-line">
                              {costVisual && !costVisual.isPassive && (
                                <span className="dice-group" aria-label={costVisual.label} title={costVisual.label}>
                                  {Array.from({ length: costVisual.diceCount }).map((_, index) => (
                                    <FontAwesomeIcon key={index} icon={faDiceD6} className="dice-icon" />
                                  ))}
                                </span>
                              )}
                              {costVisual?.isPassive && (
                                <span className="passive-badge" aria-label="Passive" title="Passive">
                                  <FontAwesomeIcon icon={faStar} className="passive-icon" />
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
