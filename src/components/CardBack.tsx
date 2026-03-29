import type { ImportedCard, WarbandHeaderInfo } from '../types/cards'

type CardBackProps = {
  card: ImportedCard
  warbandInfo: WarbandHeaderInfo | null
}

export function CardBack({ card, warbandInfo }: CardBackProps) {
  const fighterName = card.fighter?.name ?? card.importedName
  const warbandName = warbandInfo?.warbandName ?? warbandInfo?.warbandSlug ?? 'Warband'

  return (
    <article className="fighter-card fighter-card-back" aria-label={`Back of ${fighterName}`}>
      <div className="card-back-frame">
        <p className="card-back-overline">Warcry Fighter Card</p>
        <h2>{fighterName}</h2>
        <p className="card-back-warband">{warbandName}</p>
        <div className="card-back-divider" aria-hidden="true" />
        <p className="card-back-note">Print backs as a separate job, then manually pair with fronts.</p>
      </div>
    </article>
  )
}
