import type { UiText } from '../i18n/uiText'
import type { ImportedCard } from '../types/cards'
import { characteristicIconPath } from '../utils/cardHelpers'
import { FighterRunemarkBadge } from './FighterRunemarkBadge'
import { WeaponSection } from './WeaponSection'
import { AbilitySection } from './AbilitySection'

type FighterCardProps = {
  card: ImportedCard
  runemarkPlacement: 'under-name' | 'bottom'
  ui: UiText
}

export function FighterCard({ card, runemarkPlacement, ui }: FighterCardProps) {
  const fighterName = card.fighter?.name ?? card.importedName

  function renderRunemarksSection(extraClassName?: string) {
    return (
      <section className={extraClassName}>
        <ul className="runemarks-list">
          {card.fighter?.runemarks.length === 0 ? (
            <li>{ui.noRunemarks}</li>
          ) : (
            card.fighter?.runemarks.map((runemark) => (
              <li key={`${card.fighter?._id}-${runemark}`}>
                <FighterRunemarkBadge runemark={runemark} />
              </li>
            ))
          )}
        </ul>
      </section>
    )
  }

  return (
    <article className="fighter-card">
      <div className="fighter-card-header">
        <h2>{fighterName}</h2>
        {card.fighter && (
          <span className="points-pill" aria-label={ui.pointsAriaLabel(card.fighter.points)}>
            <span className="points-value">{card.fighter.points}</span>
            <span className="points-unit">{ui.pointsUnit}</span>
          </span>
        )}
      </div>

      {card.fighter ? (
        <>
          <div className="fighter-card-body">
            {runemarkPlacement === 'under-name' && renderRunemarksSection('runemarks-under-name')}

            <h3>{ui.statsHeading}</h3>
            <dl className="stats-grid">
              <div>
                <dt>
                  <img className="stat-icon" src={characteristicIconPath('move')} alt={ui.moveLabel} />
                </dt>
                <dd>{card.fighter.movement}</dd>
              </div>
              <div>
                <dt>
                  <img className="stat-icon" src={characteristicIconPath('toughness')} alt={ui.toughnessLabel} />
                </dt>
                <dd>{card.fighter.toughness}</dd>
              </div>
              <div>
                <dt>
                  <img className="stat-icon" src={characteristicIconPath('wounds')} alt={ui.woundsLabel} />
                </dt>
                <dd>{card.fighter.wounds}</dd>
              </div>
            </dl>

            <WeaponSection fighterId={card.fighter._id} weapons={card.fighter.weapons} ui={ui} />

            <AbilitySection abilities={card.abilities} ui={ui} />

            <section className={runemarkPlacement === 'bottom' ? '' : 'reactions-section'}>
              <h3>{ui.reactionsHeading}</h3>
              <ul className="abilities-list">
                {card.reactions.length === 0 ? (
                  <li>{ui.noMatchingReactions}</li>
                ) : (
                  card.reactions.map((ability) => <li key={ability._id}>{ability.name}</li>)
                )}
              </ul>
            </section>

            {runemarkPlacement === 'bottom' && renderRunemarksSection('runemarks-bottom')}
          </div>
        </>
      ) : (
        <p className="unmatched">{ui.unmatchedFighter}</p>
      )}
    </article>
  )
}
