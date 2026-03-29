import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Weapon = {
  attacks: number
  dmg_crit: number
  dmg_hit: number
  max_range: number
  min_range: number
  runemark: string
  strength: number
}

type Fighter = {
  _id: string
  name: string
  warband: string
  subfaction: string
  grand_alliance: string
  movement: number
  toughness: number
  wounds: number
  points: number
  runemarks: string[]
  weapons: Weapon[]
}

type Ability = {
  _id: string
  name: string
  warband: string
  cost: string
  description: string
  runemarks: string[]
}

type WarbandManifest = {
  key: string
  grandAlliance: string
  warbandSlug: string
  fightersPath: string
  abilitiesPath: string
}

type Manifest = {
  warbands: WarbandManifest[]
}

function normalizeCost(cost: string): string {
  const value = cost.trim().toLowerCase()
  if (!value) {
    return '-'
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function abilityAppliesToFighter(ability: Ability, fighter: Fighter): boolean {
  if (!ability.runemarks || ability.runemarks.length === 0) {
    return true
  }

  return ability.runemarks.every((runemark) => fighter.runemarks.includes(runemark))
}

function formatWarbandLabel(entry: WarbandManifest): string {
  return `${entry.grandAlliance} / ${entry.warbandSlug}`
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [selectedWarbandKey, setSelectedWarbandKey] = useState('')
  const [fighters, setFighters] = useState<Fighter[]>([])
  const [abilities, setAbilities] = useState<Ability[]>([])
  const [selectedFighterIds, setSelectedFighterIds] = useState<Set<string>>(new Set())
  const [nameFilter, setNameFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadManifest() {
      setError('')
      try {
        const response = await fetch('/warcry_data/manifest.json')
        if (!response.ok) {
          throw new Error(`Manifest request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as Manifest
        if (!active) {
          return
        }

        setManifest(payload)
        if (payload.warbands.length > 0) {
          setSelectedWarbandKey(payload.warbands[0].key)
        }
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load manifest')
      }
    }

    loadManifest()

    return () => {
      active = false
    }
  }, [])

  const selectedWarband = useMemo(() => {
    if (!manifest) {
      return null
    }

    return manifest.warbands.find((entry) => entry.key === selectedWarbandKey) ?? null
  }, [manifest, selectedWarbandKey])

  useEffect(() => {
    if (!selectedWarband) {
      return
    }

    const warband = selectedWarband

    let active = true

    async function loadWarbandData() {
      setLoading(true)
      setError('')
      try {
        const [fightersResponse, abilitiesResponse] = await Promise.all([
          fetch(warband.fightersPath),
          fetch(warband.abilitiesPath),
        ])

        if (!fightersResponse.ok) {
          throw new Error(`Fighters request failed with status ${fightersResponse.status}`)
        }
        if (!abilitiesResponse.ok) {
          throw new Error(`Abilities request failed with status ${abilitiesResponse.status}`)
        }

        const fightersData = (await fightersResponse.json()) as Fighter[]
        const abilitiesData = (await abilitiesResponse.json()) as Ability[]

        if (!active) {
          return
        }

        setFighters(fightersData)
        setAbilities(abilitiesData)
        setSelectedFighterIds(new Set(fightersData.map((fighter) => fighter._id)))
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load warband data')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadWarbandData()

    return () => {
      active = false
    }
  }, [selectedWarband])

  const filteredFighters = useMemo(() => {
    const query = nameFilter.trim().toLowerCase()
    if (!query) {
      return fighters
    }

    return fighters.filter((fighter) => fighter.name.toLowerCase().includes(query))
  }, [fighters, nameFilter])

  const printableFighters = useMemo(
    () => filteredFighters.filter((fighter) => selectedFighterIds.has(fighter._id)),
    [filteredFighters, selectedFighterIds],
  )

  function toggleFighterSelection(fighterId: string) {
    setSelectedFighterIds((current) => {
      const next = new Set(current)
      if (next.has(fighterId)) {
        next.delete(fighterId)
      } else {
        next.add(fighterId)
      }
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedFighterIds((current) => {
      const next = new Set(current)
      for (const fighter of filteredFighters) {
        next.add(fighter._id)
      }
      return next
    })
  }

  function clearAllFiltered() {
    const filteredIds = new Set(filteredFighters.map((fighter) => fighter._id))
    setSelectedFighterIds((current) => {
      const next = new Set<string>()
      for (const id of current) {
        if (!filteredIds.has(id)) {
          next.add(id)
        }
      }
      return next
    })
  }

  return (
    <main className="app-shell">
      <header className="app-header no-print">
        <div>
          <p className="eyebrow">Warcry Fighter Card Builder</p>
          <h1>Printable Fighter Cards</h1>
          <p>Uses local static JSON from the source repository with no server runtime.</p>
        </div>
        <div className="print-summary">
          <strong>{printableFighters.length}</strong>
          <span>cards selected</span>
        </div>
      </header>

      <section className="controls no-print">
        <label>
          Warband
          <select
            value={selectedWarbandKey}
            onChange={(event) => setSelectedWarbandKey(event.target.value)}
            disabled={!manifest || manifest.warbands.length === 0}
          >
            {(manifest?.warbands ?? []).map((entry) => (
              <option key={entry.key} value={entry.key}>
                {formatWarbandLabel(entry)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Filter fighters
          <input
            type="text"
            placeholder="Search by fighter name"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
          />
        </label>

        <div className="button-row">
          <button type="button" onClick={selectAllFiltered}>
            Select visible
          </button>
          <button type="button" onClick={clearAllFiltered}>
            Clear visible
          </button>
          <button type="button" className="print-button" onClick={() => window.print()}>
            Print cards
          </button>
        </div>
      </section>

      {error && <p className="status error no-print">{error}</p>}
      {loading && <p className="status no-print">Loading warband data...</p>}

      <section className="picker no-print">
        {filteredFighters.map((fighter) => {
          const checked = selectedFighterIds.has(fighter._id)
          return (
            <label key={fighter._id} className="fighter-toggle">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleFighterSelection(fighter._id)}
              />
              <span>{fighter.name}</span>
            </label>
          )
        })}
      </section>

      <section className="cards-grid">
        {printableFighters.map((fighter) => {
          const fighterAbilities = abilities.filter((ability) =>
            abilityAppliesToFighter(ability, fighter),
          )

          return (
            <article key={fighter._id} className="fighter-card">
              <header className="card-header">
                <h2>{fighter.name}</h2>
                <p>
                  {fighter.warband} | {fighter.points} pts
                </p>
              </header>

              <dl className="stats-grid">
                <div>
                  <dt>M</dt>
                  <dd>{fighter.movement}</dd>
                </div>
                <div>
                  <dt>T</dt>
                  <dd>{fighter.toughness}</dd>
                </div>
                <div>
                  <dt>W</dt>
                  <dd>{fighter.wounds}</dd>
                </div>
              </dl>

              <section>
                <h3>Weapons</h3>
                <ul className="compact-list">
                  {fighter.weapons.map((weapon, index) => (
                    <li key={`${fighter._id}-weapon-${index}`}>
                      <strong>{weapon.runemark || 'weapon'}</strong>
                      <span>
                        {weapon.min_range}-{weapon.max_range}\" | A {weapon.attacks} | S {weapon.strength} | D {weapon.dmg_hit}/{weapon.dmg_crit}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Abilities</h3>
                <ul className="abilities-list">
                  {fighterAbilities.map((ability) => (
                    <li key={ability._id}>
                      <p className="ability-head">
                        <strong>{ability.name}</strong>
                        <span>{normalizeCost(ability.cost)}</span>
                      </p>
                      <p>{ability.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
