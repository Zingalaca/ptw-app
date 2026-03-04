import { useAppContext } from '../../context/AppContext'

export default function ExportBar() {
  const { contracts, selectedContractId, setSelectedContractId, selectedScenarioId } = useAppContext()
  const selectedContract = contracts.find((c) => c.id === selectedContractId)
  const canExport = selectedScenarioId != null

  function handleExport() {
    if (!canExport) return
    window.open(`/api/export/${selectedScenarioId}/excel`, '_blank')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 min-w-[220px]">
        <span className="text-white font-bold text-base tracking-tight">PTW Analyzer</span>
        {selectedContract && (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono truncate max-w-[120px]">
            {selectedContract.contractNumber}
          </span>
        )}
      </div>

      {/* Contract selector */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium shrink-0">
          Contract
        </label>
        <select
          value={selectedContractId ?? ''}
          onChange={(e) => setSelectedContractId(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-sm"
        >
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.contractNumber} — {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Export button */}
      <div className="min-w-[220px] flex justify-end">
        <button
          onClick={handleExport}
          disabled={!canExport}
          title={canExport ? 'Export to Excel' : 'Select a scenario to enable export'}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            canExport
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export Excel
        </button>
      </div>
    </header>
  )
}
