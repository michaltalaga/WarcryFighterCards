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
    '--card-back-list-gap': abilityCount >= 6 ? '0.2rem' : abilityCount >= 4 ? '0.24rem' : '0.3rem',
    '--card-back-item-pad': abilityCount >= 6 ? '0.14rem' : abilityCount >= 4 ? '0.18rem' : '0.22rem',
    '--card-back-name-size': abilityCount >= 6 ? '0.78rem' : abilityCount >= 4 ? '0.84rem' : '0.9rem',
    '--card-back-cost-size': abilityCount >= 6 ? '0.68rem' : abilityCount >= 4 ? '0.72rem' : '0.76rem',
    '--card-back-dice-size': abilityCount >= 6 ? '0.74rem' : abilityCount >= 4 ? '0.8rem' : '0.86rem',
    '--card-back-desc-size': abilityCount >= 6 ? '0.62rem' : abilityCount >= 4 ? '0.68rem' : '0.74rem',
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
