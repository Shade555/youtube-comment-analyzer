import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'

function App() {
  const [activePage, setActivePage] = useState<"dashboard" | "history">("dashboard")

  return (
    <div className="flex min-h-screen bg-[#0f1016] text-white">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      
      <main className="flex-1 ml-16 p-4 md:p-8 overflow-y-auto">
        {activePage === "dashboard" ? <Dashboard /> : <History />}
      </main>
    </div>
  )
}

export default App
