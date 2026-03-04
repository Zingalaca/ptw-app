import { useAppContext } from '../../context/AppContext'
import ExportBar from './ExportBar'
import Sidebar from './Sidebar'
import PTWDashboard from '../PTWDashboard/PTWDashboard'
import TEPTable from '../TEPCalculator/TEPTable'
import RateModelForm from '../RateModel/RateModelForm'
import ContractSetup from '../ContractSetup/ContractSetup'

const PAGES = {
  dashboard: PTWDashboard,
  tep: TEPTable,
  rates: RateModelForm,
  setup: ContractSetup,
}

export default function AppShell() {
  const { activePage } = useAppContext()
  const Page = PAGES[activePage] ?? PTWDashboard

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <ExportBar />
      <Sidebar />
      <main className="ml-[220px] pt-14 min-h-screen overflow-y-auto">
        <Page />
      </main>
    </div>
  )
}
