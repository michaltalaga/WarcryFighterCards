import { useMemo } from 'react'
import { formatGrandAllianceLabel, type AppLocale, type UiText } from '../i18n/uiText'
import type { WarcryAbility } from '../types/warcry'
import type { WarbandHeaderInfo } from '../types/cards'
import { buildFactionRunemarkCandidates } from '../utils/cardHelpers'
import { IconWithFallback } from './IconWithFallback'

type WarbandHeaderProps = {
  rosterName: string | null
  warbandInfo: WarbandHeaderInfo | null
  battleTraits: WarcryAbility[]
  locale: AppLocale
  ui: UiText
}

export function WarbandHeader({ rosterName, warbandInfo, battleTraits, locale, ui }: WarbandHeaderProps) {
  const runemarkCandidates = useMemo(
    () => (warbandInfo ? buildFactionRunemarkCandidates(warbandInfo) : []),
    [warbandInfo],
  )

  if (!rosterName && !warbandInfo) {
    return null
  }

  return (
    <article className="warband-header-card">
      <div className="warband-header-top">
        <div>
          <h2>{rosterName || ui.importedRosterFallback}</h2>
          {warbandInfo && (
            <p>
              {warbandInfo.warbandName} | {formatGrandAllianceLabel(warbandInfo.faction, locale)}
            </p>
          )}
        </div>
        {warbandInfo && (
          <IconWithFallback
            key={runemarkCandidates.join('|')}
            candidates={runemarkCandidates}
            alt={`${warbandInfo.warbandName} ${ui.runemarkLabel}`}
            className="faction-runemark"
          />
        )}
      </div>

      <section className="warband-traits">
        <h3>{ui.battleTraitsHeading}</h3>
        <ul className="abilities-list">
          {battleTraits.length === 0 ? (
            <li>{ui.noBattleTraits}</li>
          ) : (
            battleTraits.map((ability) => <li key={ability._id}>{ability.name}</li>)
          )}
        </ul>
      </section>
    </article>
  )
}
