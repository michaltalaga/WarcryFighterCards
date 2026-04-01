import { LOCALE_OPTIONS, type AppLocale, type UiText } from '../i18n/uiText'

type LanguagePickerProps = {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  ui: UiText
}

export function LanguagePicker({ locale, onSelect, ui }: LanguagePickerProps) {
  return (
    <div className="language-picker">
      <label className="language-picker-label" htmlFor="language-picker-select">
        {ui.languageLabel}
      </label>
      <div className="language-picker-select-wrap">
        <select
          id="language-picker-select"
          className="language-picker-select"
          aria-label={ui.languagePickerAriaLabel}
          value={locale}
          onChange={(event) => onSelect(event.target.value as AppLocale)}
        >
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code} lang={option.code}>
              {option.nativeName}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
