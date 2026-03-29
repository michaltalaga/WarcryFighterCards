import fs from 'node:fs/promises'
import type { WarcryFighter, WarcryWeaponProfile } from '../types/warcry'

type UnknownRecord = Record<string, unknown>

function asNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected numeric field ${fieldName}`)
  }
  return value
}

function asString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string field ${fieldName}`)
  }
  return value
}

function asStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Expected string[] field ${fieldName}`)
  }
  return value
}

function toWeaponProfile(raw: unknown): WarcryWeaponProfile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid weapon profile entry')
  }

  const record = raw as UnknownRecord
  return {
    attacks: asNumber(record.attacks, 'weapons[].attacks'),
    dmg_crit: asNumber(record.dmg_crit, 'weapons[].dmg_crit'),
    dmg_hit: asNumber(record.dmg_hit, 'weapons[].dmg_hit'),
    max_range: asNumber(record.max_range, 'weapons[].max_range'),
    min_range: asNumber(record.min_range, 'weapons[].min_range'),
    runemark: asString(record.runemark, 'weapons[].runemark'),
    strength: asNumber(record.strength, 'weapons[].strength'),
  }
}

function toWarcryFighter(raw: unknown): WarcryFighter {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid fighter entry')
  }

  const record = raw as UnknownRecord

  if (!Array.isArray(record.weapons)) {
    throw new Error('Expected weapons array')
  }

  return {
    _id: asString(record._id, '_id'),
    name: asString(record.name, 'name'),
    warband: asString(record.warband, 'warband'),
    subfaction: asString(record.subfaction, 'subfaction'),
    grand_alliance: asString(record.grand_alliance, 'grand_alliance'),
    movement: asNumber(record.movement, 'movement'),
    toughness: asNumber(record.toughness, 'toughness'),
    wounds: asNumber(record.wounds, 'wounds'),
    points: asNumber(record.points, 'points'),
    runemarks: asStringArray(record.runemarks, 'runemarks'),
    weapons: record.weapons.map((entry) => toWeaponProfile(entry)),
  }
}

export async function readWarcryFightersFromFile(file: string | URL): Promise<WarcryFighter[]> {
  const rawText = await fs.readFile(file, 'utf8')
  const payload = JSON.parse(rawText) as unknown

  if (!Array.isArray(payload)) {
    throw new Error('Expected top-level fighters JSON array')
  }

  return payload.map((entry) => toWarcryFighter(entry))
}
