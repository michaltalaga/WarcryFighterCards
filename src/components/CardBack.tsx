import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiceD6, faStar } from '@fortawesome/free-solid-svg-icons'
import type { CSSProperties } from 'react'
import type { ImportedCard } from '../types/cards'
import { getAbilityCostVisual } from '../utils/cardHelpers'

type CardBackProps = {
  card: ImportedCard
}

export function CardBack({ card }: CardBackProps) {
  const fighterName = card.fighter?.name ?? card.importedName
  const describedAbilities = [...card.abilities, ...card.reactions]
  const abilityCount = describedAbilities.length

  const backStyle = {
    '--card-back-list-gap': abilityCount >= 6 ? '0.08rem' : abilityCount >= 4 ? '0.12rem' : '0.16rem',
    '--card-back-item-pad': abilityCount >= 6 ? '0.08rem' : abilityCount >= 4 ? '0.11rem' : '0.14rem',
    '--card-back-name-size': abilityCount >= 6 ? '0.5rem' : abilityCount >= 4 ? '0.54rem' : '0.57rem',
    '--card-back-cost-size': abilityCount >= 6 ? '0.4rem' : abilityCount >= 4 ? '0.43rem' : '0.46rem',
    '--card-back-dice-size': abilityCount >= 6 ? '0.44rem' : abilityCount >= 4 ? '0.48rem' : '0.52rem',
    '--card-back-desc-size': abilityCount >= 6 ? '0.4rem' : abilityCount >= 4 ? '0.42rem' : '0.45rem',
    '--card-back-desc-lines': abilityCount >= 6 ? '1' : abilityCount >= 4 ? '2' : '3',
  } as CSSProperties

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
    <article className="fighter-card fighter-card-back" aria-label={`Back of ${fighterName}`} style={backStyle}>
      <div className="card-back-frame">
        {describedAbilities.length === 0 ? (
          <p className="card-back-note">No matching abilities or reactions.</p>
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
