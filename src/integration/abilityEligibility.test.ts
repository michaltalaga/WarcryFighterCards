import { describe, expect, it } from 'vitest'
import { isAbilityEligibleForFighter } from './abilityEligibility'
import type { WarcryAbility, WarcryFighter } from '../types/warcry'

const fighter: WarcryFighter = {
  _id: 'f1',
  name: 'Sample Fighter',
  warband: 'Skaven',
  subfaction: '',
  grand_alliance: 'chaos',
  movement: 5,
  toughness: 4,
  wounds: 12,
  points: 100,
  runemarks: ['hero', 'brute'],
  weapons: [],
}

function makeAbility(overrides: Partial<WarcryAbility>): WarcryAbility {
  return {
    _id: 'a1',
    name: 'Test Ability',
    warband: 'Skaven',
    cost: 'double',
    description: 'Test',
    runemarks: [],
    ...overrides,
  }
}

describe('isAbilityEligibleForFighter', () => {
  it('returns true when warband matches and all runemarks are present', () => {
    const ability = makeAbility({ runemarks: ['hero'] })
    expect(isAbilityEligibleForFighter(ability, fighter)).toBe(true)
  })

  it('returns false when warband does not match', () => {
    const ability = makeAbility({ warband: 'Stormcast' })
    expect(isAbilityEligibleForFighter(ability, fighter)).toBe(false)
  })

  it('returns false when any required runemark is missing', () => {
    const ability = makeAbility({ runemarks: ['hero', 'destroyer'] })
    expect(isAbilityEligibleForFighter(ability, fighter)).toBe(false)
  })
})
