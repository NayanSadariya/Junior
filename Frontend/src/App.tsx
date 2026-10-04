import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import { apiRequest } from './lib/api'

type CreateConversationResponse = {
  conversation_id: string
  title: string
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [creatingChat, setCreatingChat] = useState(false)
  const [error, setError] = useState('')

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId)
    setSidebarOpen(false)
    setError('')
  }

  async function handleNewChat() {
    if (creatingChat) return

    setCreatingChat(true)
    setError('')

    try {
      const conversation = await apiRequest<CreateConversationResponse>(
        '/conversations',
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: 'nayan',
            title: 'New Chat',
          }),
        },
      )

      setActiveConversationId(conversation.conversation_id)
      setRefreshKey((current) => current + 1)
      setSidebarOpen(false)
    } catch {
      setError('Could not create a new conversation.')
    } finally {
      setCreatingChat(false)
    }
  }

  return (
    <main className="flex h-dvh flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 md:p-6">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="relative flex min-h-0 flex-1 gap-3 sm:gap-4">
        {sidebarOpen && (
          <div className="hidden md:flex">
            <Sidebar
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              refreshKey={refreshKey}
            />
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
              <Sidebar
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        )}

        <ChatArea conversationId={activeConversationId} />
      </div>
    </main>
  )
}

export default App
