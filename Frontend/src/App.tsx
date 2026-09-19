import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'

function App() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-4 md:p-6">
      <Header />

      <div className="flex min-h-0 flex-1 gap-4">
        <Sidebar />
        <ChatArea />
      </div>
    </main>
  )
}

export default App