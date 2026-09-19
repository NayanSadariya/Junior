function ChatArea() {
  return (
    <section className="glass flex min-w-0 flex-1 flex-col rounded-2xl">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            Personal AI
          </p>

          <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">
            How can I help?
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Ask JUNIOR anything. Your conversations and memories stay connected
            through your personal AI backend.
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/50 px-4 py-3 backdrop-blur-xl">
          <input
            type="text"
            placeholder="Message JUNIOR..."
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />

          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm text-white transition hover:bg-zinc-800"
          >
            ↑
          </button>
        </div>
      </div>
    </section>
  )
}

export default ChatArea