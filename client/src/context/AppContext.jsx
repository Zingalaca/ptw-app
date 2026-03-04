import { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE } from '../lib/api.js'

const AppContext = createContext(null)

export function useAppContext() {
  return useContext(AppContext)
}

export function AppProvider({ children }) {
  const [contracts, setContracts] = useState([])
  const [selectedContractId, setSelectedContractIdRaw] = useState(() => {
    const stored = localStorage.getItem('selectedContractId')
    return stored ? Number(stored) : null
  })
  const [selectedScenarioId, setSelectedScenarioId] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')

  function setSelectedContractId(id) {
    setSelectedContractIdRaw(id)
    if (id != null) {
      localStorage.setItem('selectedContractId', String(id))
    } else {
      localStorage.removeItem('selectedContractId')
    }
    setSelectedScenarioId(null)
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/contracts`)
      .then((r) => r.json())
      .then((data) => {
        setContracts(data)
        if (data.length > 0) {
          const stored = localStorage.getItem('selectedContractId')
          const storedId = stored ? Number(stored) : null
          const valid = storedId && data.find((c) => c.id === storedId)
          if (!valid) {
            const first = data[0]
            setSelectedContractIdRaw(first.id)
            localStorage.setItem('selectedContractId', String(first.id))
          }
        }
      })
      .catch(console.error)
  }, [])

  return (
    <AppContext.Provider
      value={{
        contracts,
        setContracts,
        selectedContractId,
        setSelectedContractId,
        selectedScenarioId,
        setSelectedScenarioId,
        activePage,
        setActivePage,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
