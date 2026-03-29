import type { ImportedCard } from '../types/cards'
import { characteristicIconPath } from '../utils/cardHelpers'
import { FighterRunemarkBadge } from './FighterRunemarkBadge'
import { WeaponSection } from './WeaponSection'
import { AbilitySection } from './AbilitySection'

type FighterCardProps = {
  card: ImportedCard
  runemarkPlacement: 'under-name' | 'bottom'
}

export function FighterCard({ card, runemarkPlacement }: FighterCardProps) {
  const fighterName = card.fighter?.name ?? card.importedName

  function renderRunemarksSection(extraClassName?: string) {
    return (
      <section className={extraClassName}>
        <ul className="runemarks-list">
          {card.fighter?.runemarks.length === 0 ? (
            <li>No runemarks</li>
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
          <span className="points-pill" aria-label={`${card.fighter.points} points`}>
            <span className="points-value">{card.fighter.points}</span>
            <span className="points-unit">pts</span>
          </span>
        )}
      </div>

      {card.fighter ? (
        <>
          <div className="fighter-card-body">
            {runemarkPlacement === 'under-name' && renderRunemarksSection('runemarks-under-name')}

            <h3>Stats</h3>
            <dl className="stats-grid">
              <div>
                <dt>
                  <img className="stat-icon" src={characteristicIconPath('move')} alt="Move" />
                </dt>
                <dd>{card.fighter.movement}</dd>
              </div>
              <div>
                <dt>
                  <img className="stat-icon" src={characteristicIconPath('toughness')} alt="Toughness" />
                </dt>
                <dd>{card.fighter.toughness}</dd>
              </div>
              <div>
                <dt>
                  <img className="stat-icon" src={characteristicIconPath('wounds')} alt="Wounds" />
                </dt>
                <dd>{card.fighter.wounds}</dd>
              </div>
            </dl>

            <WeaponSection fighterId={card.fighter._id} weapons={card.fighter.weapons} />

            <AbilitySection abilities={card.abilities} />

            <section className={runemarkPlacement === 'bottom' ? '' : 'reactions-section'}>
              <h3>Reactions</h3>
              <ul className="abilities-list">
                {card.reactions.length === 0 ? (
                  <li>No matching reactions</li>
                ) : (
                  card.reactions.map((ability) => <li key={ability._id}>{ability.name}</li>)
                )}
              </ul>
            </section>

            {runemarkPlacement === 'bottom' && renderRunemarksSection('runemarks-bottom')}
          </div>
        </>
      ) : (
        <p className="unmatched">No fighter data match found in detected warband.</p>
      )}
    </article>
  )
}
