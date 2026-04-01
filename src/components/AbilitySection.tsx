import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiceD6, faStar } from '@fortawesome/free-solid-svg-icons'
import type { UiText } from '../i18n/uiText'
import type { WarcryAbility } from '../types/warcry'
import { getAbilityCostVisualWithLabels } from '../utils/cardHelpers'

type AbilitySectionProps = {
  abilities: WarcryAbility[]
  ui: UiText
}

export function AbilitySection({ abilities, ui }: AbilitySectionProps) {
  return (
    <section>
      <h3>{ui.abilitiesHeading}</h3>
      <ul className="abilities-list">
        {abilities.length === 0 ? (
          <li>{ui.noMatchingAbilities}</li>
        ) : (
          abilities.map((ability) => {
            const costVisual = getAbilityCostVisualWithLabels(ability.cost, ui.abilityCostLabels)
            return (
              <li key={ability._id} className="ability-line">
                <span className="ability-cost-slot">
                  {costVisual && !costVisual.isPassive && (
                    <span className="dice-group" aria-label={costVisual.label} title={costVisual.label}>
                      {Array.from({ length: costVisual.diceCount }).map((_, index) => (
                        <FontAwesomeIcon key={index} icon={faDiceD6} className="dice-icon" />
                      ))}
                    </span>
                  )}
                  {costVisual?.isPassive && (
                    <span
                      className="passive-badge"
                      aria-label={ui.abilityCostLabels.passive}
                      title={ui.abilityCostLabels.passive}
                    >
                      <FontAwesomeIcon icon={faStar} className="passive-icon" />
                    </span>
                  )}
                </span>
                <span className="ability-name">{ability.name}</span>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
