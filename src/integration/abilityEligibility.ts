import type { WarcryAbility, WarcryFighter } from '../types/warcry'

export function isAbilityEligibleForFighter(
  ability: WarcryAbility,
  fighter: WarcryFighter,
): boolean {
  if (ability.warband !== fighter.warband) {
    return false
  }

  if (!ability.runemarks || ability.runemarks.length === 0) {
    return true
  }

  return ability.runemarks.every((runemark) => fighter.runemarks.includes(runemark))
}
