import { useState } from 'react'
import { API_BASE } from '../../lib/api.js'

export default function Settings() {
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  async function handleReseed() {
    if (!window.confirm(
      'This will reset all demo data to its original state. Any custom changes will be lost. Continue?'
    )) return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch(`${API_BASE}/api/admin/reseed`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      setStatus('success')
      setMessage('Demo data reset successfully. Refresh the page to see fresh data.')
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Application settings and demo data management.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Reset Demo Data</h2>
          <p className="text-sm text-gray-500 mb-4">
            Reloads the original seed data — contract{' '}
            <strong className="text-gray-700">W91WAW-26-R-0042</strong>, 4 competitors, 3 scenarios,
            and all TEP results. Use this to restore the app to a known-good state after testing.
          </p>

          {status === 'success' && (
            <div className="mb-4 px-3 py-2 bg-green-50 border border-green-300 rounded text-sm text-green-700">
              {message}
            </div>
          )}
          {status === 'error' && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-300 rounded text-sm text-red-700">
              Reset failed: {message}
            </div>
          )}

          <button
            onClick={handleReseed}
            disabled={status === 'loading'}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? 'Resetting…' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
