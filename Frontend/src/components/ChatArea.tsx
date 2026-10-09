import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { apiRequest } from '../lib/api'
import type { Message } from '../types/message'

type ChatAreaProps = {
  userId: string
  conversationId: string | null
  onFirstMessage: (message: string) => void
}

type ChatResponse = {
  response: string
}

function ChatArea({
  userId,
  conversationId,
  onFirstMessage,
}: ChatAreaProps) {
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
          `/users/${userId}/conversations/${conversationId}/messages`,
        )

        if (!cancelled) {
          setMessages(data)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load messages.')
          setMessages([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadMessages()

    return () => {
      cancelled = true
    }
  }, [conversationId, userId])

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
          user_id: userId,
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
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="mb-3 mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-2 mt-4 text-xl font-semibold tracking-tight text-zinc-900">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mb-2 mt-3 text-lg font-semibold text-zinc-900">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-3 last:mb-0">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-3 list-disc space-y-1 pl-5">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-3 list-decimal space-y-1 pl-5">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="pl-1">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-zinc-900">
                            {children}
                          </strong>
                        ),
                        code: ({ children, className }) => {
                          const language =
                            className?.replace('language-', '') || ''
                          const code = String(children).replace(/\n$/, '')
                          const isCodeBlock = Boolean(className)

                          if (!isCodeBlock) {
                            return (
                              <code className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800">
                                {children}
                              </code>
                            )
                          }

                          return (
                            <div className="my-4 overflow-hidden rounded-xl border border-black/10">
                              <div className="flex items-center justify-between bg-zinc-950 px-4 py-2">
                                <span className="text-xs font-medium text-zinc-400">
                                  {language || 'code'}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void navigator.clipboard.writeText(code)
                                  }
                                  className="rounded-lg px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
                                >
                                  Copy
                                </button>
                              </div>

                              <SyntaxHighlighter
                                language={language || 'text'}
                                style={oneDark}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  borderRadius: 0,
                                  padding: '1rem',
                                  fontSize: '0.875rem',
                                  lineHeight: '1.5rem',
                                }}
                              >
                                {code}
                              </SyntaxHighlighter>
                            </div>
                          )
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="my-3 border-l-2 border-zinc-300 pl-4 italic text-zinc-500">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
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
        <p className="px-4 pb-2 text-sm text-red-500">{error}</p>
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
