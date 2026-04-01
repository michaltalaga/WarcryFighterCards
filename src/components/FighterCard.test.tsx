import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FighterCard } from './FighterCard'
import { getUiText } from '../i18n/uiText'
import type { ImportedCard } from '../types/cards'

const card: ImportedCard = {
  importedName: 'Sample Fighter',
  fighter: {
    _id: 'fighter-1',
    name: 'Sample Fighter',
    warband: 'Skaven',
    subfaction: '',
    grand_alliance: 'chaos',
    movement: 5,
    toughness: 4,
    wounds: 12,
    points: 100,
    runemarks: ['hero'],
    weapons: [],
  },
  abilities: [],
  reactions: [],
}

describe('FighterCard runemark rendering', () => {
  it('keeps runemarks under the fighter name and drops the runemark header text', () => {
    const markup = renderToStaticMarkup(<FighterCard card={card} runemarkPlacement="under-name" ui={getUiText('en')} />)

    expect(markup).not.toContain('Runemarks')
    expect(markup).toContain('Hero')
    expect(markup.indexOf('Hero')).toBeLessThan(markup.indexOf('Move'))
  })
})
