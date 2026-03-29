import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { extractDelimitedContent, parseWarcrierRoster } from './warcrierImport'

const rosterFixture = fs.readFileSync(
  new URL('./__fixtures__/warcrier-roster.txt', import.meta.url),
  'utf8',
)

const rosterContentFixture = fs.readFileSync(
  new URL('./__fixtures__/warcrier-roster.content.txt', import.meta.url),
  'utf8',
)

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd()
}

describe('extractDelimitedContent', () => {
  it('extracts only text between delimiter lines', () => {
    const result = extractDelimitedContent(rosterFixture);
    expect(normalizeLineEndings(result)).toBe(
      normalizeLineEndings(rosterContentFixture),
    )
  })
})

describe('parseWarcrierRoster', () => {
  it('parses the provided Warcrier export including duplicate fighters', () => {
    const parsed = parseWarcrierRoster(rosterFixture)

    expect(parsed).toEqual({
      rosterName: 'My Warband',
      warband: 'Skaven',
      fighters: [
        {
          name: 'Clawlord on Gnaw-Beast',
        },
        {
          name: 'Stormfiend with Doomflayer gauntlets',
        },
        {
          name: 'Warplock Jezzail',
        },
        {
          name: 'Warplock Jezzail',
        },
      ],
    })
  })
})