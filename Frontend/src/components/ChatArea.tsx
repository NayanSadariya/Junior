import { useEffect, useState, useRef } from 'react'
import { apiRequest } from '../lib/api'
import type { Message } from '../types/message'

type ChatAreaProps = {
  conversationId: string | null
  onFirstMessage: (message: string) => void
}

type ChatResponse = {
  response: string
}

function ChatArea({ conversationId, onFirstMessage }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setError('')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadMessages() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest<Message[]>(
          `/users/nayan/conversations/${conversationId}/messages`,
        )

        if (!cancelled) setMessages(data)
      } catch {
        if (!cancelled) {
          setError('Could not load messages.')
          setMessages([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()

    if (!text || !conversationId || sending) return

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    const isFirstMessage = messages.length === 0

    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)
    setError('')

    if (isFirstMessage) {
      onFirstMessage(text)
    }

    try {
      const data = await apiRequest<ChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'nayan',
          conversation_id: conversationId,
          message: text,
        }),
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }

      setMessages((current) => [...current, assistantMessage])
    } catch {
      setError('Message failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="glass flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {!conversationId ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-lg text-center">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                Personal AI
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                How can I help?
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Select a conversation or start a new one with JUNIOR.
              </p>
            </div>
          </div>
        ) : loading ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            Loading messages...
          </p>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                    message.role === 'user'
                      ? 'bg-zinc-900 text-white'
                      : 'border border-black/5 bg-white/70 text-zinc-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending && (
              <p className="text-sm text-zinc-400">
                JUNIOR is thinking...
              </p>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/50 px-4 py-3 backdrop-blur-xl">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            placeholder={
              conversationId
                ? 'Message JUNIOR...'
                : 'Select a conversation first...'
            }
            disabled={!conversationId || loading || sending}
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed"
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!conversationId || !input.trim() || loading || sending}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>
    </section>
  )
}

export default ChatArea