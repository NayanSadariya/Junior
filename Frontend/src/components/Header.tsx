type HeaderProps = {
  onMenuClick: () => void
}

function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="glass flex h-16 shrink-0 items-center justify-between rounded-2xl px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-zinc-600 transition hover:bg-black/5"
        >
          ☰
        </button>

        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          JUNIOR
        </h1>
      </div>

      <button
        type="button"
        className="rounded-xl px-3 py-2 text-sm text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900"
      >
        Settings
      </button>
    </header>
  )
}

export default Header
