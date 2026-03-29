import fs from 'node:fs/promises'
import { parseWarcrierRoster, type ImportedRoster } from './warcrierImport'

export type RosterFileInput = string | URL

export async function readWarcrierRosterFile(file: RosterFileInput): Promise<string> {
  return fs.readFile(file, 'utf8')
}

export async function parseWarcrierRosterFile(file: RosterFileInput): Promise<ImportedRoster> {
  const raw = await readWarcrierRosterFile(file)
  return parseWarcrierRoster(raw)
}