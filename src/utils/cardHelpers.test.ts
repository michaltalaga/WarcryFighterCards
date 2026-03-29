import { describe, expect, it } from 'vitest'
import type { WarcryAbility, WarcryWeaponProfile } from '../types/warcry'
import { formatWeaponRange, sortAbilitiesByDice } from './cardHelpers'

function makeAbility(name: string, cost: string, id: string): WarcryAbility {
  return {
    _id: id,
    name,
    warband: 'Skaven',
    cost,
    description: 'Test ability',
    runemarks: [],
  }
}

describe('sortAbilitiesByDice', () => {
  it('sorts by dice value and then by name', () => {
    const abilities = [
      makeAbility('Warped Frenzy', 'triple', 'a'),
      makeAbility('Ambush', 'double', 'b'),
      makeAbility('Bellow', 'double', 'c'),
      makeAbility('Overpower', 'quad', 'd'),
      makeAbility('Always On', 'passive', 'e'),
    ]

    const sorted = sortAbilitiesByDice(abilities)

    expect(sorted.map((ability) => `${ability.cost}:${ability.name}`)).toEqual([
      'passive:Always On',
      'double:Ambush',
      'double:Bellow',
      'triple:Warped Frenzy',
      'quad:Overpower',
    ])
  })

  it('handles mixed casing/whitespace and keeps unknown costs last', () => {
    const abilities = [
      makeAbility('Zeta', ' reaction ', 'a'),
      makeAbility('Alpha', '  DOUBLE', 'b'),
      makeAbility('Gamma', 'battletrait', 'c'),
      makeAbility('Beta', 'Double ', 'd'),
      makeAbility('Omega', 'unknown', 'e'),
    ]

    const sorted = sortAbilitiesByDice(abilities)

    expect(sorted.map((ability) => ability.name)).toEqual(['Alpha', 'Beta', 'Gamma', 'Omega', 'Zeta'])
    expect(sorted[0].cost).toBe('  DOUBLE')
    expect(sorted[1].cost).toBe('Double ')
  })

  it('does not mutate the original array', () => {
    const abilities = [
      makeAbility('B', 'double', 'b'),
      makeAbility('A', 'double', 'a'),
    ]

    sortAbilitiesByDice(abilities)

    expect(abilities.map((ability) => ability.name)).toEqual(['B', 'A'])
  })
})

function makeWeapon(min_range: number, max_range: number): WarcryWeaponProfile {
  return {
    attacks: 1,
    dmg_crit: 2,
    dmg_hit: 1,
    max_range,
    min_range,
    runemark: 'melee',
    strength: 3,
  }
}

describe('formatWeaponRange', () => {
  it('renders melee as 1 without inch quote', () => {
    expect(formatWeaponRange(makeWeapon(1, 1))).toBe('1')
  })

  it('renders ranged values without inch quote', () => {
    expect(formatWeaponRange(makeWeapon(0, 8))).toBe('8')
    expect(formatWeaponRange(makeWeapon(3, 7))).toBe('3-7')
  })
})
