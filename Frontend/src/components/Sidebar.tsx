import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import type { Conversation } from '../types/conversation'

type SidebarProps = {
  activeConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onNewChat: () => void
  refreshKey: number
}

function Sidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  refreshKey,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadConversations() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest<Conversation[]>(
          '/conversations/nayan',
        )
        if (!cancelled) setConversations(data)
      } catch {
        if (!cancelled) setError('Could not load conversations.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadConversations()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return (
    <aside className="glass flex h-full w-full flex-col rounded-2xl p-4 md:h-auto md:w-64 md:shrink-0">
      <button
        type="button"
        onClick={onNewChat}
        className="mb-6 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        + New Chat
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Conversations
        </p>

        {loading && (
          <p className="px-2 py-3 text-sm text-zinc-400">
            Loading conversations...
          </p>
        )}

        {error && (
          <p className="px-2 py-3 text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && conversations.length === 0 && (
          <p className="px-2 py-3 text-sm text-zinc-400">
            No conversations yet.
          </p>
        )}

        <div className="space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.conversation_id}
              type="button"
              onClick={() =>
                onSelectConversation(conversation.conversation_id)
              }
              className={`w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition ${
                activeConversationId === conversation.conversation_id
                  ? 'bg-black/10 font-medium text-zinc-900'
                  : 'text-zinc-700 hover:bg-black/5'
              }`}
              title={conversation.title}
            >
              {conversation.title}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
