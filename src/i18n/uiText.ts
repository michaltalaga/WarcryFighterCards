export const APP_LOCALES = ['en', 'pl'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export type UiText = {
  appTitle: string
  appDescription: string
  languageLabel: string
  languagePickerAriaLabel: string
  englishLabel: string
  polishLabel: string
  rosterTitle: string
  rosterPlaceholder: string
  importRosterButton: string
  useSampleButton: string
  printControlsAriaLabel: string
  printSideLabel: string
  frontsLabel: string
  backsLabel: string
  printFrontsButton: string
  printBacksButton: string
  noFighterLinesStatus: string
  manifestLoadError: string
  datasetNotFoundStatus: string
  warbandDataLoadError: string
  importFailedStatus: string
  importedRosterFallback: string
  battleTraitsHeading: string
  noBattleTraits: string
  statsHeading: string
  weaponsHeading: string
  weaponLabel: string
  noWeaponProfiles: string
  abilitiesHeading: string
  noMatchingAbilities: string
  noMatchingAbilitiesBack: string
  reactionsHeading: string
  noMatchingReactions: string
  noRunemarks: string
  unmatchedFighter: string
  runemarkLabel: string
  pointsUnit: string
  moveLabel: string
  toughnessLabel: string
  woundsLabel: string
  rangeLabel: string
  attacksLabel: string
  strengthLabel: string
  damageLabel: string
  abilityCostLabels: {
    double: string
    triple: string
    quad: string
    passive: string
  }
  matchedStatus: (matchedCount: number, totalCount: number) => string
  pointsAriaLabel: (points: number) => string
  cardBackAriaLabel: (fighterName: string) => string
}

const uiText: Record<AppLocale, UiText> = {
  en: {
    appTitle: 'Roster Import',
    appDescription: 'Paste roster text. One card is generated for each imported fighter entry.',
    languageLabel: 'Language',
    languagePickerAriaLabel: 'Language picker',
    englishLabel: 'English',
    polishLabel: 'Polski',
    rosterTitle: 'Roster Text',
    rosterPlaceholder: 'Paste full roster export text here',
    importRosterButton: 'Import roster',
    useSampleButton: 'Use Sample',
    printControlsAriaLabel: 'Print controls',
    printSideLabel: 'Print side:',
    frontsLabel: 'Fronts',
    backsLabel: 'Backs',
    printFrontsButton: 'Print fronts',
    printBacksButton: 'Print backs',
    noFighterLinesStatus: 'No fighter lines found. Paste the full roster export block.',
    manifestLoadError: 'Failed to load warband manifest',
    datasetNotFoundStatus: 'Roster imported, but warband data was not found in local dataset.',
    warbandDataLoadError: 'Failed to load fighters/abilities for detected warband',
    importFailedStatus: 'Import failed',
    importedRosterFallback: 'Imported Roster',
    battleTraitsHeading: 'Battle Traits',
    noBattleTraits: 'No battle traits',
    statsHeading: 'Stats',
    weaponsHeading: 'Weapons',
    weaponLabel: 'weapon',
    noWeaponProfiles: 'No weapon profiles',
    abilitiesHeading: 'Abilities',
    noMatchingAbilities: 'No matching abilities',
    noMatchingAbilitiesBack: 'No matching abilities.',
    reactionsHeading: 'Reactions',
    noMatchingReactions: 'No matching reactions',
    noRunemarks: 'No runemarks',
    unmatchedFighter: 'No fighter data match found in detected warband.',
    runemarkLabel: 'runemark',
    pointsUnit: 'pts',
    moveLabel: 'Move',
    toughnessLabel: 'Toughness',
    woundsLabel: 'Wounds',
    rangeLabel: 'Range',
    attacksLabel: 'Attacks',
    strengthLabel: 'Strength',
    damageLabel: 'Damage',
    abilityCostLabels: {
      double: 'Double',
      triple: 'Triple',
      quad: 'Quad',
      passive: 'Passive',
    },
    matchedStatus: (matchedCount, totalCount) => `Roster imported: matched ${matchedCount}/${totalCount}`,
    pointsAriaLabel: (points) => `${points} points`,
    cardBackAriaLabel: (fighterName) => `Back of ${fighterName}`,
  },
  pl: {
    appTitle: 'Import rozpiski',
    appDescription: 'Wklej tekst rozpiski. Dla każdego zaimportowanego wpisu wojownika zostanie utworzona jedna karta.',
    languageLabel: 'Język',
    languagePickerAriaLabel: 'Wybór języka',
    englishLabel: 'English',
    polishLabel: 'Polski',
    rosterTitle: 'Tekst rozpiski',
    rosterPlaceholder: 'Wklej pełny eksport rozpiski tutaj',
    importRosterButton: 'Importuj rozpiskę',
    useSampleButton: 'Użyj przykładu',
    printControlsAriaLabel: 'Ustawienia wydruku',
    printSideLabel: 'Strona wydruku:',
    frontsLabel: 'Przody',
    backsLabel: 'Tyły',
    printFrontsButton: 'Drukuj przody',
    printBacksButton: 'Drukuj tyły',
    noFighterLinesStatus: 'Nie znaleziono linii wojowników. Wklej pełny blok eksportu.',
    manifestLoadError: 'Nie udało się wczytać manifestu warbandów.',
    datasetNotFoundStatus: 'Rozpiska została zaimportowana, ale nie znaleziono danych warbandu w lokalnym zbiorze.',
    warbandDataLoadError: 'Nie udało się wczytać wojowników i zdolności dla wykrytego warbandu.',
    importFailedStatus: 'Import nie powiódł się',
    importedRosterFallback: 'Zaimportowana rozpiska',
    battleTraitsHeading: 'Cechy bitewne',
    noBattleTraits: 'Brak cech bitewnych',
    statsHeading: 'Statystyki',
    weaponsHeading: 'Broń',
    weaponLabel: 'broń',
    noWeaponProfiles: 'Brak profili broni',
    abilitiesHeading: 'Zdolności',
    noMatchingAbilities: 'Brak pasujących zdolności',
    noMatchingAbilitiesBack: 'Brak pasujących zdolności.',
    reactionsHeading: 'Reakcje',
    noMatchingReactions: 'Brak pasujących reakcji',
    noRunemarks: 'Brak runemarków',
    unmatchedFighter: 'Nie znaleziono danych wojownika w wykrytym warbandzie.',
    runemarkLabel: 'runemark',
    pointsUnit: 'pkt',
    moveLabel: 'Ruch',
    toughnessLabel: 'Wytrzymałość',
    woundsLabel: 'Rany',
    rangeLabel: 'Zasięg',
    attacksLabel: 'Ataki',
    strengthLabel: 'Siła',
    damageLabel: 'Obrażenia',
    abilityCostLabels: {
      double: 'Dublet',
      triple: 'Tryplet',
      quad: 'Kwadruplet',
      passive: 'Pasywna',
    },
    matchedStatus: (matchedCount, totalCount) => `Zaimportowano rozpiskę: dopasowano ${matchedCount}/${totalCount}`,
    pointsAriaLabel: (points) => `${points} punktów`,
    cardBackAriaLabel: (fighterName) => `Tył karty ${fighterName}`,
  },
}

const grandAllianceLabels: Record<AppLocale, Record<string, string>> = {
  en: {
    chaos: 'Chaos',
    death: 'Death',
    destruction: 'Destruction',
    order: 'Order',
    universal: 'Universal',
  },
  pl: {
    chaos: 'Chaos',
    death: 'Śmierć',
    destruction: 'Zniszczenie',
    order: 'Porządek',
    universal: 'Uniwersalne',
  },
}

export function getUiText(locale: AppLocale): UiText {
  return uiText[locale]
}

export function formatGrandAllianceLabel(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const translated = grandAllianceLabels[locale][normalized]
  if (translated) {
    return translated
  }

  if (value.length === 0) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}
