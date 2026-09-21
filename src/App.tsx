import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { Landing } from './pages/Landing'
import { AuthProvider, useAuth } from './context/AuthContext'

type Page = 'landing' | 'dashboard' | 'history'

function AppShell() {
  const { user, isGuest, isLoading, logout } = useAuth()
  const [activePage, setActivePage] = useState<Page | null>(null)

  // Decide the initial page once the session has been restored. This is what
  // keeps the user on the Dashboard after a page refresh.
  useEffect(() => {
    if (isLoading) return
    if (activePage === null) {
      setActivePage(user || isGuest ? 'dashboard' : 'landing')
    }
  }, [isLoading, user, isGuest, activePage])

  const handleLogout = async () => {
    await logout()
    setActivePage('landing')
  }

  if (isLoading || activePage === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1016] text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (activePage === 'landing') {
    return <Landing onEnterApp={() => setActivePage('dashboard')} />
  }

  return (
    <div className="flex min-h-screen bg-[#0f1016] text-white">
      <Sidebar
        activePage={activePage as 'dashboard' | 'history'}
        setActivePage={(page) => setActivePage(page)}
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-16 p-4 md:p-8 overflow-y-auto">
        {activePage === 'dashboard' && <Dashboard onLogout={handleLogout} />}
        {activePage === 'history' && <History onLogout={handleLogout} />}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App