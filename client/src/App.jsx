import { useEffect, useState } from 'react'

function App() {
  const [apiMessage, setApiMessage] = useState('')

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data) => setApiMessage(data.message))
      .catch(() => setApiMessage('Could not reach server'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-800">PTW App</h1>
        <p className="text-lg text-gray-500">Price to Win — Government Contracting BD</p>
        <div className="mt-6 p-4 bg-white rounded-xl shadow text-sm text-gray-600">
          <span className="font-semibold">API:</span> {apiMessage || 'Loading…'}
        </div>
      </div>
    </div>
  )
}

export default App
