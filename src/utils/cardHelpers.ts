import type { WarcryAbility, WarcryFighter, WarcryWeaponProfile } from '../types/warcry'
import type { Manifest, WarbandHeaderInfo, WarbandManifest } from '../types/cards'

function withBasePath(resourcePath: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base}${resourcePath.replace(/^\/+/, '')}`
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findWarbandEntry(manifest: Manifest, warbandName: string | null): WarbandManifest | null {
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

export function findBestFighterMatch(fighters: WarcryFighter[], importedName: string): WarcryFighter | null {
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

export function toWords(value: string): string[] {
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

export function buildFactionRunemarkCandidates(warbandInfo: WarbandHeaderInfo): string[] {
  const candidates = new Set<string>()
  const faction = toWords(warbandInfo.faction).join('-')
  const baseNames = [warbandInfo.warbandSlug, warbandInfo.warbandName]

  for (const baseName of baseNames) {
    for (const variant of buildWarbandNameVariants(baseName)) {
      candidates.add(withBasePath(`warcry_assets/runemarks/black/factions-${faction}-${variant}.svg`))
      candidates.add(withBasePath(`warcry_assets/runemarks/black/bladeborn-${variant}.svg`))
    }
  }

  candidates.add(withBasePath(`warcry_assets/runemarks/black/grand-alliance-${faction}.svg`))
  return [...candidates]
}

function normalizeSlug(value: string): string {
  return toWords(value).join('-')
}

const fighterRunemarkAliases: Record<string, string[]> = {
  hero: ['leader'],
}

export function buildFighterRunemarkCandidates(runemark: string): string[] {
  const normalized = normalizeSlug(runemark)
  const aliases = fighterRunemarkAliases[normalized] ?? []
  const tokens = [normalized, ...aliases]
  const candidates = new Set<string>()

  for (const token of tokens) {
    candidates.add(withBasePath(`warcry_assets/runemarks/black/fighters-${token}.svg`))
  }

  return [...candidates]
}

export function buildWeaponRunemarkCandidates(runemark: string): string[] {
  const token = normalizeSlug(runemark)
  if (!token) {
    return []
  }

  const candidates = new Set<string>()
  candidates.add(withBasePath(`warcry_assets/runemarks/black/weapons-${token}.svg`))

  // Some files are named with a "-weapon" suffix (e.g. ranged/reach).
  if (token === 'ranged' || token === 'reach') {
    candidates.add(withBasePath(`warcry_assets/runemarks/black/weapons-${token}-weapon.svg`))
  }

  return [...candidates]
}

export function characteristicIconPath(name: string): string {
  return withBasePath(`warcry_assets/runemarks/black/characteristic-${name}.svg`)
}

export function formatRunemarkLabel(runemark: string): string {
  return toWords(runemark)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getAbilityCostVisual(cost: string):
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

export function sortAbilitiesByDice(abilities: WarcryAbility[]): WarcryAbility[] {
  return [...abilities].sort((a, b) => {
    const byDice = abilityDiceOrder(a.cost) - abilityDiceOrder(b.cost)
    if (byDice !== 0) {
      return byDice
    }
    return a.name.localeCompare(b.name)
  })
}

export function formatWeaponRange(weapon: WarcryWeaponProfile): string {
  const min = Math.max(weapon.min_range, 0)
  const max = Math.max(weapon.max_range, 0)
  if (min <= 1 && max <= 1) {
    return '1'
  }
  if (min <= 0) {
    return `${max}`
  }
  return `${min}-${max}`
}

export function formatWeaponDamage(weapon: WarcryWeaponProfile): string {
  return `${weapon.dmg_hit}/${weapon.dmg_crit}`
}
