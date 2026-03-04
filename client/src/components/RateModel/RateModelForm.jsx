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
  fringeIncludedInOH: true,
  fringeRate: '',
  engOHRate: '',
  mfgOHRate: '',
  materialHandlingRate: '',
  subKHandlingRate: '',
  gaRate: '',
  feeRate: '',
  escalationRate: '',
}

// ─── Small layout primitives ──────────────────────────────────────────────────

function SectionHeader({ children }) {
  return (
    <h3 className="col-span-full text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1 mt-2 first:mt-0">
      {children}
    </h3>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

const inputBase =
  'border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400'

function TextInput({ ...props }) {
  return <input type="text" className={inputBase} {...props} />
}

function PctInput({ ...props }) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        className={`${inputBase} pr-7 w-full`}
        {...props}
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        %
      </span>
    </div>
  )
}

function SelectInput({ children, ...props }) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  )
}

// ─── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({ status }) {
  if (!status) return null
  const styles =
    status.type === 'success'
      ? 'bg-green-50 border-green-300 text-green-700'
      : 'bg-red-50 border-red-300 text-red-700'
  return (
    <div className={`border rounded px-3 py-2 text-sm ${styles}`}>
      {status.msg}
    </div>
  )
}

// ─── Competitor list ──────────────────────────────────────────────────────────

function CompetitorRow({ competitor, isSelected, onEdit }) {
  return (
    <tr
      className={`border-b border-gray-100 last:border-0 transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <td className="px-5 py-2.5 font-medium text-gray-800">{competitor.name}</td>
      <td className="px-5 py-2.5 text-gray-500">
        {competitor.estimatedRevenue != null
          ? `$${competitor.estimatedRevenue.toLocaleString()}M`
          : '—'}
      </td>
      <td className="px-5 py-2.5 text-gray-500">
        {competitor.historicalWinRate != null
          ? `${(competitor.historicalWinRate * 100).toFixed(0)}%`
          : '—'}
      </td>
      <td className="px-5 py-2.5 text-right">
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function RateModelForm() {
  const { selectedContractId } = useAppContext()
  const [competitors, setCompetitors] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [firstClinId, setFirstClinId] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  // ── Bootstrap data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedContractId) return
    setSelectedId(null)
    setForm(EMPTY_FORM)
    Promise.all([
      fetch(`${API_BASE}/api/contracts/${selectedContractId}/competitors`).then((r) => r.json()),
      fetch(`${API_BASE}/api/scenarios?contractId=${selectedContractId}`).then((r) => r.json()),
      fetch(`${API_BASE}/api/contracts/${selectedContractId}/clins`).then((r) => r.json()),
    ])
      .then(([comps, scens, clins]) => {
        setCompetitors(comps)
        setScenarios(scens)
        if (scens.length > 0) setSelectedScenarioId(scens[0].id)
        // Use the first base-year CLIN as the anchor for rate storage
        const base = clins.find((c) => !c.isOption) ?? clins[0]
        if (base) setFirstClinId(base.id)
      })
      .catch((err) => console.error('Bootstrap error:', err))
  }, [selectedContractId])

  // ── Helpers ────────────────────────────────────────────────────────────────
  function set(field) {
    return (e) => {
      setStatus(null)
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }
  }

  function setFringe(included) {
    setStatus(null)
    setForm((f) => ({ ...f, fringeIncludedInOH: included }))
  }

  // ── Load competitor rates ──────────────────────────────────────────────────
  function handleEdit(competitor) {
    if (selectedId === competitor.id) return
    setSelectedId(competitor.id)
    setStatus(null)
    setForm({ ...EMPTY_FORM, companyName: competitor.name })
    setLoading(true)

    fetch(`${API_BASE}/api/competitors/${competitor.id}/rates`)
      .then((r) => r.json())
      .then((data) => {
        // Rates are stored as { breakdown: { rateAssumption: {...} } } on any CLIN entry
        for (const group of data) {
          for (const clin of group.clins ?? []) {
            const ra = clin.breakdown?.rateAssumption
            if (ra) {
              setForm((f) => ({ ...f, ...ra, companyName: competitor.name }))
              return
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedId || !selectedScenarioId || !firstClinId) {
      setStatus({ type: 'error', msg: 'Missing scenario or CLIN context — cannot save.' })
      return
    }

    setSaving(true)
    setStatus(null)

    try {
      const res = await fetch(`${API_BASE}/api/competitors/${selectedId}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: Number(selectedScenarioId),
          clinId: firstClinId,
          totalPrice: 0,
          notes: `Rate assumptions snapshot for ${form.companyName}`,
          breakdown: { rateAssumption: form },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }

      setStatus({ type: 'success', msg: 'Rate assumptions saved successfully.' })
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setSaving(false)
    }
  }

  const selectedCompetitor = competitors.find((c) => c.id === selectedId)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rate Model</h1>
          <p className="text-sm text-gray-500 mt-1">
            Capture competitive rate assumptions for each bidder.
          </p>
        </div>

        {/* ── Competitor table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Competitors</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-2">Name</th>
                <th className="px-5 py-2">Est. Revenue</th>
                <th className="px-5 py-2">Win Rate</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {competitors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                    No competitors found.
                  </td>
                </tr>
              )}
              {competitors.map((c) => (
                <CompetitorRow
                  key={c.id}
                  competitor={c}
                  isSelected={selectedId === c.id}
                  onEdit={handleEdit}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Rate assumption form ─────────────────────────────────────────── */}
        {selectedId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Form header */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Rate Assumptions —{' '}
                  <span className="text-blue-700">{selectedCompetitor?.name}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  All percentage fields are entered as decimal values (e.g. 35.00 for 35%)
                </p>
              </div>
              {loading && (
                <span className="text-xs text-gray-400 italic">Loading saved rates…</span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-6">
              {/* ── Company Profile ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>Company Profile</SectionHeader>

                <Field label="Company Name">
                  <TextInput
                    value={form.companyName}
                    onChange={set('companyName')}
                    placeholder="e.g. Leidos"
                    required
                  />
                </Field>

                <Field label="Company Type">
                  <SelectInput
                    value={form.companyType}
                    onChange={set('companyType')}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </SelectInput>
                </Field>

                {form.companyType === 'private' && (
                  <Field label="Comparable Public Company" className="col-span-full">
                    <TextInput
                      value={form.comparablePublicCompany}
                      onChange={set('comparablePublicCompany')}
                      placeholder="e.g. SAIC"
                    />
                  </Field>
                )}
              </div>

              {/* ── Geographic Profile ───────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>Geographic Profile</SectionHeader>

                <Field label="Engineering Location">
                  <TextInput
                    value={form.engLocation}
                    onChange={set('engLocation')}
                    placeholder="e.g. Arlington, VA"
                  />
                </Field>
                <Field label="Eng. Geo Offset %">
                  <PctInput
                    value={form.engGeoOffset}
                    onChange={set('engGeoOffset')}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Production Location">
                  <TextInput
                    value={form.prodLocation}
                    onChange={set('prodLocation')}
                    placeholder="e.g. Huntsville, AL"
                  />
                </Field>
                <Field label="Prod. Geo Offset %">
                  <PctInput
                    value={form.prodGeoOffset}
                    onChange={set('prodGeoOffset')}
                    placeholder="0.00"
                  />
                </Field>
              </div>

              {/* ── Burden Rates ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>Burden Rates</SectionHeader>

                {/* Fringe toggle */}
                <Field label="Fringe Included in OH?" className="col-span-full">
                  <div className="flex gap-6 mt-0.5">
                    {[
                      { value: true, label: 'Yes — fringe is embedded in overhead' },
                      { value: false, label: 'No — fringe is a separate pool' },
                    ].map(({ value, label }) => (
                      <label key={String(value)} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input
                          type="radio"
                          name="fringeInOH"
                          checked={form.fringeIncludedInOH === value}
                          onChange={() => setFringe(value)}
                          className="accent-blue-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </Field>

                {!form.fringeIncludedInOH && (
                  <Field label="Fringe Rate %">
                    <PctInput
                      value={form.fringeRate}
                      onChange={set('fringeRate')}
                      placeholder="e.g. 28.00"
                    />
                  </Field>
                )}

                <Field label="Engineering OH Rate %">
                  <PctInput
                    value={form.engOHRate}
                    onChange={set('engOHRate')}
                    placeholder="e.g. 45.00"
                  />
                </Field>
                <Field label="Mfg OH Rate %">
                  <PctInput
                    value={form.mfgOHRate}
                    onChange={set('mfgOHRate')}
                    placeholder="e.g. 35.00"
                  />
                </Field>
                <Field label="Material Handling Rate %">
                  <PctInput
                    value={form.materialHandlingRate}
                    onChange={set('materialHandlingRate')}
                    placeholder="e.g. 5.00"
                  />
                </Field>
                <Field label="SubK Handling Rate %">
                  <PctInput
                    value={form.subKHandlingRate}
                    onChange={set('subKHandlingRate')}
                    placeholder="e.g. 3.00"
                  />
                </Field>
              </div>

              {/* ── G&A, Fee, Escalation ─────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SectionHeader>G&amp;A, Fee &amp; Escalation</SectionHeader>

                <Field label="G&amp;A Rate %">
                  <PctInput
                    value={form.gaRate}
                    onChange={set('gaRate')}
                    placeholder="e.g. 12.00"
                  />
                </Field>
                <Field label="Fee Rate %">
                  <PctInput
                    value={form.feeRate}
                    onChange={set('feeRate')}
                    placeholder="e.g. 8.00"
                  />
                </Field>
                <Field
                  label="Escalation Rate % (shared across all competitors)"
                  className="col-span-full"
                >
                  <PctInput
                    value={form.escalationRate}
                    onChange={set('escalationRate')}
                    placeholder="e.g. 3.00"
                    className="max-w-xs"
                  />
                </Field>
              </div>

              {/* ── Scenario context ─────────────────────────────────────── */}
              {scenarios.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <SectionHeader>Scenario Context</SectionHeader>
                  <Field label="Save rates under scenario" className="col-span-full">
                    <SelectInput
                      value={selectedScenarioId}
                      onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
                      className="max-w-xs"
                    >
                      {scenarios.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.isBaseline ? ' (baseline)' : ''}
                        </option>
                      ))}
                    </SelectInput>
                    <p className="text-xs text-gray-400 mt-1">
                      Rate assumptions are stored as a snapshot tied to the selected scenario.
                    </p>
                  </Field>
                </div>
              )}

              {/* ── Footer ───────────────────────────────────────────────── */}
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

        {!selectedId && competitors.length > 0 && (
          <p className="text-center text-sm text-gray-400">
            Select a competitor above to enter their rate assumptions.
          </p>
        )}
      </div>
    </div>
  )
}
