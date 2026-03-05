import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { API_BASE } from '../../lib/api.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ReferenceArea, ReferenceLine, ResponsiveContainer, LabelList,
} from 'recharts'

// ─── Competitive Posture Presets ──────────────────────────────────────────────

const POSTURE_PRESETS = [
  {
    id: 'strong-incumbent',
    label: 'Strong Incumbent',
    postureModifier: 15,
    bandLow: 0.97, bandHigh: 1.03, midpoint: 1.00,
    description: 'You hold the current contract with excellent past performance. Transition risk and customer continuity preference work in your favor. You can price at or near market and still win.',
  },
  {
    id: 'incumbent',
    label: 'Incumbent',
    postureModifier: 10,
    bandLow: 0.94, bandHigh: 1.00, midpoint: 0.97,
    description: "You're re-competing with a solid track record, but aggressive challengers will undercut you. A modest discount from current value is typically required to hold the award.",
  },
  {
    id: 'strong-challenger',
    label: 'Strong Challenger',
    postureModifier: 5,
    bandLow: 0.89, bandHigh: 0.96, midpoint: 0.93,
    description: 'You have directly relevant experience and a competitive team, but face an entrenched incumbent. Price 5–10% below the expected lowest to overcome past-performance disadvantage.',
  },
  {
    id: 'new-entrant',
    label: 'New Entrant',
    postureModifier: -10,
    bandLow: 0.84, bandHigh: 0.92, midpoint: 0.88,
    description: 'Limited or no comparable past performance. Must price aggressively — 10–15% below market — to offset evaluation risk and signal commitment to the customer.',
  },
  {
    id: 'lpta',
    label: 'LPTA',
    postureModifier: 0,
    isLPTA: true,
    bandLow: 0.88, bandHigh: 0.94, midpoint: 0.91,
    description: 'Lowest Price Technically Acceptable. Award goes to the cheapest technically acceptable offeror. Price discipline is paramount — you must be the lowest price or probability is 0%.',
  },
  {
    id: 'sole-source',
    label: 'Sole Source',
    postureModifier: 25,
    bandLow: 0.90, bandHigh: 1.10, midpoint: 0.98,
    description: 'Non-competitive scenario. Pricing must be "fair and reasonable" relative to the IGCE and comparable market data.',
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_COLORS = {
  own: '#60a5fa',        // blue-400
  subk: '#c084fc',       // purple-400
  competitor: '#64748b', // slate-500
}

// Default fee rate matches the slider default (10%)
// Used to strip fee from baseline TEP before applying lever adjustments
const DEFAULT_FEE = 10

// Cost-pool weights (fraction of total TEP each pool represents in the seed data)
// Engineering labor ≈ 30%, Production labor ≈ 46%, Materials/ODCs ≈ 10%
const W_ENG  = 0.30
const W_PROD = 0.46
const W_MAT  = 0.10

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtM = (v) => v == null ? '—' : `$${(v / 1e6).toFixed(1)}M`

const fmtPct = (v, showPlus = true) =>
  v == null ? '—' : `${showPlus && v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`

const fmtLeverPct = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`

function shortName(name) {
  return name
    .replace(/ Inc\.$/, '')
    .replace(/ \(Science Applications International Corporation\)$/, '')
    .replace(/^Own Estimate$/, 'Own Estimate ★')
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)) }
function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1) }

// ── Win probability ───────────────────────────────────────────────────────────
//
// Step 1 — Price Score (0–100): where does Own Estimate sit vs competitor range?
//   Anchors: below lowest=95, at lowest=85, at midLo=70, at median=55,
//            at midHi=35, at highest=20, above highest=10
//   Linearly interpolated between anchors.
//
// Step 2 — Posture Modifier (additive, per POSTURE_PRESETS[].postureModifier)
//   e.g. Incumbent +10, New Entrant -10, Sole Source +25
//
// Step 3 — clamp(score + modifier, 5, 98)
//   Exception: LPTA returns 0 if Own Estimate is not the lowest price.

// Anchor points (score) vs position relative to competitor range:
//   ≤ 20% below lowest → 95   |  score changes continuously as price moves up
//   10% below lowest   → 88   |
//   at lowest          → 78   |  ← $317M default sits in the 88→78 band
//   halfway to median  → 65   |     so lever changes always move the score
//   at median          → 50   |
//   halfway to highest → 35   |
//   at highest         → 20   |
//   above highest      → 10   ↓
function calcPriceScore(ownTEP, sortedPrices) {
  const n = sortedPrices.length
  if (n === 0) return 50

  const lowest  = sortedPrices[0]
  const highest = sortedPrices[n - 1]
  const median  = n % 2 === 0
    ? (sortedPrices[n / 2 - 1] + sortedPrices[n / 2]) / 2
    : sortedPrices[Math.floor(n / 2)]

  // Below-lowest zone: percentage anchors so this region has real gradients
  const pct20below = lowest * 0.80  // 20% below lowest → score 95
  const pct10below = lowest * 0.90  // 10% below lowest → score 88

  if (ownTEP <= pct20below) return 95
  if (ownTEP > highest)     return 10
  if (ownTEP === highest)   return 20

  if (ownTEP < pct10below) {
    // between -20% and -10% below lowest
    const t = (ownTEP - pct20below) / (pct10below - pct20below)
    return lerp(95, 88, t)
  }
  if (ownTEP < lowest) {
    // between -10% and at lowest
    const t = (ownTEP - pct10below) / Math.max(1, lowest - pct10below)
    return lerp(88, 78, t)
  }
  if (ownTEP === lowest) return 78

  if (lowest === highest) return 50 // degenerate edge case

  const midLo = (lowest + median) / 2
  const midHi = (median + highest) / 2

  if (ownTEP <= midLo) {
    const t = (ownTEP - lowest) / Math.max(1, midLo - lowest)
    return lerp(78, 65, t)
  }
  if (ownTEP <= median) {
    const t = (ownTEP - midLo) / Math.max(1, median - midLo)
    return lerp(65, 50, t)
  }
  if (ownTEP <= midHi) {
    const t = (ownTEP - median) / Math.max(1, midHi - median)
    return lerp(50, 35, t)
  }
  const t = (ownTEP - midHi) / Math.max(1, highest - midHi)
  return lerp(35, 20, t)
}

function calcWinProb(ownTEP, compTotals, posture) {
  if (!compTotals.length) return null

  const sorted = compTotals.map(t => t.totalTep).sort((a, b) => a - b)
  const lowest = sorted[0]

  // LPTA: must be cheapest or probability = 0
  if (posture.isLPTA && ownTEP > lowest) return 0

  const priceScore = calcPriceScore(ownTEP, sorted)
  const result = Math.round(clamp(priceScore + posture.postureModifier, 5, 98))

  console.log('[WinProb]', {
    ownTEP:          `$${(ownTEP / 1e6).toFixed(1)}M`,
    lowest:          `$${(lowest / 1e6).toFixed(1)}M`,
    priceScore:      priceScore.toFixed(1),
    postureModifier: posture.postureModifier,
    result,
  })

  return result
}

function probColor(p) {
  if (p >= 70) return { text: 'text-emerald-400', bar: 'bg-emerald-500', ring: 'ring-emerald-500/30' }
  if (p >= 45) return { text: 'text-amber-400',   bar: 'bg-amber-500',   ring: 'ring-amber-500/30'  }
  return              { text: 'text-red-400',      bar: 'bg-red-500',     ring: 'ring-red-500/30'    }
}

function probLabel(p) {
  if (p === 0)   return 'Cannot Win'
  if (p >= 70)   return 'Favorable'
  if (p >= 45)   return 'Contested'
  return 'At Risk'
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
    <div className={`rounded-xl p-4 border bg-slate-900 ${c.ring} ring-1 space-y-2.5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Probability</p>
          <p className={`text-4xl font-extrabold tabular-nums mt-0.5 ${c.text}`}>{prob}%</p>
        </div>
        <div className={`text-xs font-medium px-2.5 py-1 rounded-full border mt-1 ${
          prob >= 70 ? 'border-emerald-700 text-emerald-400 bg-emerald-950'
          : prob >= 45 ? 'border-amber-700 text-amber-400 bg-amber-950'
          : 'border-red-800 text-red-400 bg-red-950'
        }`}>
          {probLabel(prob)}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${c.bar}`}
          style={{ width: `${prob}%` }}
        />
      </div>
    </div>
  )
}

function BidLever({ label, tooltip, min, max, step = 0.5, value, onChange, formatValue, isCenter = false }) {
  const pct = ((value - min) / (max - min)) * 100
  const isNeg = value < (isCenter ? 0 : min + (max - min) / 2)
  const isPos = value > (isCenter ? 0 : min + (max - min) / 2)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-slate-300 truncate">{label}</span>
          {tooltip && (
            <div className="group relative flex-shrink-0">
              <svg className="h-3.5 w-3.5 text-slate-600 hover:text-slate-400 cursor-help transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute left-0 bottom-5 z-50 hidden group-hover:block w-60 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-300 shadow-2xl leading-relaxed pointer-events-none">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span className={`font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded flex-shrink-0 ${
          isCenter
            ? isNeg ? 'text-emerald-400 bg-emerald-950'
              : isPos ? 'text-amber-400 bg-amber-950'
              : 'text-slate-400 bg-slate-800'
            : 'text-blue-400 bg-blue-950'
        }`}>
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #334155 ${pct}%, #334155 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-600 select-none">
        <span>{formatValue(min)}</span>
        {isCenter && <span>0%</span>}
        <span>{formatValue(max)}</span>
      </div>
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

function ChartTooltip({ active, payload, lowestTEP, adjustedTEP }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const tep = d.totalTep
  const vsLowest = lowestTEP && tep ? (tep - lowestTEP) / lowestTEP : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl px-4 py-3 text-xs min-w-[200px] space-y-1.5">
      <p className="font-semibold text-sm text-white border-b border-slate-700 pb-1.5 mb-1.5">
        {d.fullName}
      </p>
      <Row label="Total TEP" value={fmtM(tep)} />
      {vsLowest != null && (
        <Row
          label="vs. Lowest Competitor"
          value={fmtPct(vsLowest)}
          color={vsLowest <= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      )}
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

  // Controls
  const [posture, setPosture] = useState(POSTURE_PRESETS[1]) // default: Incumbent
  const [levers, setLevers] = useState({
    engLabor:  0,
    prodLabor: 0,
    material:  0,
    targetFee: DEFAULT_FEE,
  })

  function setLever(key, value) {
    setLevers((prev) => ({ ...prev, [key]: value }))
  }

  // Sync scenarioId → context (enables Export button)
  useEffect(() => {
    setSelectedScenarioId(scenarioId)
  }, [scenarioId, setSelectedScenarioId])

  // Bootstrap: fetch scenarios when contract changes
  useEffect(() => {
    if (!selectedContractId) return
    setScenarioId(null)
    setData(null)
    fetch(`${API_BASE}/api/scenarios?contractId=${selectedContractId}`)
      .then((r) => r.json())
      .then((scens) => {
        setScenarios(scens)
        const baseline = scens.find((s) => s.isBaseline) ?? scens[0]
        if (baseline) setScenarioId(baseline.id)
      })
      .catch(console.error)
  }, [selectedContractId])

  // Fetch results when scenario changes
  useEffect(() => {
    if (!scenarioId) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/scenarios/${scenarioId}/results`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [scenarioId])

  // ── Derived: raw TEP data ─────────────────────────────────────────────────
  const totals     = data?.totals ?? []
  const compTotals = totals.filter((t) => t.competitorId !== null)
  const ownTotal   = totals.find((t) => t.competitorId === null)

  const lowestTEP  = compTotals[0]?.totalTep ?? null
  const baselineTEP = ownTotal?.totalTep ?? null

  // ── Lever-adjusted TEP ───────────────────────────────────────────────────
  // Strip the default fee from baseline, apply labor/material lever adjustments
  // to the cost base, then reapply the target fee lever.
  // At all-default positions (levers=0, fee=10%) adjustedTEP === baselineTEP.
  const baseCost = baselineTEP != null ? baselineTEP / (1 + DEFAULT_FEE / 100) : null

  const laborMatAdj =
    (levers.engLabor  * W_ENG  +
     levers.prodLabor * W_PROD +
     levers.material  * W_MAT) / 100

  const adjustedCost = baseCost != null ? baseCost * (1 + laborMatAdj) : null
  const adjustedTEP  = adjustedCost != null ? adjustedCost * (1 + levers.targetFee / 100) : null

  const leverDelta    = adjustedTEP != null && baselineTEP != null ? adjustedTEP - baselineTEP : null
  const leverDeltaPct = leverDelta != null && baselineTEP ? leverDelta / baselineTEP : null

  // ── Competitive posture band ─────────────────────────────────────────────
  const bandLow$  = lowestTEP ? lowestTEP * posture.bandLow  : null
  const bandHigh$ = lowestTEP ? lowestTEP * posture.bandHigh : null
  const midpoint$ = lowestTEP ? lowestTEP * posture.midpoint : null

  // ── Win probability ───────────────────────────────────────────────────────
  // Price score from actual competitor range, + posture modifier, clamped 5–98.
  // LPTA exception: returns 0 if Own Estimate is not the lowest price.
  const winProb =
    adjustedTEP != null && compTotals.length > 0
      ? calcWinProb(adjustedTEP, compTotals, posture)
      : null

  // ── Chart data ────────────────────────────────────────────────────────────
  // Own Estimate bar uses adjustedTEP so it updates live with lever changes
  const chartData = [
    ...compTotals,
    ...(ownTotal ? [{ ...ownTotal, totalTep: adjustedTEP ?? ownTotal.totalTep }] : []),
  ]
    .sort((a, b) => b.totalTep - a.totalTep)
    .map((t) => ({
      name:     shortName(t.competitorName),
      fullName: t.competitorName,
      totalTep: t.totalTep,
      category: t.competitorId === null ? 'own' : 'competitor',
    }))

  const maxVal = Math.max(
    ...chartData.map((d) => d.totalTep ?? 0),
    bandHigh$ ?? 0,
    midpoint$  ?? 0,
  )
  const xMax    = Math.ceil(maxVal / 5e6) * 5e6 + 1e7
  const xDomain = [0, xMax]

  const hasData = chartData.length > 0
  const currentScenario = scenarios.find((s) => s.id === scenarioId)

  const positionLabel =
    adjustedTEP == null ? null
    : adjustedTEP < bandLow$  ? 'Below band — aggressive; watch margin floor'
    : adjustedTEP > bandHigh$ ? 'Above band — reduced probability; protected margin'
    : 'Within win band — balanced price / probability'

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-7">

        {/* ── Page header ──────────────────────────────────────────────────── */}
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

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Stat strip ───────────────────────────────────────────────────── */}
        {hasData && lowestTEP && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Lowest Competitor"
              value={fmtM(lowestTEP)}
              sub={compTotals[0]?.competitorName?.split(' ')[0]}
              valueClass="text-emerald-400"
            />
            <StatCard
              label="Adjusted Bid"
              value={fmtM(adjustedTEP)}
              sub={leverDelta != null && Math.abs(leverDelta) > 1e4
                ? `${leverDelta < 0 ? '' : '+'}${fmtM(leverDelta)} vs. baseline`
                : 'no lever adjustments'}
              valueClass="text-blue-400"
            />
            <StatCard
              label="Delta from Baseline"
              value={leverDeltaPct != null ? fmtPct(leverDeltaPct) : '—'}
              sub={leverDelta != null && Math.abs(leverDelta) > 1e4 ? fmtM(leverDelta) : 'baseline TEP'}
              valueClass={
                leverDeltaPct == null || Math.abs(leverDeltaPct) < 0.0001 ? 'text-slate-400'
                : leverDeltaPct < 0 ? 'text-emerald-400' : 'text-amber-400'
              }
            />
            <StatCard
              label="Win Probability"
              value={winProb != null ? `${winProb}%` : '—'}
              sub={winProb != null ? `${probLabel(winProb)} · ${posture.label}` : posture.label}
              valueClass={winProb != null ? probColor(winProb).text : 'text-slate-400'}
            />
          </div>
        )}

        {/* ── Main 2-col grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Left: Chart ────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-white">TEP Competitive Landscape</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Own Estimate bar updates live with bid lever changes · Green band = PTW win zone
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
                  <p className="text-slate-600 text-xs">Switch to the TEP Calculator and run a calculation.</p>
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
                    <CartesianGrid horizontal={false} vertical stroke="#1e293b" strokeDasharray="4 4" />

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
                      content={<ChartTooltip lowestTEP={lowestTEP} adjustedTEP={adjustedTEP} />}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />

                    {/* Win band shaded region */}
                    {bandLow$ && bandHigh$ && (
                      <ReferenceArea
                        x1={bandLow$} x2={bandHigh$}
                        fill="#22c55e" fillOpacity={0.10}
                        stroke="#22c55e" strokeOpacity={0.25}
                        strokeWidth={1} strokeDasharray="3 3"
                      />
                    )}

                    {/* Band floor */}
                    {bandLow$ && (
                      <ReferenceLine x={bandLow$} stroke="#22c55e" strokeWidth={1} strokeOpacity={0.6} />
                    )}

                    {/* Band ceiling */}
                    {bandHigh$ && (
                      <ReferenceLine x={bandHigh$} stroke="#22c55e" strokeWidth={1} strokeOpacity={0.35} />
                    )}

                    {/* Posture midpoint — ideal bid target */}
                    {midpoint$ && (
                      <ReferenceLine
                        x={midpoint$}
                        stroke="#60a5fa"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        label={{
                          value: fmtM(midpoint$),
                          position: 'insideTopRight',
                          fill: '#60a5fa',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'ui-monospace, monospace',
                          dy: -4,
                        }}
                      />
                    )}

                    <Bar dataKey="totalTep" radius={[0, 5, 5, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={BAR_COLORS[entry.category]} fillOpacity={0.85} />
                      ))}
                      <LabelList
                        dataKey="totalTep"
                        position="right"
                        formatter={fmtM}
                        style={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-5 mt-5 pt-4 border-t border-slate-800">
                  {[
                    { swatch: BAR_COLORS.competitor, label: 'Competitor' },
                    { swatch: BAR_COLORS.own,        label: 'Own Estimate (adjusted)' },
                    { swatch: '#22c55e',              label: 'Win Band', opacity: 0.45 },
                    { dashed: '#60a5fa',              label: 'Posture Midpoint' },
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

          {/* ── Right: Controls ──────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* ── Section 1: Bid Levers ────────────────────────────────── */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Bid Levers
              </h2>

              <BidLever
                label="Engineering Labor Adjustment"
                tooltip="Represents LCAT mix optimization for engineering scope — negative values reflect shifting to less expensive labor categories"
                min={-20} max={20} step={0.5}
                value={levers.engLabor}
                onChange={(v) => setLever('engLabor', v)}
                formatValue={fmtLeverPct}
                isCenter
              />

              <BidLever
                label="Production Labor Adjustment"
                tooltip="Represents LCAT mix optimization for production scope — negative values reflect shifting to less expensive labor categories"
                min={-20} max={20} step={0.5}
                value={levers.prodLabor}
                onChange={(v) => setLever('prodLabor', v)}
                formatValue={fmtLeverPct}
                isCenter
              />

              <BidLever
                label="Material Cost Adjustment"
                tooltip="Reflects better supplier pricing, make vs. buy decisions, or reduced scrap factors"
                min={-20} max={20} step={0.5}
                value={levers.material}
                onChange={(v) => setLever('material', v)}
                formatValue={fmtLeverPct}
                isCenter
              />

              <BidLever
                label="Target Fee"
                tooltip="Target profit/fee rate — reducing fee improves competitive position but reduces margin"
                min={5} max={15} step={0.5}
                value={levers.targetFee}
                onChange={(v) => setLever('targetFee', v)}
                formatValue={(v) => `${v.toFixed(1)}%`}
                isCenter={false}
              />

              {/* TEP summary */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Baseline TEP</span>
                  <span className="font-mono text-slate-400 tabular-nums">{fmtM(baselineTEP)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Adjusted TEP</span>
                  <span className="font-mono text-white font-bold tabular-nums">{fmtM(adjustedTEP)}</span>
                </div>
                {leverDelta != null && Math.abs(leverDelta) > 1e4 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Delta</span>
                    <span className={`font-mono font-bold tabular-nums ${leverDelta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {leverDelta >= 0 ? '+' : ''}{fmtM(leverDelta)} ({fmtPct(leverDeltaPct)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 2: Competitive Posture ───────────────────────── */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Competitive Posture
              </h2>

              {/* 6 posture buttons in 2-column grid */}
              <div className="grid grid-cols-2 gap-2">
                {POSTURE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPosture(p)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 ${
                      posture.id === p.id
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Active posture details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-500 font-mono font-semibold">
                    {(posture.bandLow * 100).toFixed(0)}%
                  </span>
                  <span className="text-slate-600">–</span>
                  <span className="text-slate-400 font-mono font-semibold">
                    {(posture.bandHigh * 100).toFixed(0)}%
                  </span>
                  <span className="text-slate-600">of lowest competitor</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{posture.description}</p>
              </div>

              {/* Win probability — updates on posture OR lever change */}
              {winProb != null && (
                <div className="space-y-3">
                  <WinProbMeter prob={winProb} />

                  {/* Position in band */}
                  {positionLabel && (
                    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2.5 ${
                      adjustedTEP < bandLow$  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50'
                      : adjustedTEP > bandHigh$ ? 'bg-red-950/50 text-red-400 border border-red-900/50'
                      : 'bg-blue-950/50 text-blue-400 border border-blue-900/50'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current mt-0.5 flex-shrink-0" />
                      {positionLabel}
                    </div>
                  )}

                  {/* Band floor / midpoint / ceiling */}
                  {bandLow$ && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-800 rounded-lg px-2.5 py-2 text-center">
                        <p className="text-slate-500">Floor</p>
                        <p className="font-bold text-emerald-400 tabular-nums font-mono mt-0.5">
                          {fmtM(bandLow$)}
                        </p>
                      </div>
                      <div className="bg-blue-950/60 rounded-lg px-2.5 py-2 text-center border border-blue-900/40">
                        <p className="text-slate-500">Midpoint</p>
                        <p className="font-bold text-blue-400 tabular-nums font-mono mt-0.5">
                          {fmtM(midpoint$)}
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

                  {/* Bid comparison */}
                  <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3">
                    {lowestTEP && adjustedTEP && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          vs. Lowest ({fmtM(lowestTEP)})
                        </span>
                        <span className={`font-mono font-bold tabular-nums ${
                          adjustedTEP <= lowestTEP ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {fmtPct((adjustedTEP - lowestTEP) / lowestTEP)}
                        </span>
                      </div>
                    )}
                    {baselineTEP && adjustedTEP && Math.abs(adjustedTEP - baselineTEP) > 1e4 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          vs. Baseline ({fmtM(baselineTEP)})
                        </span>
                        <span className={`font-mono font-bold tabular-nums ${
                          leverDeltaPct < 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {fmtPct(leverDeltaPct)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No data state */}
              {winProb == null && hasData && (
                <div className="py-4 text-center">
                  <p className="text-slate-500 text-sm">No competitor data available.</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Run the TEP Calculator to populate results.
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
