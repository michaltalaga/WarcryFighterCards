import fs from 'node:fs/promises'
import type { WarcryAbility } from '../types/warcry'

type UnknownRecord = Record<string, unknown>

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

function toWarcryAbility(raw: unknown): WarcryAbility {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid ability entry')
  }

  const record = raw as UnknownRecord
  return {
    _id: asString(record._id, '_id'),
    name: asString(record.name, 'name'),
    warband: asString(record.warband, 'warband'),
    cost: asString(record.cost, 'cost'),
    description: asString(record.description, 'description'),
    runemarks: asStringArray(record.runemarks, 'runemarks'),
  }
}

export async function readWarcryAbilitiesFromFile(file: string | URL): Promise<WarcryAbility[]> {
  const rawText = await fs.readFile(file, 'utf8')
  const payload = JSON.parse(rawText) as unknown

  if (!Array.isArray(payload)) {
    throw new Error('Expected top-level abilities JSON array')
  }

  return payload.map((entry) => toWarcryAbility(entry))
}
