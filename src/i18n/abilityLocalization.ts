import type { WarcryAbility } from '../types/warcry'
import type { AppLocale } from './uiText'

export type WarcryAbilityTranslation = {
  _id: string
  name?: string
  description?: string
  sourceName?: string
  sourceDescription?: string
}

function normalizePath(filePath: string): string {
  return filePath.replaceAll('\\', '/').trim()
}

function pickLocalizedValue(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export function toAbilityTranslationPath(sourceAbilityPath: string, locale: AppLocale): string | null {
  if (locale === 'en') {
    return null
  }

  const normalized = normalizePath(sourceAbilityPath).replace(/^\/+/, '')
  if (!normalized.startsWith('warcry_data/data/') || !normalized.endsWith('_abilities.json')) {
    return null
  }

  const translatedPath = normalized
    .replace(/^warcry_data\//, `warcry_i18n/${locale}/`)
    .replace(/_abilities\.json$/, `_abilities.${locale}.json`)

  return `/${translatedPath}`
}

export function mergeAbilityTranslations(
  sourceAbilities: WarcryAbility[],
  translatedAbilities: WarcryAbilityTranslation[] | null | undefined,
): WarcryAbility[] {
  const translatedById = new Map(
    (translatedAbilities ?? [])
      .filter((entry) => typeof entry?._id === 'string' && entry._id.trim().length > 0)
      .map((entry) => [entry._id, entry]),
  )

  return sourceAbilities.map((sourceAbility) => {
    const translated = translatedById.get(sourceAbility._id)
    if (!translated) {
      return sourceAbility
    }

    return {
      ...sourceAbility,
      name: pickLocalizedValue(translated.name, sourceAbility.name),
      description: pickLocalizedValue(translated.description, sourceAbility.description),
    }
  })
}
