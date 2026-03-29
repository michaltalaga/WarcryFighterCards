import { useEffect, useMemo, useState } from 'react'
import { parseWarcrierRoster, type ImportedRoster } from './import/warcrierImport'
import { buildRosterSelection } from './integration/rosterSelection'
import type { WarcryAbility as Ability, WarcryFighter as Fighter } from './types/warcry'
import './App.css'

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

type PendingRosterImport = {
  roster: ImportedRoster
  targetWarbandKey: string | null
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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['".,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeDefaultCounts(fighters: Fighter[], value: number): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const fighter of fighters) {
    counts[fighter._id] = value
  }
  return counts
}

function findWarbandKey(manifest: Manifest | null, warbandName: string | null): string | null {
  if (!manifest || !warbandName) {
    return null
  }

  const normalizedTarget = normalizeText(warbandName).replace(/\s+/g, '_')

  const exact = manifest.warbands.find(
    (entry) => normalizeText(entry.warbandSlug) === normalizeText(normalizedTarget),
  )
  if (exact) {
    return exact.key
  }

  const loose = manifest.warbands.find(
    (entry) =>
      normalizeText(entry.warbandSlug).includes(normalizeText(warbandName)) ||
      normalizeText(warbandName).includes(normalizeText(entry.warbandSlug)),
  )
  return loose?.key ?? null
}

function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [selectedWarbandKey, setSelectedWarbandKey] = useState('')
  const [fighters, setFighters] = useState<Fighter[]>([])
  const [abilities, setAbilities] = useState<Ability[]>([])
  const [selectedFighterCounts, setSelectedFighterCounts] = useState<Record<string, number>>({})
  const [nameFilter, setNameFilter] = useState('')
  const [rosterText, setRosterText] = useState('')
  const [pendingRosterImport, setPendingRosterImport] = useState<PendingRosterImport | null>(null)
  const [importStatus, setImportStatus] = useState('')
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
        setSelectedFighterCounts(makeDefaultCounts(fightersData, 0))
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

  const printableCards = useMemo(() => {
    const cards: Array<{ fighter: Fighter; copy: number }> = []

    for (const fighter of fighters) {
      const count = Math.max(0, selectedFighterCounts[fighter._id] ?? 0)
      for (let copy = 1; copy <= count; copy += 1) {
        cards.push({ fighter, copy })
      }
    }

    return cards
  }, [fighters, selectedFighterCounts])

  useEffect(() => {
    if (!pendingRosterImport) {
      return
    }

    if (
      pendingRosterImport.targetWarbandKey &&
      selectedWarbandKey !== pendingRosterImport.targetWarbandKey
    ) {
      return
    }

    if (loading) {
      return
    }
    if (fighters.length === 0) {
      return
    }

    const result = buildRosterSelection(fighters, pendingRosterImport.roster)
    setSelectedFighterCounts(result.countsByFighterId)
    setPendingRosterImport(null)

    const base = `Roster imported: matched ${result.matched}/${pendingRosterImport.roster.fighters.length}`
    if (result.unmatched.length > 0) {
      setImportStatus(`${base}. Unmatched: ${result.unmatched.join(', ')}`)
      return
    }

    setImportStatus(base)
  }, [fighters, pendingRosterImport, loading, selectedWarbandKey])

  function setFighterCount(fighterId: string, nextCount: number) {
    setSelectedFighterCounts((current) => {
      const bounded = Number.isNaN(nextCount) ? 0 : Math.max(0, Math.floor(nextCount))
      return {
        ...current,
        [fighterId]: bounded,
      }
    })
  }

  function selectAllFiltered() {
    setSelectedFighterCounts((current) => {
      const next = { ...current }
      for (const fighter of filteredFighters) {
        next[fighter._id] = Math.max(1, next[fighter._id] ?? 0)
      }
      return next
    })
  }

  function clearAllFiltered() {
    setSelectedFighterCounts((current) => {
      const next = { ...current }
      for (const fighter of filteredFighters) {
        next[fighter._id] = 0
      }
      return next
    })
  }

  function importRoster() {
    const parsed = parseWarcrierRoster(rosterText)
    const importedFighterNames = parsed.fighters.map((fighter) => fighter.name)

    if (importedFighterNames.length === 0) {
      setImportStatus('No fighter lines found. Paste the full Warcrier export block.')
      return
    }

    const rosterWarbandKey = findWarbandKey(manifest, parsed.warband)
    setPendingRosterImport({
      roster: parsed,
      targetWarbandKey: rosterWarbandKey,
    })

    if (rosterWarbandKey && rosterWarbandKey !== selectedWarbandKey) {
      setSelectedWarbandKey(rosterWarbandKey)
      setImportStatus(`Detected ${parsed.warband ?? 'warband'} and switched warband before import.`)
      return
    }

    setImportStatus('Roster queued. Applying as soon as fighter data is loaded.')
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
          <strong>{printableCards.length}</strong>
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

      <section className="roster-import no-print">
        <p className="roster-title">Import Warcrier Roster Text</p>
        <textarea
          rows={8}
          value={rosterText}
          onChange={(event) => setRosterText(event.target.value)}
          placeholder="Paste the full Warcrier export text here"
        />
        <div className="button-row">
          <button type="button" onClick={importRoster}>
            Import roster
          </button>
        </div>
        {importStatus && <p className="status">{importStatus}</p>}
      </section>

      {error && <p className="status error no-print">{error}</p>}
      {loading && <p className="status no-print">Loading warband data...</p>}

      <section className="picker no-print">
        {filteredFighters.map((fighter) => {
          const count = selectedFighterCounts[fighter._id] ?? 0
          return (
            <label key={fighter._id} className="fighter-toggle">
              <input
                type="number"
                min={0}
                value={count}
                onChange={(event) => setFighterCount(fighter._id, Number(event.target.value))}
              />
              <span>{fighter.name}</span>
            </label>
          )
        })}
      </section>

      <section className="cards-grid">
        {printableCards.map(({ fighter, copy }) => {
          const fighterAbilities = abilities.filter((ability) =>
            abilityAppliesToFighter(ability, fighter),
          )

          const totalCopies = selectedFighterCounts[fighter._id] ?? 0

          return (
            <article key={`${fighter._id}-${copy}`} className="fighter-card">
              <header className="card-header">
                <h2>{fighter.name}</h2>
                <p>
                  {fighter.warband} | {fighter.points} pts
                  {totalCopies > 1 ? ` | Copy ${copy}/${totalCopies}` : ''}
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
