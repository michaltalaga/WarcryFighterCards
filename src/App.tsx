import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { WarbandHeader } from './components/WarbandHeader'
import { FighterCard } from './components/FighterCard'
import { CardBack } from './components/CardBack'
import { LanguagePicker } from './components/LanguagePicker'
import { parseWarcrierRoster } from './import/warcrierImport'
import { resolveRosterImport } from './integration/rosterImportResolution'
import { mergeAbilityTranslations, toAbilityTranslationPath, type WarcryAbilityTranslation } from './i18n/abilityLocalization'
import { getUiText, type AppLocale } from './i18n/uiText'
import type { WarcryAbility, WarcryFighter } from './types/warcry'
import type { ImportedCard, Manifest, WarbandHeaderInfo, WarbandManifest } from './types/cards'
import { findWarbandEntry } from './utils/cardHelpers'
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
const GITHUB_URL = 'https://github.com/michaltalaga/WarcryFighterCards'
const DATA_SOURCE_URL = 'https://github.com/krisling049/warcry_data'
const CARD_ASSETS_URL = 'https://github.com/Stevrak/warcry_legions'
const APP_BUILD_LABEL = __APP_BUILD_LABEL__
const APP_BUILD_URL = __APP_BUILD_URL__

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

  async function loadFightersForEntry(entry: WarbandManifest): Promise<WarcryFighter[]> {
    const cached = fighterDataCache.current[entry.key]
    if (cached) {
      return cached
    }

    const fightersResponse = await fetch(withBasePath(entry.fightersPath))
    if (!fightersResponse.ok) {
      throw new Error(ui.warbandDataLoadError)
    }

    const fighters = (await fightersResponse.json()) as WarcryFighter[]
    fighterDataCache.current[entry.key] = fighters
    return fighters
  }

  async function loadAbilitiesForEntry(entry: WarbandManifest): Promise<WarcryAbility[]> {
    return loadLocalizedAbilities(entry.abilitiesPath)
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

      const resolvedImport = await resolveRosterImport(manifest, parsed, warbandEntry, {
        loadAbilities: loadAbilitiesForEntry,
        loadFighters: loadFightersForEntry,
      })

      setBattleTraits(resolvedImport.battleTraits)
      setImportedCards(resolvedImport.cards)
      const matchedCount = resolvedImport.cards.filter((card) => card.fighter).length
      setImportStatus(ui.matchedStatus(matchedCount, resolvedImport.cards.length))
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

          <div className="app-header-actions">
            <a
              className="app-github-link"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <LanguagePicker locale={locale} onSelect={setLocale} ui={ui} />
          </div>
        </div>
      </header>

      <section className="roster-import">
        <p className="roster-title">{ui.rosterTitle}</p>
        <div className="roster-input-shell">
          <textarea
            rows={10}
            value={rosterText}
            onChange={(event) => setRosterText(event.target.value)}
            placeholder={ui.rosterPlaceholder}
          />
          <div className="roster-input-actions">
            <button type="button" className="roster-action-button" onClick={() => void importRoster(rosterText)}>
              {ui.importRosterButton}
            </button>
            <button type="button" className="roster-action-button roster-action-button-secondary" onClick={useSample}>
              {ui.useSampleButton}
            </button>
          </div>
        </div>
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
      <footer className="app-credits">
        {APP_BUILD_LABEL && (
          <span>
            Build:{' '}
            {APP_BUILD_URL ? (
              <a href={APP_BUILD_URL} target="_blank" rel="noreferrer">
                {APP_BUILD_LABEL}
              </a>
            ) : (
              APP_BUILD_LABEL
            )}
          </span>
        )}
        <span>Author: <a href="https://cyberdynesystems.cc/" target="_blank" rel="noreferrer">Cyberdyne Systems</a></span>
        <span>Fighter &amp; ability data: <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer">krisling049/warcry_data</a></span>
        <span>Card assets &amp; runemarks: <a href={CARD_ASSETS_URL} target="_blank" rel="noreferrer">Stevrak/warcry_legions</a></span>
      </footer>
    </main>
  )
}

export default App
