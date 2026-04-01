import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { WarbandHeader } from './components/WarbandHeader'
import { FighterCard } from './components/FighterCard'
import { CardBack } from './components/CardBack'
import { LanguagePicker } from './components/LanguagePicker'
import { parseWarcrierRoster } from './import/warcrierImport'
import { isAbilityEligibleForFighter } from './integration/abilityEligibility'
import { mergeAbilityTranslations, toAbilityTranslationPath, type WarcryAbilityTranslation } from './i18n/abilityLocalization'
import { getUiText, type AppLocale } from './i18n/uiText'
import type { WarcryAbility, WarcryFighter } from './types/warcry'
import type { ImportedCard, Manifest, WarbandHeaderInfo } from './types/cards'
import { findBestFighterMatch, findWarbandEntry, sortAbilitiesByDice } from './utils/cardHelpers'
import './App.css'

function withBasePath(resourcePath: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base}${resourcePath.replace(/^\/+/, '')}`
}

const SAMPLE_ROSTER = `----------
"My Skaven"
Skaven
995pts | 8 fighters | Valid ✓  

- Warlock Engineer With Warplock Jezzail (205pts, Hero)
- Rat Ogor (250pts)
- Warplock Jezzail (150pts)
- Stormvermin with Rusty Halberd (95pts)
- Stormvermin with Rusty Halberd and Clanshield (80pts)
- Packmaster (75pts)
- Clanrat with Rusty Blade (70pts)
- Clanrat with Rusty Blade (70pts)
----------
Generated on Warcrier.net`

const LOCALE_STORAGE_KEY = 'warcryfightercards.locale'
const WARCRIER_WARBANDS_URL = 'https://www.warcrier.net/docs/warbands'

function getInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return storedLocale === 'pl' ? 'pl' : 'en'
}

function App() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const [printSide, setPrintSide] = useState<'front' | 'back'>('front')
  const [rosterText, setRosterText] = useState('')
  const [lastImportedRosterText, setLastImportedRosterText] = useState<string | null>(null)
  const [rosterName, setRosterName] = useState<string | null>(null)
  const [warbandInfo, setWarbandInfo] = useState<WarbandHeaderInfo | null>(null)
  const [battleTraits, setBattleTraits] = useState<WarcryAbility[]>([])
  const [importedCards, setImportedCards] = useState<ImportedCard[]>([])
  const [importStatus, setImportStatus] = useState('')
  const ui = getUiText(locale)
  const previousLocale = useRef(locale)
  const fighterDataCache = useRef<Record<string, WarcryFighter[]>>({})
  const abilityDataCache = useRef<Record<string, WarcryAbility[]>>({})

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  function useSample() {
    setRosterText(SAMPLE_ROSTER)
  }

  function printCurrentSide() {
    window.print()
  }

  async function loadLocalizedAbilities(abilitiesPath: string): Promise<WarcryAbility[]> {
    const cacheKey = `${locale}:${abilitiesPath}`
    const cached = abilityDataCache.current[cacheKey]
    if (cached) {
      return cached
    }

    const abilitiesResponse = await fetch(withBasePath(abilitiesPath))
    if (!abilitiesResponse.ok) {
      throw new Error(ui.warbandDataLoadError)
    }

    const sourceAbilities = (await abilitiesResponse.json()) as WarcryAbility[]
    const translationPath = toAbilityTranslationPath(abilitiesPath, locale)
    if (!translationPath) {
      abilityDataCache.current[cacheKey] = sourceAbilities
      return sourceAbilities
    }

    let localizedAbilities = sourceAbilities

    try {
      const translationResponse = await fetch(withBasePath(translationPath))
      if (translationResponse.ok) {
        const translatedAbilities = (await translationResponse.json()) as WarcryAbilityTranslation[]
        localizedAbilities = mergeAbilityTranslations(sourceAbilities, translatedAbilities)
      }
    } catch (error) {
      console.warn('Failed to load localized abilities', error)
    }

    abilityDataCache.current[cacheKey] = localizedAbilities
    return localizedAbilities
  }

  async function importRoster(inputText: string) {
    setLastImportedRosterText(inputText)

    const parsed = parseWarcrierRoster(inputText)
    const fighterNames = parsed.fighters.map((fighter) => fighter.name)

    if (fighterNames.length === 0) {
      setRosterName(null)
      setWarbandInfo(null)
      setBattleTraits([])
      setImportedCards([])
      setImportStatus(ui.noFighterLinesStatus)
      return
    }

    setRosterName(parsed.rosterName)
    setWarbandInfo(null)
    setBattleTraits([])

    try {
      const manifestResponse = await fetch(withBasePath('warcry_data/manifest.json'))
      if (!manifestResponse.ok) {
        throw new Error(ui.manifestLoadError)
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
        setImportStatus(ui.datasetNotFoundStatus)
        return
      }

      setWarbandInfo({
        warbandName: parsed.warband ?? warbandEntry.warbandSlug,
        warbandSlug: warbandEntry.warbandSlug,
        faction: warbandEntry.grandAlliance,
      })

      let fighters: WarcryFighter[]
      let abilities: WarcryAbility[]

      const cachedFighters = fighterDataCache.current[warbandEntry.key]
      const cachedAbilities = abilityDataCache.current[`${locale}:${warbandEntry.abilitiesPath}`]

      if (cachedFighters && cachedAbilities) {
        fighters = cachedFighters
        abilities = cachedAbilities
      } else {
        if (cachedFighters) {
          fighters = cachedFighters
        } else {
          const fightersResponse = await fetch(withBasePath(warbandEntry.fightersPath))
          if (!fightersResponse.ok) {
            throw new Error(ui.warbandDataLoadError)
          }

          fighters = (await fightersResponse.json()) as WarcryFighter[]
          fighterDataCache.current[warbandEntry.key] = fighters
        }

        abilities = cachedAbilities ?? (await loadLocalizedAbilities(warbandEntry.abilitiesPath))
      }

      setBattleTraits(
        sortAbilitiesByDice(
          abilities.filter((ability) => ability.cost.trim().toLowerCase() === 'battletrait'),
        ),
      )

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
      setImportStatus(ui.matchedStatus(matchedCount, cards.length))
    } catch (error) {
      setImportedCards([])
      setRosterName(null)
      setWarbandInfo(null)
      setBattleTraits([])
      setImportStatus(error instanceof Error ? error.message : ui.importFailedStatus)
    }
  }

  const rerunLastImport = useEffectEvent(async () => {
    if (!lastImportedRosterText) {
      return
    }

    await importRoster(lastImportedRosterText)
  })

  useEffect(() => {
    if (previousLocale.current === locale) {
      return
    }

    previousLocale.current = locale
    if (!lastImportedRosterText) {
      return
    }

    void rerunLastImport()
  }, [lastImportedRosterText, locale])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-header-copy">
            <h1>{ui.appTitle}</h1>
            <p>{ui.appDescription}</p>
            <a
              className="app-header-link"
              href={WARCRIER_WARBANDS_URL}
              target="_blank"
              rel="noreferrer"
            >
              {ui.appWarcrierLinkLabel}
            </a>
          </div>

          <LanguagePicker locale={locale} onSelect={setLocale} ui={ui} />
        </div>
      </header>

      <section className="roster-import">
        <p className="roster-title">{ui.rosterTitle}</p>
        <textarea
          rows={10}
          value={rosterText}
          onChange={(event) => setRosterText(event.target.value)}
          placeholder={ui.rosterPlaceholder}
        />
        <button type="button" onClick={() => void importRoster(rosterText)}>
          {ui.importRosterButton}
        </button>
        <button type="button" onClick={useSample}>
          {ui.useSampleButton}
        </button>
        {importedCards.length > 0 && (
          <div className="print-controls" role="group" aria-label={ui.printControlsAriaLabel}>
            <span className="print-controls-label">{ui.printSideLabel}</span>
            <button
              type="button"
              className={`print-mode-toggle ${printSide === 'front' ? 'is-active' : ''}`}
              onClick={() => setPrintSide('front')}
              aria-pressed={printSide === 'front'}
            >
              {ui.frontsLabel}
            </button>
            <button
              type="button"
              className={`print-mode-toggle ${printSide === 'back' ? 'is-active' : ''}`}
              onClick={() => setPrintSide('back')}
              aria-pressed={printSide === 'back'}
            >
              {ui.backsLabel}
            </button>
            <button type="button" className="print-now-button" onClick={printCurrentSide}>
              {printSide === 'front' ? ui.printFrontsButton : ui.printBacksButton}
            </button>
          </div>
        )}
        {importStatus && <p className="status">{importStatus}</p>}
      </section>

      {(rosterName || warbandInfo) && (
        <section className="cards-grid">
          <WarbandHeader rosterName={rosterName} warbandInfo={warbandInfo} battleTraits={battleTraits} locale={locale} ui={ui} />
        </section>
      )}

      {importedCards.length > 0 && (
        <section className={`cards-grid ${printSide === 'back' ? 'cards-grid-backs' : ''}`}>
          {importedCards.map((card, index) =>
            printSide === 'front' ? (
              <FighterCard key={`${card.importedName}-${index}`} card={card} runemarkPlacement="under-name" ui={ui} />
            ) : (
              <CardBack key={`${card.importedName}-${index}`} card={card} ui={ui} />
            ),
          )}
        </section>
      )}
    </main>
  )
}

export default App
