import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { API_BASE } from '../../lib/api.js'

const SET_ASIDE_OPTIONS = [
  { value: '', label: 'None / Full & Open' },
  { value: 'SMALL_BUSINESS', label: 'Small Business' },
  { value: 'SDVOSB', label: 'SDVOSB' },
  { value: 'WOSB', label: 'WOSB' },
  { value: '8A', label: '8(a)' },
  { value: 'HUBZONE', label: 'HUBZone' },
]

const CLIN_TYPES = ['FFP', 'T&M', 'CPFF', 'CPAF']

const EMPTY_CONTRACT = {
  contractNumber: '',
  title: '',
  agency: '',
  naicsCode: '',
  setAside: '',
  popStart: '',
  popEnd: '',
  status: 'OPEN',
  description: '',
}

function toDateInput(val) {
  if (!val) return ''
  return new Date(val).toISOString().slice(0, 10)
}

const inputCls =
  'w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const labelCls = 'block text-xs font-medium text-slate-400 mb-1'

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

export default function ContractSetup() {
  const { contracts, setContracts, selectedContractId, setSelectedContractId } = useAppContext()

  const [form, setForm] = useState(EMPTY_CONTRACT)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const [clins, setClins] = useState([])
  const [clinSaving, setClinSaving] = useState({}) // { [clinId]: bool }

  // Load selected contract into form
  useEffect(() => {
    if (!selectedContractId) {
      setForm(EMPTY_CONTRACT)
      setClins([])
      return
    }
    setIsNew(false)
    const contract = contracts.find((c) => c.id === selectedContractId)
    if (contract) {
      setForm({
        contractNumber: contract.contractNumber ?? '',
        title: contract.title ?? '',
        agency: contract.agency ?? '',
        naicsCode: contract.naicsCode ?? '',
        setAside: contract.setAside ?? '',
        popStart: toDateInput(contract.popStart),
        popEnd: toDateInput(contract.popEnd),
        status: contract.status ?? 'OPEN',
        description: contract.description ?? '',
      })
    }
    // Fetch CLINs
    fetch(`${API_BASE}/api/contracts/${selectedContractId}/clins`)
      .then((r) => r.json())
      .then(setClins)
      .catch(console.error)
  }, [selectedContractId, contracts])

  function set(field) {
    return (e) => {
      setStatus(null)
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }
  }

  function handleNew() {
    setIsNew(true)
    setForm(EMPTY_CONTRACT)
    setClins([])
    setStatus(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const body = {
        ...form,
        popStart: form.popStart || undefined,
        popEnd: form.popEnd || undefined,
        naicsCode: form.naicsCode || undefined,
        setAside: form.setAside || undefined,
        description: form.description || undefined,
      }

      let saved
      if (isNew) {
        const res = await fetch(`${API_BASE}/api/contracts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? res.statusText)
        saved = await res.json()
      } else {
        const res = await fetch(`${API_BASE}/api/contracts/${selectedContractId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? res.statusText)
        saved = await res.json()
      }

      // Reload contracts list
      const updated = await fetch(`${API_BASE}/api/contracts`).then((r) => r.json())
      setContracts(updated)
      if (isNew) {
        setSelectedContractId(saved.id)
      }
      setIsNew(false)
      setStatus({ type: 'success', msg: 'Contract saved.' })
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── CLIN operations ──────────────────────────────────────────────────────────

  async function handleAddClin() {
    if (!selectedContractId) return
    const newClin = {
      clinNumber: '',
      description: '',
      clinType: 'FFP',
      quantity: 1,
      unit: 'LOT',
      isOption: false,
      optionYear: null,
    }
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${selectedContractId}/clins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClin),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText)
      const clin = await res.json()
      setClins((prev) => [...prev, clin])
    } catch (err) {
      setStatus({ type: 'error', msg: `Add CLIN failed: ${err.message}` })
    }
  }

  async function handleDeleteClin(clinId) {
    try {
      await fetch(`${API_BASE}/api/contracts/${selectedContractId}/clins/${clinId}`, { method: 'DELETE' })
      setClins((prev) => prev.filter((c) => c.id !== clinId))
    } catch (err) {
      setStatus({ type: 'error', msg: `Delete failed: ${err.message}` })
    }
  }

  function updateClinLocal(clinId, field, value) {
    setClins((prev) =>
      prev.map((c) => (c.id === clinId ? { ...c, [field]: value } : c)),
    )
  }

  async function saveClin(clin) {
    if (!clin.clinNumber || !clin.description || !clin.clinType) return
    setClinSaving((s) => ({ ...s, [clin.id]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/contracts/${selectedContractId}/clins/${clin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinNumber: clin.clinNumber,
          description: clin.description,
          clinType: clin.clinType,
          quantity: Number(clin.quantity) || 1,
          unit: clin.unit || 'LOT',
          isOption: clin.isOption,
          optionYear: clin.optionYear || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error)
      }
    } catch (err) {
      setStatus({ type: 'error', msg: `CLIN save failed: ${err.message}` })
    } finally {
      setClinSaving((s) => ({ ...s, [clin.id]: false }))
    }
  }

  const showClins = !isNew && selectedContractId

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contract Setup</h1>
            <p className="text-sm text-slate-500 mt-1">Configure contract details and CLINs.</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Contract
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* ── Left: Contract form ─────────────────────────────────────── */}
          <div className="xl:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-5">
              {isNew ? 'New Contract' : 'Contract Details'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contract Number *">
                  <input
                    className={inputCls}
                    value={form.contractNumber}
                    onChange={set('contractNumber')}
                    placeholder="W91WAW-26-R-0042"
                    required
                  />
                </Field>
                <Field label="Status">
                  <select className={inputCls} value={form.status} onChange={set('status')}>
                    <option value="OPEN">Open</option>
                    <option value="AWARDED">Awarded</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </Field>
              </div>

              <Field label="Title *">
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Contract title"
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Agency *">
                  <input
                    className={inputCls}
                    value={form.agency}
                    onChange={set('agency')}
                    placeholder="e.g. Army AISM"
                    required
                  />
                </Field>
                <Field label="NAICS Code">
                  <input
                    className={inputCls}
                    value={form.naicsCode}
                    onChange={set('naicsCode')}
                    placeholder="e.g. 541511"
                  />
                </Field>
              </div>

              <Field label="Set-Aside">
                <select className={inputCls} value={form.setAside} onChange={set('setAside')}>
                  {SET_ASIDE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="PoP Start">
                  <input type="date" className={inputCls} value={form.popStart} onChange={set('popStart')} />
                </Field>
                <Field label="PoP End">
                  <input type="date" className={inputCls} value={form.popEnd} onChange={set('popEnd')} />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Optional description…"
                />
              </Field>

              {/* Status banner */}
              {status && (
                <div className={`px-3 py-2 text-sm rounded-lg border ${
                  status.type === 'success'
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                    : 'bg-red-950 border-red-800 text-red-400'
                }`}>
                  {status.msg}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Contract'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Right: CLIN table ──────────────────────────────────────── */}
          <div className="xl:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-300">CLINs</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Edit inline · changes saved on blur
                </p>
              </div>
              {showClins && (
                <button
                  onClick={handleAddClin}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add CLIN
                </button>
              )}
            </div>

            {!showClins ? (
              <div className="p-10 text-center text-slate-500 text-sm">
                {isNew ? 'Save the contract first to add CLINs.' : 'Select a contract to manage CLINs.'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 uppercase tracking-wider border-b border-slate-800">
                        <th className="px-3 py-2.5 font-semibold">CLIN #</th>
                        <th className="px-3 py-2.5 font-semibold">Description</th>
                        <th className="px-3 py-2.5 font-semibold">Type</th>
                        <th className="px-3 py-2.5 font-semibold">Qty</th>
                        <th className="px-3 py-2.5 font-semibold">Unit</th>
                        <th className="px-3 py-2.5 font-semibold">Opt Yr</th>
                        <th className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {clins.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                            No CLINs yet. Click "Add CLIN" to get started.
                          </td>
                        </tr>
                      )}
                      {clins.map((clin) => (
                        <ClinRow
                          key={clin.id}
                          clin={clin}
                          saving={clinSaving[clin.id]}
                          onChange={(field, value) => updateClinLocal(clin.id, field, value)}
                          onBlur={() => saveClin(clins.find((c) => c.id === clin.id))}
                          onDelete={() => handleDeleteClin(clin.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Info note */}
                <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 flex items-start gap-2">
                  <svg className="h-3.5 w-3.5 mt-0.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Escalation is configured per-scenario in Rate Model.
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── CLIN row ──────────────────────────────────────────────────────────────────

const cellInput =
  'w-full bg-transparent border border-transparent rounded px-1.5 py-1 text-slate-300 hover:border-slate-700 focus:border-blue-500 focus:bg-slate-800 focus:outline-none transition-colors text-xs'

function ClinRow({ clin, saving, onChange, onBlur, onDelete }) {
  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td className="px-2 py-1.5">
        <input
          className={`${cellInput} w-20 font-mono`}
          value={clin.clinNumber}
          onChange={(e) => onChange('clinNumber', e.target.value)}
          onBlur={onBlur}
          placeholder="0001"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          className={`${cellInput} min-w-[160px]`}
          value={clin.description}
          onChange={(e) => onChange('description', e.target.value)}
          onBlur={onBlur}
          placeholder="Description"
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          className={cellInput}
          value={clin.clinType}
          onChange={(e) => onChange('clinType', e.target.value)}
          onBlur={onBlur}
        >
          {CLIN_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          className={`${cellInput} w-16`}
          value={clin.quantity ?? ''}
          onChange={(e) => onChange('quantity', e.target.value)}
          onBlur={onBlur}
          min={1}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          className={`${cellInput} w-16`}
          value={clin.unit ?? ''}
          onChange={(e) => onChange('unit', e.target.value)}
          onBlur={onBlur}
          placeholder="LOT"
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          className={`${cellInput} w-16`}
          value={clin.optionYear ?? ''}
          onChange={(e) => onChange('optionYear', e.target.value || null)}
          onBlur={onBlur}
          placeholder="—"
        />
      </td>
      <td className="px-2 py-1.5 text-right">
        {saving ? (
          <svg className="h-3.5 w-3.5 animate-spin text-blue-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        ) : (
          <button
            onClick={onDelete}
            className="text-slate-600 hover:text-red-400 transition-colors"
            title="Delete CLIN"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
}
