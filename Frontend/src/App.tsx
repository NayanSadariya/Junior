import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import { apiRequest } from './lib/api'
import Login from './components/login'
import type { GoogleUser } from './types/auth'

type CreateConversationResponse = {
  conversation_id: string
  title: string
}

function App() {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [creatingChat, setCreatingChat] = useState(false)
  const [error, setError] = useState('')

  if (!googleUser) {
    return <Login onLogin={setGoogleUser} />
  }

  const userId = googleUser.sub

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId)
    setSidebarOpen(false)
    setError('')
  }

  async function createConversation(): Promise<string> {
    const conversation = await apiRequest<CreateConversationResponse>(
      '/conversations',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          title: 'New Chat',
        }),
      },
    )

    setActiveConversationId(conversation.conversation_id)
    setRefreshKey((current) => current + 1)
    setSidebarOpen(false)

    return conversation.conversation_id
  }

  async function handleNewChat() {
    if (creatingChat) return

    setCreatingChat(true)
    setError('')

    try {
      await createConversation()
    } catch {
      setError('Could not create a new conversation.')
    } finally {
      setCreatingChat(false)
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation?',
    )

    if (!confirmed) return

    try {
      await apiRequest(`/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (activeConversationId === conversationId) {
        setActiveConversationId(null)
      }

      setRefreshKey((current) => current + 1)
      setError('')
    } catch {
      setError('Could not delete conversation.')
    }
  }

  async function handleFirstMessage(
    message: string,
    conversationId: string,
  ) {
    const trimmedMessage = message.trim()

    if (!trimmedMessage) return

    const title =
      trimmedMessage.length > 40
        ? `${trimmedMessage.slice(0, 40)}...`
        : trimmedMessage

    try {
      await apiRequest(`/conversations/${conversationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          user_id: userId,
          title,
        }),
      })

      setRefreshKey((current) => current + 1)
    } catch (error) {
      console.error('Could not update conversation title:', error)
    }
  }

  return (
    <main className="flex h-dvh flex-col gap-3 overflow-hidden p-3 sm:p-4">
      <Header onMenuClick={() => setSidebarOpen((open) => !open)} />

      <div className="flex min-h-0 flex-1 gap-3">
        {sidebarOpen && (
          <Sidebar
            userId={userId}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={() => void handleNewChat()}
            onDeleteConversation={handleDeleteConversation}
            refreshKey={refreshKey}
          />
        )}

        <ChatArea
          userId={userId}
          conversationId={activeConversationId}
          onCreateConversation={createConversation}
          onFirstMessage={(message, conversationId) =>
            void handleFirstMessage(message, conversationId)
          }
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </main>
  )
}

export default App
