import type { ImportedCard } from '../types/cards'
import { characteristicIconPath } from '../utils/cardHelpers'
import { FighterRunemarkBadge } from './FighterRunemarkBadge'
import { WeaponSection } from './WeaponSection'
import { AbilitySection } from './AbilitySection'

type FighterCardProps = {
  card: ImportedCard
}

export function FighterCard({ card }: FighterCardProps) {
  const fighterName = card.fighter?.name ?? card.importedName

  return (
    <article className="fighter-card">
      <div className="fighter-card-header">
        <h2>{fighterName}</h2>
        {card.fighter && <span className="points-pill">{card.fighter.points} pts</span>}
      </div>

      {card.fighter ? (
        <>
          <div className="fighter-card-body">
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

            <section>
              <h3>Runemarks</h3>
              <ul className="runemarks-list">
                {card.fighter.runemarks.length === 0 ? (
                  <li>No runemarks</li>
                ) : (
                  card.fighter.runemarks.map((runemark) => (
                    <li key={`${card.fighter?._id}-${runemark}`}>
                      <FighterRunemarkBadge runemark={runemark} />
                    </li>
                  ))
                )}
              </ul>
            </section>

            <WeaponSection fighterId={card.fighter._id} weapons={card.fighter.weapons} />
            <AbilitySection abilities={card.abilities} />

            <section className="reactions-section">
              <h3>Reactions</h3>
              <ul className="abilities-list">
                {card.reactions.length === 0 ? (
                  <li>No matching reactions</li>
                ) : (
                  card.reactions.map((ability) => <li key={ability._id}>{ability.name}</li>)
                )}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <p className="unmatched">No fighter data match found in detected warband.</p>
      )}
    </article>
  )
}
