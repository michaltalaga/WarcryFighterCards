import { describe, expect, it } from 'vitest'
import type { WarcryAbility } from '../types/warcry'
import { mergeAbilityTranslations, toAbilityTranslationPath } from './abilityLocalization'

function makeAbility(overrides: Partial<WarcryAbility>): WarcryAbility {
  return {
    _id: 'ability-1',
    name: 'Rush',
    warband: 'universal',
    cost: 'double',
    description: 'Add 1 to the Move characteristic.',
    runemarks: [],
    ...overrides,
  }
}

describe('toAbilityTranslationPath', () => {
  it('maps source ability files to Polish companion files', () => {
    expect(toAbilityTranslationPath('/warcry_data/data/chaos/skaven/skaven_abilities.json', 'pl')).toBe(
      '/warcry_i18n/pl/data/chaos/skaven/skaven_abilities.pl.json',
    )
  })

  it('returns null for English source loading', () => {
    expect(toAbilityTranslationPath('/warcry_data/data/chaos/skaven/skaven_abilities.json', 'en')).toBeNull()
  })
})

describe('mergeAbilityTranslations', () => {
  it('overlays translated name and description by ability id', () => {
    const sourceAbilities = [
      makeAbility({ _id: 'a1', name: 'Rush', description: 'Move faster.' }),
      makeAbility({ _id: 'a2', name: 'Onslaught', description: 'Attack harder.', cost: 'triple' }),
    ]

    const merged = mergeAbilityTranslations(sourceAbilities, [
      {
        _id: 'a1',
        name: 'Szarża',
        description: 'Poruszaj się szybciej.',
      },
      {
        _id: 'a2',
        name: '   ',
        description: '',
      },
    ])

    expect(merged).toEqual([
      makeAbility({ _id: 'a1', name: 'Szarża', description: 'Poruszaj się szybciej.' }),
      makeAbility({ _id: 'a2', name: 'Onslaught', description: 'Attack harder.', cost: 'triple' }),
    ])
  })
})
