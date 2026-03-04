import { useState, useEffect, useCallback } from 'react'

const CONTRACT_ID = 1

const BID_STRATEGIES = [
  { id: 'aggressive',   label: 'Aggressive',   note: '−10% vs. lowest competitor', pct: -0.10 },
  { id: 'moderate',     label: 'Moderate',     note: '±0% vs. lowest competitor',  pct:  0.00 },
  { id: 'conservative', label: 'Conservative', note: '+5% vs. lowest competitor',  pct:  0.05 },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt$ = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(n)

// ─── Data processing ──────────────────────────────────────────────────────────

/**
 * Sum a derived value across all CLINs for one competitor column.
 * Returns null if no CLIN entry has a usable breakdown.
 */
function sumOverClins(clins, colKey, fn) {
  let total = 0
  let hasAny = false
  for (const clin of clins) {
    const entry = clin.entries.find((e) => (e.competitorId ?? 'own') === colKey)
    if (!entry?.breakdown) continue
    const v = fn(entry.breakdown)
    if (v == null) continue
    hasAny = true
    total += v
  }
  return hasAny ? total : null
}

function buildTable(data, strategy) {
  const { clins, totals } = data
  if (!totals.length) return null

  // Columns are already sorted by totalTep ascending from the API
  const columns = totals.map((t) => ({
    id: t.competitorId,           // null = own estimate
    key: t.competitorId ?? 'own', // stable string key
    name: t.competitorName,
    totalTep: t.totalTep,
    isLowest: false,
  }))

  // Lowest = the competitor (not own) with the smallest totalTep (first in sorted list)
  const compCols = columns.filter((c) => c.id !== null)
  if (compCols.length > 0) compCols[0].isLowest = true

  const lowestCompTEP = compCols[0]?.totalTep ?? null
  const ptwTarget = lowestCompTEP != null ? lowestCompTEP * (1 + strategy.pct) : null

  // ── Breakdown rows: aggregate Steps 1-7 across all CLINs ──────────────────
  const breakdownRows = [
    {
      key: 'direct-labor',
      label: 'Direct Labor',
      cells: Object.fromEntries(
        columns.map((col) => [
          col.key,
          sumOverClins(clins, col.key, (bd) => {
            if (!Array.isArray(bd.laborBreakdown)) return null
            return bd.laborBreakdown.reduce((s, l) => s + (l.directLabor ?? 0), 0)
          }),
        ]),
      ),
    },
    {
      key: 'overhead',
      label: 'Overhead (OH)',
      cells: Object.fromEntries(
        columns.map((col) => [
          col.key,
          sumOverClins(clins, col.key, (bd) => {
            if (!Array.isArray(bd.laborBreakdown) || bd.totalLoadedLabor == null) return null
            const dl = bd.laborBreakdown.reduce((s, l) => s + (l.directLabor ?? 0), 0)
            return bd.totalLoadedLabor - dl
          }),
        ]),
      ),
    },
    {
      key: 'ga',
      label: 'G&A',
      cells: Object.fromEntries(
        columns.map((col) => [
          col.key,
          sumOverClins(clins, col.key, (bd) => {
            if (bd.totalCost == null || bd.costBeforeGA == null) return null
            return bd.totalCost - bd.costBeforeGA
          }),
        ]),
      ),
    },
    {
      key: 'fee',
      label: 'Fee',
      cells: Object.fromEntries(
        columns.map((col) => [
          col.key,
          sumOverClins(clins, col.key, (bd) => bd.fee ?? null),
        ]),
      ),
    },
  ]

  const hasBreakdown = breakdownRows.some((r) =>
    Object.values(r.cells).some((v) => v != null),
  )

  // ── CLIN subtotals ────────────────────────────────────────────────────────
  const clinRows = clins.map((clin) => ({
    clinId: clin.clinId,
    clinNumber: clin.clinNumber,
    description: clin.description,
    isOption: clin.isOption,
    cells: Object.fromEntries(
      columns.map((col) => {
        const entry = clin.entries.find((e) => (e.competitorId ?? 'own') === col.key)
        return [col.key, entry?.totalPrice ?? null]
      }),
    ),
  }))

  return { columns, breakdownRows, hasBreakdown, clinRows, ptwTarget, strategy }
}

// ─── Tiny primitives ──────────────────────────────────────────────────────────

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  )
}

function SectionDivider({ label, colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-y border-gray-200"
      >
        {label}
      </td>
    </tr>
  )
}

// ─── Inner table (pure display) ───────────────────────────────────────────────

function TEPTableInner({ tableData }) {
  const { columns, breakdownRows, hasBreakdown, clinRows, ptwTarget, strategy } = tableData
  const totalCols = columns.length + 1 // +1 for label column

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {/* ── Column headers ────────────────────────────────────── */}
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200 min-w-[200px]"
            >
              Cost Element
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-right text-xs uppercase tracking-wider border-b border-gray-200 min-w-[150px] ${
                  col.isLowest
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                <div className="font-semibold">{col.name}</div>
                {col.isLowest && (
                  <div className="mt-0.5 text-green-600 font-normal normal-case tracking-normal">
                    ★ Lowest
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ── Cost Breakdown ──────────────────────────────────── */}
          {hasBreakdown && (
            <>
              <SectionDivider label="Cost Breakdown" colSpan={totalCols} />
              {breakdownRows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="sticky left-0 bg-white px-4 py-2.5 pl-8 text-sm text-gray-500">
                    {row.label}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 text-right tabular-nums text-sm ${
                        col.isLowest ? 'bg-green-50 text-green-700' : 'text-gray-600'
                      }`}
                    >
                      {fmt$(row.cells[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          )}

          {/* ── CLIN Subtotals ──────────────────────────────────── */}
          <SectionDivider label="CLIN Subtotals" colSpan={totalCols} />
          {clinRows.map((clin) => (
            <tr
              key={clin.clinId}
              className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors"
            >
              <td className="sticky left-0 bg-white px-4 py-2.5 pl-8">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-800 text-xs">
                    {clin.clinNumber}
                  </span>
                  {clin.isOption && (
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      OY
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{clin.description}</p>
              </td>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 text-right tabular-nums text-sm ${
                    col.isLowest ? 'bg-green-50 text-green-700' : 'text-gray-600'
                  }`}
                >
                  {fmt$(clin.cells[col.key])}
                </td>
              ))}
            </tr>
          ))}

          {/* ── Total TEP ───────────────────────────────────────── */}
          <tr className="border-t-2 border-gray-300">
            <td className="sticky left-0 bg-gray-50 px-4 py-3 font-bold text-gray-900 text-sm">
              TOTAL TEP
            </td>
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-4 py-3 text-right font-bold tabular-nums text-sm ${
                  col.isLowest
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-50 text-gray-800'
                }`}
              >
                {fmt$(col.totalTep)}
              </td>
            ))}
          </tr>

          {/* ── PTW Target ──────────────────────────────────────── */}
          <tr className="border-t border-amber-200 bg-amber-50">
            <td className="sticky left-0 bg-amber-50 px-4 py-3">
              <div className="font-semibold text-amber-800 text-sm">PTW Target</div>
              <div className="text-xs text-amber-600 mt-0.5">{strategy.note}</div>
            </td>
            <td
              colSpan={columns.length}
              className="px-4 py-3 text-right bg-amber-50"
            >
              <span className="font-bold text-amber-800 tabular-nums text-sm">
                {fmt$(ptwTarget)}
              </span>
              {ptwTarget != null && (
                <span className="ml-3 text-xs text-amber-600">
                  = {fmt$(columns.find((c) => c.isLowest)?.totalTep)} ×{' '}
                  {(1 + strategy.pct).toFixed(2)}
                </span>
              )}
              {ptwTarget == null && (
                <span className="text-xs text-amber-500 ml-2">
                  (run Calculate to populate competitor data)
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function TEPTable() {
  const [scenarios, setScenarios] = useState([])
  const [scenarioId, setScenarioId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)
  const [strategy, setStrategy] = useState(BID_STRATEGIES[0])

  // ── Bootstrap: load scenario list ─────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/scenarios?contractId=${CONTRACT_ID}`)
      .then((r) => r.json())
      .then((scens) => {
        setScenarios(scens)
        const baseline = scens.find((s) => s.isBaseline) ?? scens[0]
        if (baseline) setScenarioId(baseline.id)
      })
      .catch(console.error)
  }, [])

  // ── Load results ──────────────────────────────────────────────────────────
  const loadResults = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/scenarios/${id}/results`)
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (scenarioId) loadResults(scenarioId)
  }, [scenarioId, loadResults])

  // ── Calculate ─────────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    if (!scenarioId) return
    setCalculating(true)
    setError(null)
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? res.statusText)
      }
      await loadResults(scenarioId)
    } catch (e) {
      setError(e.message)
    } finally {
      setCalculating(false)
    }
  }

  const tableData = data && !loading ? buildTable(data, strategy) : null
  const isEmpty = data && data.totals.length === 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Page header + controls ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">TEP Calculator</h1>
            <p className="text-sm text-gray-500 mt-1">
              Total Evaluated Price by competitor and cost element
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Scenario selector */}
            <select
              value={scenarioId ?? ''}
              onChange={(e) => setScenarioId(Number(e.target.value))}
              disabled={calculating}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isBaseline ? ' ★' : ''}
                </option>
              ))}
            </select>

            {/* Calculate button */}
            <button
              onClick={handleCalculate}
              disabled={calculating || loading || !scenarioId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {calculating ? (
                <>
                  <Spinner />
                  Calculating…
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round" strokeLinejoin="round"
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Calculate
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Win strategy selector ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Win Strategy:</span>
          {BID_STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStrategy(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                strategy.id === s.id
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-700'
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="text-xs text-gray-400">{strategy.note}</span>
        </div>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <svg
              className="h-4 w-4 mt-0.5 shrink-0"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
            >
              <path
                strokeLinecap="round" strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-64 flex items-center justify-center gap-3 text-gray-400">
            <Spinner className="h-5 w-5 text-blue-500" />
            <span className="text-sm">Loading results…</span>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!loading && isEmpty && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <svg
              className="h-12 w-12 text-gray-200 mx-auto mb-4"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path
                strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
            </svg>
            <p className="text-gray-500 text-sm font-medium">No results yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Click <strong className="text-gray-600">Calculate</strong> to run the TEP
              calculation for this scenario.
            </p>
          </div>
        )}

        {/* ── Results table ──────────────────────────────────────────────── */}
        {tableData && !loading && (
          <div
            className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative transition-opacity ${
              calculating ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            {/* Re-calculating overlay */}
            {calculating && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="flex items-center gap-2 bg-white rounded-lg shadow px-5 py-3 text-blue-600 font-medium text-sm border border-blue-100">
                  <Spinner className="h-5 w-5 text-blue-600" />
                  Running calculation…
                </div>
              </div>
            )}
            <TEPTableInner tableData={tableData} />
          </div>
        )}

      </div>
    </div>
  )
}
