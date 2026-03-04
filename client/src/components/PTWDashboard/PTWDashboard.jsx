import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

// ─── Win Presets ──────────────────────────────────────────────────────────────

const WIN_PRESETS = [
  {
    id: 'strong-incumbent',
    label: 'Strong Incumbent',
    description:
      'You hold the current contract with excellent past performance. Transition risk and customer continuity preference work in your favor. You can price at or near market and still win.',
    bandLow: 0.97,
    bandHigh: 1.03,
    midpoint: 1.00,
  },
  {
    id: 'incumbent',
    label: 'Incumbent (Standard)',
    description:
      "You're re-competing with a solid track record, but aggressive challengers will undercut you. A modest discount from current contract value is typically required to hold the award.",
    bandLow: 0.94,
    bandHigh: 1.00,
    midpoint: 0.97,
  },
  {
    id: 'strong-challenger',
    label: 'Strong Challenger',
    description:
      'You have directly relevant experience and a competitive team, but face an entrenched incumbent. Price 5–10% below the expected lowest to overcome past-performance evaluation disadvantage.',
    bandLow: 0.89,
    bandHigh: 0.96,
    midpoint: 0.93,
  },
  {
    id: 'new-entrant',
    label: 'New Entrant / No PP',
    description:
      'Limited or no comparable past performance on this work type. Must price aggressively — 10–15% below market — to offset evaluation risk and signal commitment to the customer.',
    bandLow: 0.84,
    bandHigh: 0.92,
    midpoint: 0.88,
  },
  {
    id: 'lpta',
    label: 'LPTA',
    description:
      'Lowest Price Technically Acceptable evaluation. Award goes to the cheapest technically acceptable offeror. Price discipline is paramount — every dollar above the floor costs probability.',
    bandLow: 0.88,
    bandHigh: 0.94,
    midpoint: 0.91,
  },
  {
    id: 'sole-source',
    label: 'Sole Source / Price Reasonableness',
    description:
      'Non-competitive scenario. Pricing must be "fair and reasonable" relative to the IGCE and comparable market data. Wide band reflects negotiation latitude rather than competitive pressure.',
    bandLow: 0.90,
    bandHigh: 1.10,
    midpoint: 0.98,
  },
]

// ─── Constants & helpers ──────────────────────────────────────────────────────

const BAR_COLORS = {
  own: '#60a5fa',        // blue-400
  subk: '#c084fc',       // purple-400
  competitor: '#64748b', // slate-500
}

const fmtM = (v) =>
  v == null ? '—' : `$${(v / 1e6).toFixed(1)}M`

const fmtPct = (v, showPlus = true) =>
  v == null
    ? '—'
    : `${showPlus && v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`

function shortName(name) {
  return name
    .replace(/ Inc\.$/, '')
    .replace(/ \(Science Applications International Corporation\)$/, '')
    .replace(/^Own Estimate$/, 'Own Estimate ★')
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }
function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1) }

function calcWinProb(rec, low$, mid$, high$) {
  if (rec <= low$) {
    // Below band floor: 90% at floor → 75% far below (aggressive pricing lowers confidence)
    const t = clamp((low$ - rec) / (low$ * 0.15), 0, 1)
    return Math.round(lerp(90, 75, t))
  }
  if (rec <= mid$) {
    // Sweet spot — floor→midpoint: 95% → 85%
    const t = (rec - low$) / Math.max(1, mid$ - low$)
    return Math.round(lerp(95, 85, t))
  }
  if (rec <= high$) {
    // Midpoint→ceiling: 80% → 45% (midpoint is "at target" ~70-80%, ceiling is risky ~45-65%)
    const t = (rec - mid$) / Math.max(1, high$ - mid$)
    return Math.round(lerp(80, 45, t))
  }
  // Above band ceiling: 25% → 15%
  const t = clamp((rec - high$) / (high$ * 0.15), 0, 1)
  return Math.round(lerp(25, 15, t))
}

function probColor(p) {
  if (p >= 60) return { text: 'text-emerald-400', bar: 'bg-emerald-500', ring: 'ring-emerald-500/30' }
  if (p >= 40) return { text: 'text-amber-400',   bar: 'bg-amber-500',   ring: 'ring-amber-500/30'  }
  return              { text: 'text-red-400',      bar: 'bg-red-500',     ring: 'ring-red-500/30'    }
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, lowestTEP, recommendedPrice }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const vsLowest = lowestTEP && d.totalTep ? (d.totalTep - lowestTEP) / lowestTEP : null
  const vsTarget = recommendedPrice && d.totalTep ? (d.totalTep - recommendedPrice) / recommendedPrice : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl px-4 py-3 text-xs min-w-[200px] space-y-1.5">
      <p className="font-semibold text-sm text-white border-b border-slate-700 pb-1.5 mb-1.5">
        {d.fullName}
      </p>
      <Row label="Total TEP" value={fmtM(d.totalTep)} />
      {vsLowest != null && (
        <Row
          label="vs. Lowest Competitor"
          value={fmtPct(vsLowest)}
          color={vsLowest <= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      )}
      {vsTarget != null && (
        <Row
          label="vs. PTW Target"
          value={fmtPct(vsTarget)}
          color={vsTarget <= 0 ? 'text-emerald-400' : 'text-slate-400'}
        />
      )}
    </div>
  )
}

function Row({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="flex justify-between gap-6">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono tabular-nums font-medium ${color}`}>{value}</span>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  )
}

function StatCard({ label, value, sub, valueClass = 'text-white' }) {
  return (
    <div className="bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/60">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function WinProbMeter({ prob }) {
  const c = probColor(prob)
  return (
    <div className={`rounded-2xl p-5 border bg-slate-900 ${c.ring} ring-1 space-y-3`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Probability</p>
          <p className={`text-5xl font-extrabold tabular-nums mt-1 ${c.text}`}>{prob}%</p>
        </div>
        <div className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
          prob >= 60 ? 'border-emerald-700 text-emerald-400 bg-emerald-950'
          : prob >= 40 ? 'border-amber-700 text-amber-400 bg-amber-950'
          : 'border-red-800 text-red-400 bg-red-950'
        }`}>
          {prob >= 60 ? 'Favorable' : prob >= 40 ? 'Contested' : 'At Risk'}
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${c.bar}`}
          style={{ width: `${prob}%` }}
        />
      </div>
    </div>
  )
}

function FineTuneSlider({ value, onChange }) {
  const pct = ((value + 10) / 20) * 100
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fine-Tune Adjustment</p>
        <span className={`font-mono font-bold text-sm tabular-nums px-2 py-0.5 rounded ${
          value < 0 ? 'text-emerald-400 bg-emerald-950'
          : value > 0 ? 'text-red-400 bg-red-950'
          : 'text-slate-400 bg-slate-800'
        }`}>
          {value > 0 ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
      <input
        type="range"
        min={-10} max={10} step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right,
            #3b82f6 0%,
            #3b82f6 ${pct}%,
            #334155 ${pct}%,
            #334155 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-600 select-none">
        <span>−10% (aggressive)</span>
        <span className="text-slate-500">midpoint</span>
        <span>+10% (conservative)</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PTWDashboard() {
  const { selectedContractId, setSelectedScenarioId } = useAppContext()
  const [scenarios, setScenarios] = useState([])
  const [scenarioId, setScenarioId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preset, setPreset] = useState(WIN_PRESETS[1]) // default: Incumbent (Standard)
  const [fineTune, setFineTune] = useState(0)

  // Sync local scenarioId → context
  useEffect(() => {
    setSelectedScenarioId(scenarioId)
  }, [scenarioId, setSelectedScenarioId])

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedContractId) return
    setScenarioId(null)
    setData(null)
    fetch(`/api/scenarios?contractId=${selectedContractId}`)
      .then((r) => r.json())
      .then((scens) => {
        setScenarios(scens)
        const baseline = scens.find((s) => s.isBaseline) ?? scens[0]
        if (baseline) setScenarioId(baseline.id)
      })
      .catch(console.error)
  }, [selectedContractId])

  useEffect(() => {
    if (!scenarioId) return
    setLoading(true)
    setError(null)
    fetch(`/api/scenarios/${scenarioId}/results`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [scenarioId])

  // ── Derived state ────────────────────────────────────────────────────────────
  const totals = data?.totals ?? []
  const compTotals = totals.filter((t) => t.competitorId !== null) // exclude own estimate
  const ownTotal   = totals.find((t)  => t.competitorId === null)

  // Lowest competitor TEP (totals sorted asc by API)
  const lowestTEP = compTotals[0]?.totalTep ?? null

  // Win band in dollars
  const bandLow$  = lowestTEP ? lowestTEP * preset.bandLow  : null
  const bandHigh$ = lowestTEP ? lowestTEP * preset.bandHigh : null
  const midpoint$ = lowestTEP ? lowestTEP * preset.midpoint : null

  // Recommended price = midpoint shifted by fine-tune
  const recommendedPrice = midpoint$ ? midpoint$ * (1 + fineTune / 100) : null

  // Win probability
  const winProb =
    recommendedPrice && bandLow$ && midpoint$ && bandHigh$
      ? calcWinProb(recommendedPrice, bandLow$, midpoint$, bandHigh$)
      : null

  // Chart data: sorted descending so lowest bar renders at bottom
  const chartData = [...compTotals, ...(ownTotal ? [ownTotal] : [])]
    .sort((a, b) => b.totalTep - a.totalTep)
    .map((t) => ({
      name: shortName(t.competitorName),
      fullName: t.competitorName,
      totalTep: t.totalTep,
      category: t.competitorId === null ? 'own' : 'competitor',
    }))

  const maxVal = Math.max(
    ...chartData.map((d) => d.totalTep),
    bandHigh$ ?? 0,
    recommendedPrice ?? 0,
  )
  const xMax = Math.ceil(maxVal / 5e6) * 5e6 + 1e7
  const xDomain = [0, xMax]

  function handlePresetChange(p) {
    setPreset(p)
    setFineTune(0)
  }

  const hasData = chartData.length > 0
  const positionLabel =
    recommendedPrice == null ? null
    : recommendedPrice < bandLow$  ? 'Below band — high probability, watch margin floor'
    : recommendedPrice > bandHigh$ ? 'Above band — low probability, protected margin'
    : 'Within win band — balanced price / probability'

  const currentScenario = scenarios.find((s) => s.id === scenarioId)

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-7">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Price to Win Dashboard
              </h1>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                Management View
              </span>
            </div>
            {currentScenario && (
              <p className="text-slate-500 text-sm mt-1">
                <span className="text-slate-400 font-medium">{currentScenario.name}</span>
                {' — '}{currentScenario.description}
              </p>
            )}
          </div>

          {/* Scenario selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Scenario</label>
            <select
              value={scenarioId ?? ''}
              onChange={(e) => { setScenarioId(Number(e.target.value)); setFineTune(0) }}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isBaseline ? ' ★' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Summary stats strip ─────────────────────────────────────────── */}
        {hasData && lowestTEP && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Lowest Competitor"
              value={fmtM(lowestTEP)}
              sub={compTotals[0]?.competitorName?.split(' ')[0]}
              valueClass="text-emerald-400"
            />
            <StatCard
              label="Highest Competitor"
              value={fmtM(compTotals[compTotals.length - 1]?.totalTep)}
              sub={compTotals[compTotals.length - 1]?.competitorName?.split(' ')[0]}
              valueClass="text-slate-300"
            />
            <StatCard
              label="PTW Target"
              value={fmtM(recommendedPrice)}
              sub={`${preset.label} + ${fineTune > 0 ? '+' : ''}${fineTune.toFixed(1)}%`}
              valueClass="text-blue-400"
            />
            <StatCard
              label="Win Probability"
              value={winProb != null ? `${winProb}%` : '—'}
              sub="based on position in band"
              valueClass={winProb != null ? probColor(winProb).text : 'text-slate-400'}
            />
          </div>
        )}

        {/* ── Main 2-col grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Left: Chart ─────────────────────────────────────────────── */}
          <div className="xl:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-white">TEP Competitive Landscape</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Horizontal bars sorted ascending by Total Evaluated Price · Green band = PTW win zone
                </p>
              </div>
              {loading && <Spinner />}
            </div>

            {/* Empty / loading state */}
            {!loading && !hasData && (
              <div className="h-56 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <svg className="h-10 w-10 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                    />
                  </svg>
                  <p className="text-slate-500 text-sm">No TEP results for this scenario.</p>
                  <p className="text-slate-600 text-xs">Switch to Base Case or run a calculation.</p>
                </div>
              </div>
            )}

            {hasData && (
              <>
                <ResponsiveContainer width="100%" height={chartData.length * 64 + 56}>
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 4, right: 90, left: 16, bottom: 4 }}
                    barSize={30}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      horizontal={false}
                      vertical={true}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                    />

                    <XAxis
                      type="number"
                      domain={xDomain}
                      tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`}
                      tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                      axisLine={{ stroke: '#1e293b' }}
                      tickLine={{ stroke: '#1e293b' }}
                      tickCount={6}
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      content={
                        <ChartTooltip
                          lowestTEP={lowestTEP}
                          recommendedPrice={recommendedPrice}
                        />
                      }
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />

                    {/* ── Win band shaded region ───────────────────────── */}
                    {bandLow$ && bandHigh$ && (
                      <ReferenceArea
                        x1={bandLow$}
                        x2={bandHigh$}
                        fill="#22c55e"
                        fillOpacity={0.10}
                        stroke="#22c55e"
                        strokeOpacity={0.25}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* ── Band floor line ──────────────────────────────── */}
                    {bandLow$ && (
                      <ReferenceLine
                        x={bandLow$}
                        stroke="#22c55e"
                        strokeWidth={1}
                        strokeOpacity={0.6}
                      />
                    )}

                    {/* ── Band ceiling line ────────────────────────────── */}
                    {bandHigh$ && (
                      <ReferenceLine
                        x={bandHigh$}
                        stroke="#22c55e"
                        strokeWidth={1}
                        strokeOpacity={0.35}
                      />
                    )}

                    {/* ── PTW target / recommended price ──────────────── */}
                    {recommendedPrice && (
                      <ReferenceLine
                        x={recommendedPrice}
                        stroke="#60a5fa"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        label={{
                          value: fmtM(recommendedPrice),
                          position: 'insideTopRight',
                          fill: '#60a5fa',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'ui-monospace, monospace',
                          dy: -4,
                        }}
                      />
                    )}

                    {/* ── Bars ────────────────────────────────────────── */}
                    <Bar dataKey="totalTep" radius={[0, 5, 5, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={BAR_COLORS[entry.category]}
                          fillOpacity={0.85}
                        />
                      ))}
                      <LabelList
                        dataKey="totalTep"
                        position="right"
                        formatter={fmtM}
                        style={{
                          fill: '#94a3b8',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Chart legend */}
                <div className="flex flex-wrap items-center gap-5 mt-5 pt-4 border-t border-slate-800">
                  {[
                    { swatch: BAR_COLORS.competitor, label: 'Competitor' },
                    { swatch: BAR_COLORS.own,        label: 'Own Estimate' },
                    { swatch: BAR_COLORS.subk,       label: 'SubK Partner' },
                    { swatch: '#22c55e', label: 'Win Band', opacity: 0.45 },
                    { dashed: '#60a5fa', label: 'PTW Target' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                      {item.dashed ? (
                        <svg width="22" height="10" className="flex-shrink-0">
                          <line x1="0" y1="5" x2="22" y2="5"
                            stroke={item.dashed} strokeWidth="2" strokeDasharray="5 3" />
                        </svg>
                      ) : (
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ background: item.swatch, opacity: item.opacity ?? 1 }}
                        />
                      )}
                      {item.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Right: Controls ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Win preset selector */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Win Scenario
              </h2>
              <div className="space-y-2">
                {WIN_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetChange(p)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border text-sm transition-all duration-150 ${
                      preset.id === p.id
                        ? 'bg-blue-600/15 border-blue-500/60 text-white shadow-inner shadow-blue-950'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${preset.id === p.id ? 'text-blue-300' : ''}`}>
                        {p.label}
                      </span>
                      {preset.id === p.id && (
                        <div className="flex gap-1 text-xs text-slate-500 shrink-0 font-mono">
                          <span className="text-green-500">{(p.bandLow * 100).toFixed(0)}%</span>
                          <span>–</span>
                          <span className="text-slate-400">{(p.bandHigh * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                    {preset.id === p.id && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{p.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-tune slider */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <FineTuneSlider value={fineTune} onChange={setFineTune} />

              {/* Band details */}
              {bandLow$ && bandHigh$ && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-800 rounded-lg px-2.5 py-2 text-center">
                    <p className="text-slate-500">Floor</p>
                    <p className="font-bold text-emerald-400 tabular-nums font-mono mt-0.5">
                      {fmtM(bandLow$)}
                    </p>
                  </div>
                  <div className="bg-blue-950/60 rounded-lg px-2.5 py-2 text-center border border-blue-900/40">
                    <p className="text-slate-500">Target</p>
                    <p className="font-bold text-blue-400 tabular-nums font-mono mt-0.5">
                      {fmtM(recommendedPrice)}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg px-2.5 py-2 text-center">
                    <p className="text-slate-500">Ceiling</p>
                    <p className="font-bold text-slate-400 tabular-nums font-mono mt-0.5">
                      {fmtM(bandHigh$)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* PTW Recommendation */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 rounded-2xl border border-slate-800 p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                PTW Recommendation
              </h2>

              {recommendedPrice ? (
                <>
                  {/* Main bid number */}
                  <div>
                    <p className="text-xs text-slate-500">Recommended Bid Price</p>
                    <p className="text-4xl font-extrabold text-white tabular-nums tracking-tight mt-1">
                      {fmtM(recommendedPrice)}
                    </p>
                    {lowestTEP && (
                      <p className={`text-xs font-medium mt-1.5 tabular-nums ${
                        recommendedPrice <= lowestTEP ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {fmtPct((recommendedPrice - lowestTEP) / lowestTEP)} vs. lowest competitor
                        ({fmtM(lowestTEP)})
                      </p>
                    )}
                  </div>

                  {/* Win probability meter */}
                  {winProb != null && <WinProbMeter prob={winProb} />}

                  {/* Position in band */}
                  {positionLabel && (
                    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2.5 ${
                      recommendedPrice < bandLow$  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50'
                      : recommendedPrice > bandHigh$ ? 'bg-red-950/50 text-red-400 border border-red-900/50'
                      : 'bg-blue-950/50 text-blue-400 border border-blue-900/50'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current mt-0.5 flex-shrink-0" />
                      {positionLabel}
                    </div>
                  )}

                  {/* Comparisons */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    {ownTotal && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">vs. Own TEP ({fmtM(ownTotal.totalTep)})</span>
                        <span className={`font-mono font-bold tabular-nums ${
                          recommendedPrice < ownTotal.totalTep ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {fmtPct((recommendedPrice - ownTotal.totalTep) / ownTotal.totalTep)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Win scenario</span>
                      <span className="text-slate-300 font-medium">{preset.label}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Fine-tune offset</span>
                      <span className={`font-mono tabular-nums font-bold ${
                        fineTune < 0 ? 'text-emerald-400' : fineTune > 0 ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        {fineTune > 0 ? '+' : ''}{fineTune.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-slate-500 text-sm">No competitor data available.</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Switch to Base Case to see PTW recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
