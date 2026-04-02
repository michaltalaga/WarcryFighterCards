import type { ImportedRoster } from '../import/warcrierImport'
import type { ImportedCard, Manifest, WarbandManifest } from '../types/cards'
import type { WarcryAbility, WarcryFighter } from '../types/warcry'
import { findBestFighterMatch, sortAbilitiesByDice } from '../utils/cardHelpers'
import { isAbilityEligibleForFighter } from './abilityEligibility'

type ResolveRosterImportOptions = {
  loadAbilities: (entry: WarbandManifest) => Promise<WarcryAbility[]>
  loadFighters: (entry: WarbandManifest) => Promise<WarcryFighter[]>
}

type FighterMatch = {
  fighter: WarcryFighter
  warbandEntry: WarbandManifest
}

export type ResolvedRosterImport = {
  battleTraits: WarcryAbility[]
  cards: ImportedCard[]
}

function isBattleTrait(ability: WarcryAbility): boolean {
  return ability.cost.trim().toLowerCase() === 'battletrait'
}

function isReaction(ability: WarcryAbility): boolean {
  return ability.cost.trim().toLowerCase() === 'reaction'
}

export async function resolveRosterImport(
  manifest: Manifest,
  importedRoster: ImportedRoster,
  warbandEntry: WarbandManifest,
  options: ResolveRosterImportOptions,
): Promise<ResolvedRosterImport> {
  const fighterCache = new Map<string, Promise<WarcryFighter[]>>()
  const abilityCache = new Map<string, Promise<WarcryAbility[]>>()

  function getFighters(entry: WarbandManifest): Promise<WarcryFighter[]> {
    const cached = fighterCache.get(entry.key)
    if (cached) {
      return cached
    }

    const pending = options.loadFighters(entry)
    fighterCache.set(entry.key, pending)
    return pending
  }

  function getAbilities(entry: WarbandManifest): Promise<WarcryAbility[]> {
    const cached = abilityCache.get(entry.key)
    if (cached) {
      return cached
    }

    const pending = options.loadAbilities(entry)
    abilityCache.set(entry.key, pending)
    return pending
  }

  const primaryFighters = await getFighters(warbandEntry)
  const primaryAbilities = await getAbilities(warbandEntry)
  const alliedEntries = manifest.warbands.filter(
    (entry) => entry.grandAlliance === warbandEntry.grandAlliance && entry.key !== warbandEntry.key,
  )

  async function resolveFighter(importedName: string): Promise<FighterMatch | null> {
    const primaryMatch = findBestFighterMatch(primaryFighters, importedName)
    if (primaryMatch) {
      return {
        fighter: primaryMatch,
        warbandEntry,
      }
    }

    for (const alliedEntry of alliedEntries) {
      const alliedFighters = await getFighters(alliedEntry)
      const alliedMatch = findBestFighterMatch(alliedFighters, importedName)
      if (alliedMatch) {
        return {
          fighter: alliedMatch,
          warbandEntry: alliedEntry,
        }
      }
    }

    return null
  }

  const matches: Array<FighterMatch | null> = []
  const extraAbilityEntries = new Map<string, WarbandManifest>()

  for (const importedFighter of importedRoster.fighters) {
    const match = await resolveFighter(importedFighter.name)
    matches.push(match)

    if (match && match.warbandEntry.key !== warbandEntry.key) {
      extraAbilityEntries.set(match.warbandEntry.key, match.warbandEntry)
    }
  }

  const extraAbilities = (
    await Promise.all([...extraAbilityEntries.values()].map((entry) => getAbilities(entry)))
  ).flat()
  const allAbilities = [...primaryAbilities, ...extraAbilities]

  const cards = importedRoster.fighters.map((importedFighter, index) => {
    const match = matches[index]
    if (!match) {
      return {
        importedName: importedFighter.name,
        fighter: null,
        abilities: [],
        reactions: [],
      }
    }

    const eligibleAbilities = allAbilities.filter((ability) =>
      isAbilityEligibleForFighter(ability, match.fighter),
    )

    return {
      importedName: importedFighter.name,
      fighter: match.fighter,
      abilities: sortAbilitiesByDice(
        eligibleAbilities.filter((ability) => !isReaction(ability) && !isBattleTrait(ability)),
      ),
      reactions: sortAbilitiesByDice(eligibleAbilities.filter((ability) => isReaction(ability))),
    }
  })

  return {
    battleTraits: sortAbilitiesByDice(primaryAbilities.filter((ability) => isBattleTrait(ability))),
    cards,
  }
}
