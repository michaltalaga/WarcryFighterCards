import { useRef, useState } from 'react'
import { WarbandHeader } from './components/WarbandHeader'
import { FighterCard } from './components/FighterCard'
import { parseWarcrierRoster } from './import/warcrierImport'
import { isAbilityEligibleForFighter } from './integration/abilityEligibility'
import type { WarcryAbility, WarcryFighter } from './types/warcry'
import type { ImportedCard, Manifest, WarbandHeaderInfo } from './types/cards'
import { findBestFighterMatch, findWarbandEntry, sortAbilitiesByDice } from './utils/cardHelpers'
import './App.css'

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
        <WarbandHeader rosterName={rosterName} warbandInfo={warbandInfo} battleTraits={battleTraits} />
      </section>

      {importedCards.length > 0 && (
        <section className="compare-layout">
          <section className="compare-column">
            <h2 className="compare-title">Version A: Runemarks Under Name</h2>
            <section className="cards-grid cards-grid-compare">
              {importedCards.map((card, index) => (
                <FighterCard key={`under-name-${card.importedName}-${index}`} card={card} runemarkPlacement="under-name" />
              ))}
            </section>
          </section>

          <section className="compare-column">
            <h2 className="compare-title">Version B: Runemarks At Bottom</h2>
            <section className="cards-grid cards-grid-compare">
              {importedCards.map((card, index) => (
                <FighterCard key={`bottom-${card.importedName}-${index}`} card={card} runemarkPlacement="bottom" />
              ))}
            </section>
          </section>
        </section>
      )}
    </main>
  )
}

export default App
