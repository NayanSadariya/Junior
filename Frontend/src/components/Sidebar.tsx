import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import type { Conversation } from '../types/conversation'

type SidebarProps = {
  userId: string
  activeConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onNewChat: () => void
  onDeleteConversation: (conversationId: string) => void
  refreshKey: number
}

function Sidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  refreshKey,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadConversations() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest<Conversation[]>(
          `/conversations/${userId}`,
        )

        if (!cancelled) {
          setConversations(data)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load conversations.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadConversations()

    return () => {
      cancelled = true
    }
  }, [refreshKey, userId])

  function startEditing(conversation: Conversation) {
    setEditingId(conversation.conversation_id)
    setEditingTitle(conversation.title)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingTitle('')
  }

  async function saveTitle(conversationId: string) {
    const title = editingTitle.trim()

    if (!title) {
      cancelEditing()
      return
    }

    try {
      await apiRequest(`/conversations/${conversationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          user_id: userId,
          title,
        }),
      })

      setConversations((current) =>
        current.map((conversation) =>
          conversation.conversation_id === conversationId
            ? { ...conversation, title }
            : conversation,
        ),
      )

      cancelEditing()
    } catch {
      setError('Could not rename conversation.')
    }
  }

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
          <p className="px-2 py-3 text-sm text-red-500">
            {error}
          </p>
        )}

        {!loading && !error && conversations.length === 0 && (
          <p className="px-2 py-3 text-sm text-zinc-400">
            No conversations yet.
          </p>
        )}

        <div className="space-y-1">
          {conversations.map((conversation) => {
            const isActive =
              activeConversationId === conversation.conversation_id

            const isEditing =
              editingId === conversation.conversation_id

            return (
              <div
                key={conversation.conversation_id}
                className={`group flex items-center gap-1 rounded-xl transition ${
                  isActive ? 'bg-black/10' : 'hover:bg-black/5'
                }`}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(event) =>
                      setEditingTitle(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void saveTitle(conversation.conversation_id)
                      }

                      if (event.key === 'Escape') {
                        cancelEditing()
                      }
                    }}
                    onBlur={() => {
                      void saveTitle(conversation.conversation_id)
                    }}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-900 outline-none"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectConversation(
                          conversation.conversation_id,
                        )
                      }
                      className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm ${
                        isActive
                          ? 'font-medium text-zinc-900'
                          : 'text-zinc-700'
                      }`}
                      title={conversation.title}
                    >
                      {conversation.title}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditing(conversation)}
                      aria-label={`Rename ${conversation.title}`}
                      className="mr-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-black/5 hover:text-zinc-900 md:hidden md:group-hover:block"
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDeleteConversation(
                          conversation.conversation_id,
                        )
                      }
                      aria-label={`Delete ${conversation.title}`}
                      className="mr-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-red-500/10 hover:text-red-500 md:hidden md:group-hover:block"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
