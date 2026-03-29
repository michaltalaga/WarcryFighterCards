import { useMemo, useState } from 'react'
import { parseWarcrierRoster } from './import/warcrierImport'
import './App.css'

function App() {
  const [rosterText, setRosterText] = useState('')
  const [rosterName, setRosterName] = useState<string | null>(null)
  const [warband, setWarband] = useState<string | null>(null)
  const [importedFighters, setImportedFighters] = useState<string[]>([])
  const [importStatus, setImportStatus] = useState('')

  const fighterTotals = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const fighterName of importedFighters) {
      counts[fighterName] = (counts[fighterName] ?? 0) + 1
    }
    return counts
  }, [importedFighters])

  function importRoster() {
    const parsed = parseWarcrierRoster(rosterText)
    const fighterNames = parsed.fighters.map((fighter) => fighter.name)

    if (fighterNames.length === 0) {
      setImportedFighters([])
      setImportStatus('No fighter lines found. Paste the full roster export block.')
      return
    }

    setRosterName(parsed.rosterName)
    setWarband(parsed.warband)
    setImportedFighters(fighterNames)
    setImportStatus(`Roster imported: ${fighterNames.length} fighters`)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Roster Import</h1>
        <p>Paste roster text. One card is generated for each imported fighter entry.</p>
      </header>

      <section className="roster-import">
        <p className="roster-title">Roster Text</p>
        <textarea
          rows={10}
          value={rosterText}
          onChange={(event) => setRosterText(event.target.value)}
          placeholder="Paste full roster export text here"
        />
        <button type="button" onClick={importRoster}>
          Import roster
        </button>
        {importStatus && <p className="status">{importStatus}</p>}
      </section>

      <section className="cards-grid">
        {importedFighters.map((fighterName, index) => {
          const copyNumber = importedFighters
            .slice(0, index + 1)
            .filter((name) => name === fighterName).length
          const totalCopies = fighterTotals[fighterName] ?? 1

          return (
            <article key={`${fighterName}-${index}`} className="fighter-card">
              <h2>{fighterName}</h2>
              <p>
                {rosterName || 'Imported Roster'}
                {warband ? ` | ${warband}` : ''}
                {totalCopies > 1 ? ` | Copy ${copyNumber}/${totalCopies}` : ''}
              </p>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
