import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { Landing } from './pages/Landing'

function App() {
  const [activePage, setActivePage] = useState<"landing" | "dashboard" | "history">("landing")
  const handleEnterApp = () => {
    // setIsGuest(guest)
    setActivePage("dashboard")
  }

  if (activePage === "landing") {
    return <Landing onEnterApp={handleEnterApp} />
  }

  return (
    <div className="flex min-h-screen bg-[#0f1016] text-white">
      <Sidebar activePage={activePage as "dashboard" | "history"} setActivePage={setActivePage} />
      
      <main className="flex-1 ml-16 p-4 md:p-8 overflow-y-auto">
        {activePage === "dashboard" ? <Dashboard onLogout={() => setActivePage("landing")} /> : <History />}
      </main>
    </div>
  )
}

export default App
