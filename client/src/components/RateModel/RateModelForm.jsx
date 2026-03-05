import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { API_BASE } from '../../lib/api.js'

const EMPTY_FORM = {
  companyName: '',
  companyType: 'public',
  comparablePublicCompany: '',
  engLocation: '',
  engGeoOffset: '',
  prodLocation: '',
  prodGeoOffset: '',
  fringeInOH: true,
  fringeRate: '',
  engOHRate: '',
  mfgOHRate: '',
  materialHandlingRate: '',
  subkHandlingRate: '',
  gaRate: '',
  feeRate: '',
  valueAddedGA: false,
  escalationRate: '',
  notes: '',
}

const cx =
  'border border-gray-300 rounded px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full'

const pct =
  'border border-gray-300 rounded px-2.5 py-1.5 pr-7 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full'

function SectionHeader({ children }) {
  return (
    <h3 className="col-span-full text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-2 first:mt-0">
      {children}
    </h3>
  )
}

function Label({ text, children, span }) {
  return (
    <div className={`flex flex-col gap-1${span ? ' col-span-full' : ''}`}>
      <label className="text-xs font-medium text-gray-600">{text}</label>
      {children}
    </div>
  )
}

// ─── Competitor list row ──────────────────────────────────────────────────────

function fmt(v) {
  return v != null ? `${v}%` : '—'
}

function CompetitorRow({ competitor, isSelected, onEdit }) {
  const ra = competitor.rateProfile
  return (
    <tr className={`border-b border-gray-100 last:border-0 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{competitor.name}</td>
      <td className="px-4 py-2.5 text-gray-600 text-center tabular-nums">{fmt(ra?.engOHRate)}</td>
      <td className="px-4 py-2.5 text-gray-600 text-center tabular-nums">{fmt(ra?.mfgOHRate)}</td>
      <td className="px-4 py-2.5 text-gray-600 text-center tabular-nums">{fmt(ra?.gaRate)}</td>
      <td className="px-4 py-2.5 text-center">
        {ra?.valueAddedGA
          ? <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">VA</span>
          : null}
      </td>
      <td className="px-4 py-2.5 text-gray-600 text-center tabular-nums">{fmt(ra?.feeRate)}</td>
      <td className="px-4 py-2.5 text-right">
        <button
          onClick={() => onEdit(competitor)}
          className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-blue-600 border-blue-300 hover:bg-blue-50'
          }`}
        >
          {isSelected ? 'Editing' : 'Edit Rates'}
        </button>
      </td>
    </tr>
  )
}

// ─── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({ status }) {
  if (!status) return null
  const s = status.type === 'success'
    ? 'bg-green-50 border-green-300 text-green-700'
    : 'bg-red-50 border-red-300 text-red-700'
  return <div className={`border rounded px-3 py-2 text-sm ${s}`}>{status.msg}</div>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RateModelForm() {
  const { selectedContractId } = useAppContext()
  const [competitors, setCompetitors] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  function loadCompetitors() {
    if (!selectedContractId) return
    fetch(`${API_BASE}/api/contracts/${selectedContractId}/competitors`)
      .then(r => r.json())
      .then(comps => setCompetitors(comps))
      .catch(err => console.error('Competitors load error:', err))
  }

  useEffect(() => {
    setSelectedId(null)
    setForm(EMPTY_FORM)
    loadCompetitors()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContractId])

  // Direct field setter — returns an onChange handler for plain <input>/<select>/<textarea>
  function field(name) {
    return e => setForm(f => ({ ...f, [name]: e.target.value }))
  }

  async function handleEdit(competitor) {
    if (selectedId === competitor.id) return

    const compId = competitor.id
    const compName = competitor.name

    setSelectedId(compId)
    setStatus(null)
    setLoading(true)
    setForm({ ...EMPTY_FORM, companyName: compName })

    try {
      const res = await fetch(`/api/competitors/${compId}/rate-assumptions`)
      const data = await res.json()

      // Pick only known form keys; replace null with EMPTY_FORM default
      const next = { ...EMPTY_FORM, companyName: compName }
      for (const key of Object.keys(EMPTY_FORM)) {
        if (key in data && data[key] !== null && data[key] !== undefined) {
          next[key] = data[key]
        }
      }
      // Booleans always explicit
      next.fringeInOH   = typeof data.fringeInOH   === 'boolean' ? data.fringeInOH   : true
      next.valueAddedGA = typeof data.valueAddedGA  === 'boolean' ? data.valueAddedGA : false

      setForm(next)
    } catch (err) {
      console.error('[RateModel] error:', err)
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedId) return

    setSaving(true)
    setStatus(null)

    try {
      const body = {
        contractId: selectedContractId,
        ...form,
        engGeoOffset:         form.engGeoOffset         !== '' ? Number(form.engGeoOffset)         : null,
        prodGeoOffset:        form.prodGeoOffset        !== '' ? Number(form.prodGeoOffset)        : null,
        fringeRate:           form.fringeRate           !== '' ? Number(form.fringeRate)           : null,
        engOHRate:            form.engOHRate            !== '' ? Number(form.engOHRate)            : null,
        mfgOHRate:            form.mfgOHRate            !== '' ? Number(form.mfgOHRate)            : null,
        materialHandlingRate: form.materialHandlingRate !== '' ? Number(form.materialHandlingRate) : null,
        subkHandlingRate:     form.subkHandlingRate     !== '' ? Number(form.subkHandlingRate)     : null,
        gaRate:               form.gaRate               !== '' ? Number(form.gaRate)               : null,
        feeRate:              form.feeRate              !== '' ? Number(form.feeRate)               : null,
        escalationRate:       form.escalationRate       !== '' ? Number(form.escalationRate)       : null,
      }
      const res = await fetch(`/api/competitors/${selectedId}/rate-assumptions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }
      setStatus({ type: 'success', msg: 'Rate assumptions saved.' })
      loadCompetitors()
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setSaving(false)
    }
  }

  const selectedName = competitors.find(c => c.id === selectedId)?.name ?? ''

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rate Model</h1>
          <p className="text-sm text-gray-500 mt-1">Capture competitive rate assumptions for each bidder.</p>
        </div>

        {/* ── Competitor table ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Competitors</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Green "VA" badge = Value-Added G&A (materials &amp; SubK excluded from G&A base).
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2 text-center">Eng OH%</th>
                <th className="px-4 py-2 text-center">Mfg OH%</th>
                <th className="px-4 py-2 text-center">G&amp;A%</th>
                <th className="px-4 py-2 text-center">VA G&amp;A</th>
                <th className="px-4 py-2 text-center">Fee%</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {competitors.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-6 text-center text-gray-400">No competitors found.</td></tr>
              )}
              {competitors.map(c => (
                <CompetitorRow key={c.id} competitor={c} isSelected={selectedId === c.id} onEdit={handleEdit} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Rate assumption form ───────────────────────────────────────────── */}
        {selectedId != null && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Rate Assumptions — <span className="text-blue-700">{selectedName}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Percentage fields are plain numbers (e.g. 35 for 35%).</p>
              </div>
              {loading && <span className="text-xs text-gray-400 italic">Loading…</span>}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-6">

              {/* ── Company Profile ────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>Company Profile</SectionHeader>

                <Label text="Company Name">
                  <input
                    type="text"
                    className={cx}
                    value={form.companyName ?? ''}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    placeholder="e.g. Leidos"
                    required
                  />
                </Label>

                <Label text="Company Type">
                  <select
                    className={cx}
                    value={form.companyType ?? 'public'}
                    onChange={e => setForm(f => ({ ...f, companyType: e.target.value }))}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </Label>

                {form.companyType === 'private' && (
                  <Label text="Comparable Public Company" span>
                    <input
                      type="text"
                      className={cx}
                      value={form.comparablePublicCompany ?? ''}
                      onChange={e => setForm(f => ({ ...f, comparablePublicCompany: e.target.value }))}
                      placeholder="e.g. SAIC"
                    />
                  </Label>
                )}
              </div>

              {/* ── Geographic Profile ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>Geographic Profile</SectionHeader>

                <Label text="Engineering Location">
                  <input
                    type="text"
                    className={cx}
                    value={form.engLocation ?? ''}
                    onChange={e => setForm(f => ({ ...f, engLocation: e.target.value }))}
                    placeholder="e.g. Arlington, VA"
                  />
                </Label>

                <Label text="Eng. Geo Offset %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.engGeoOffset ?? ''}
                      onChange={e => setForm(f => ({ ...f, engGeoOffset: e.target.value }))}
                      placeholder="0.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>

                <Label text="Production Location">
                  <input
                    type="text"
                    className={cx}
                    value={form.prodLocation ?? ''}
                    onChange={e => setForm(f => ({ ...f, prodLocation: e.target.value }))}
                    placeholder="e.g. Huntsville, AL"
                  />
                </Label>

                <Label text="Prod. Geo Offset %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.prodGeoOffset ?? ''}
                      onChange={e => setForm(f => ({ ...f, prodGeoOffset: e.target.value }))}
                      placeholder="0.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>
              </div>

              {/* ── Burden Rates ───────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>Burden Rates</SectionHeader>

                {/* Fringe toggle */}
                <Label text="Fringe Included in OH?" span>
                  <div className="flex gap-6 mt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="fringeInOH"
                        checked={form.fringeInOH === true}
                        onChange={() => setForm(f => ({ ...f, fringeInOH: true }))}
                        className="accent-blue-600"
                      />
                      Yes — fringe is embedded in overhead
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="fringeInOH"
                        checked={form.fringeInOH === false}
                        onChange={() => setForm(f => ({ ...f, fringeInOH: false }))}
                        className="accent-blue-600"
                      />
                      No — fringe is a separate pool
                    </label>
                  </div>
                </Label>

                {form.fringeInOH === false && (
                  <Label text="Fringe Rate %">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        className={pct}
                        value={form.fringeRate ?? ''}
                        onChange={e => setForm(f => ({ ...f, fringeRate: e.target.value }))}
                        placeholder="e.g. 28.00"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                    </div>
                  </Label>
                )}

                <Label text="Engineering OH Rate %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.engOHRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, engOHRate: e.target.value }))}
                      placeholder="e.g. 95.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>

                <Label text="Mfg OH Rate %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.mfgOHRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, mfgOHRate: e.target.value }))}
                      placeholder="e.g. 85.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>

                <Label text="Material Handling Rate %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.materialHandlingRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, materialHandlingRate: e.target.value }))}
                      placeholder="e.g. 5.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>

                <Label text="SubK Handling Rate %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.subkHandlingRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, subkHandlingRate: e.target.value }))}
                      placeholder="e.g. 3.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>
              </div>

              {/* ── G&A, Fee & Escalation ──────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>G&amp;A, Fee &amp; Escalation</SectionHeader>

                {/* G&A Structure */}
                <Label text="G&A Structure" span>
                  <div className="flex flex-col gap-3 mt-0.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="valueAddedGA"
                        checked={form.valueAddedGA === false}
                        onChange={() => setForm(f => ({ ...f, valueAddedGA: false }))}
                        className="accent-blue-600 mt-0.5 shrink-0"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Total Cost Input (TCI)</span>
                        <p className="text-xs text-gray-500 mt-0.5">G&A applied to all costs including materials and subcontracts</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="valueAddedGA"
                        checked={form.valueAddedGA === true}
                        onChange={() => setForm(f => ({ ...f, valueAddedGA: true }))}
                        className="accent-blue-600 mt-0.5 shrink-0"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Value-Added (VA)</span>
                        <p className="text-xs text-gray-500 mt-0.5">G&A applied to labor and OH only — materials and SubK excluded from G&A base</p>
                      </div>
                    </label>
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mt-2">
                    Value-Added G&A can significantly lower TEP on material-heavy contracts even when labor rates are higher.
                  </p>
                </Label>

                <Label text="G&amp;A Rate %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.gaRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, gaRate: e.target.value }))}
                      placeholder="e.g. 12.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>

                <Label text="Fee Rate %">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.feeRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, feeRate: e.target.value }))}
                      placeholder="e.g. 8.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>

                <Label text="Escalation Rate % (shared across all competitors)" span>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="0.01"
                      className={pct}
                      value={form.escalationRate ?? ''}
                      onChange={e => setForm(f => ({ ...f, escalationRate: e.target.value }))}
                      placeholder="e.g. 3.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  </div>
                </Label>
              </div>

              {/* ── Notes ──────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-y-4">
                <SectionHeader>Notes</SectionHeader>
                <Label text="Analyst Notes">
                  <textarea
                    rows={3}
                    className={cx + ' resize-y'}
                    value={form.notes ?? ''}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Source documents, assumptions, intel confidence level…"
                  />
                </Label>
              </div>

              {/* ── Footer ─────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
                <StatusBanner status={status} />
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="ml-auto px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                >
                  {saving ? 'Saving…' : 'Save Rates'}
                </button>
              </div>

            </form>
          </div>
        )}

        {selectedId == null && competitors.length > 0 && (
          <p className="text-center text-sm text-gray-400">
            Select a competitor above to enter their rate assumptions.
          </p>
        )}

      </div>
    </div>
  )
}
