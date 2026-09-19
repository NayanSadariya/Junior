function Sidebar() {
  return (
    <aside className="glass flex w-64 shrink-0 flex-col rounded-2xl p-4">
      <button
        type="button"
        className="mb-6 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        + New Chat
      </button>

      <div>
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Conversations
        </p>

        <div className="space-y-1">
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-black/5"
          >
            Kiwii Development
          </button>

          <button
            type="button"
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-black/5"
          >
            Polaris
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar