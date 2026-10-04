import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <main className="flex h-dvh flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 md:p-6">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="relative flex min-h-0 flex-1 gap-3 sm:gap-4">
        {sidebarOpen && (
          <div className="hidden md:flex">
            <Sidebar />
          </div>
        )}

        {sidebarOpen && (
          <div className="absolute inset-0 z-20 md:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              className="absolute inset-0 h-full w-full bg-black/20 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />

            <div className="relative z-10 h-full w-72 max-w-[85%]">
              <Sidebar />
            </div>
          </div>
        )}

        <ChatArea />
      </div>
    </main>
  )
}

export default App
