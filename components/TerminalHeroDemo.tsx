import { Sparkles, CheckCircle2 } from "lucide-react";
import { SearchCommandInput } from "./SearchCommandInput";

// Illustrative product demo (static, server-rendered — no typewriter JS,
// keeping motion minimal). The clickable result rows link into a real
// search so the "demo" isn't a dead end. The real, functional search
// input is the empty prompt below it.
const DEMO_QUERY = "fail sound effect";
const DEMO_RESULTS = [
  { title: "sad-trombone-fail.mp3", type: "sound" },
  { title: "epic-fail-compilation.mp4", type: "clip" },
  { title: "bruh-sound-effect-2.mp3", type: "sound" },
];

export function TerminalHeroDemo() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-panel shadow-soft-lg">
      <div className="gradient-brand flex items-center gap-2 px-5 py-3 text-xs font-medium text-white/90">
        <Sparkles size={14} strokeWidth={1.75} />
        <span>the librarian — try a search</span>
      </div>

      <div className="p-5 text-sm sm:p-7">
        <p className="mb-4 font-mono text-text">
          <span className="font-semibold text-accent">meme find</span> &quot;{DEMO_QUERY}&quot;
        </p>

        <div className="mb-4 flex flex-col gap-1.5">
          {DEMO_RESULTS.map((r) => (
            <a
              key={r.title}
              href={`/library?q=${encodeURIComponent(DEMO_QUERY)}`}
              className="group flex items-center gap-2 rounded-lg px-2 py-1 text-dim transition-colors hover:bg-bg hover:text-accent"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/40 transition-colors group-hover:bg-accent" />
              {r.title} <span className="text-dim/70">({r.type})</span>
            </a>
          ))}
        </div>

        <p className="mb-5 flex items-center gap-1.5 font-medium text-ok">
          <CheckCircle2 size={15} strokeWidth={1.75} />
          {DEMO_RESULTS.length} results · free download
        </p>

        <form action="/library" method="GET">
          <SearchCommandInput placeholder='meme find "your search here"' showCursor />
        </form>
      </div>
    </div>
  );
}
