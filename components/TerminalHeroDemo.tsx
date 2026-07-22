import { SearchCommandInput } from "./SearchCommandInput";

// Illustrative product demo (static, server-rendered — no typewriter JS,
// keeping motion minimal per CLAUDE.md). The clickable result rows link
// into a real search so the "demo" isn't a dead end. The real, functional
// search input is the empty prompt below it.
const DEMO_QUERY = 'fail sound effect';
const DEMO_RESULTS = [
  { title: "sad-trombone-fail.mp3", type: "sound" },
  { title: "epic-fail-compilation.mp4", type: "clip" },
  { title: "bruh-sound-effect-2.mp3", type: "sound" },
];

export function TerminalHeroDemo() {
  return (
    <div className="overflow-hidden rounded border border-line bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs text-dim">
        <span className="h-2.5 w-2.5 rounded-full border border-line" />
        <span className="h-2.5 w-2.5 rounded-full border border-line" />
        <span className="h-2.5 w-2.5 rounded-full border border-line" />
        <span className="ml-2">~/memevault — librarian</span>
      </div>

      <div className="p-4 text-sm sm:p-6">
        <p className="mb-3 text-text">
          <span className="text-accent">$</span> meme find &quot;{DEMO_QUERY}&quot;
        </p>

        <div className="mb-3 flex flex-col gap-1">
          {DEMO_RESULTS.map((r) => (
            <a
              key={r.title}
              href={`/library?q=${encodeURIComponent(DEMO_QUERY)}`}
              className="text-dim hover:text-accent hover:underline"
            >
              › {r.title} <span className="text-dim">({r.type})</span>
            </a>
          ))}
        </div>

        <p className="mb-4 text-ok">
          ✓ {DEMO_RESULTS.length} results · free download
        </p>

        <form action="/library" method="GET">
          <SearchCommandInput
            placeholder='meme find "your search here"'
            showCursor
          />
        </form>
      </div>
    </div>
  );
}
