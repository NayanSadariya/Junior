function Header() {
  return (
    <header className="glass flex h-16 items-center justify-between rounded-2xl px-5">
      <div>
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