import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiceD6, faStar } from '@fortawesome/free-solid-svg-icons'
import type { ImportedCard } from '../types/cards'
import { getAbilityCostVisual } from '../utils/cardHelpers'

type CardBackProps = {
  card: ImportedCard
}

export function CardBack({ card }: CardBackProps) {
  const fighterName = card.fighter?.name ?? card.importedName
  const describedAbilities = [...card.abilities]
  const abilityCount = describedAbilities.length
  const densityClass = abilityCount >= 6 ? 'density-compact' : abilityCount >= 4 ? 'density-medium' : 'density-roomy'

  function renderAbilityCost(cost: string) {
    const visual = getAbilityCostVisual(cost)
    if (!visual) {
      return <span className="card-back-cost-text">{cost}</span>
    }

    if (visual.isPassive) {
      return (
        <span className="card-back-passive-badge" aria-label="Passive" title="Passive">
          <FontAwesomeIcon icon={faStar} className="card-back-passive-icon" />
        </span>
      )
    }

    return (
      <span className="card-back-dice-group" aria-label={visual.label} title={visual.label}>
        {Array.from({ length: visual.diceCount }).map((_, index) => (
          <FontAwesomeIcon key={index} icon={faDiceD6} className="card-back-dice-icon" />
        ))}
      </span>
    )
  }

  return (
    <article className={`fighter-card fighter-card-back ${densityClass}`} aria-label={`Back of ${fighterName}`}>
      <div className="card-back-frame">
        {describedAbilities.length === 0 ? (
          <p className="card-back-note">No matching abilities.</p>
        ) : (
          <ul className="card-back-ability-list">
            {describedAbilities.map((ability) => (
              <li key={ability._id} className="card-back-ability-item">
                <p className="card-back-ability-heading">
                  <span className="card-back-ability-name">{ability.name}</span>
                  <span className="card-back-ability-cost">{renderAbilityCost(ability.cost)}</span>
                </p>
                <p className="card-back-ability-description">{ability.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
