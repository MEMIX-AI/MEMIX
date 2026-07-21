export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <span className="text-accent font-bold">memevault▊</span>
        <nav className="text-dim text-sm flex gap-4">
          <span>[library]</span>
          <span>[upload]</span>
          <span>[agent]</span>
          <span>[docs]</span>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="border border-line rounded p-6 max-w-md w-full">
          <p className="text-accent mb-2">▍ project initialized</p>
          <p className="text-dim text-sm">
            › the librarian is warming up. library, upload, and agent routes
            come online in the next phases.
          </p>
        </div>
      </main>

      <footer className="border-t border-line px-6 py-4 text-dim text-sm">
        memevault :~$▊
      </footer>
    </div>
  );
}
