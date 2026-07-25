import { Search } from "lucide-react";

// Plain GET form input — no client JS required for search to work at all.
export function SearchCommandInput({
  defaultValue,
  placeholder = 'meme find "fail sound effect"',
  showCursor = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  showCursor?: boolean;
}) {
  return (
    <div className="group relative flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-glow">
      <Search size={17} strokeWidth={2.25} className="shrink-0 text-dim transition-colors group-focus-within:text-accent" />
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="peer min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-dim/70"
      />
      {showCursor && !defaultValue && (
        <span
          aria-hidden
          className="cursor-blink pointer-events-none select-none text-accent peer-focus:hidden"
        >
          ▊
        </span>
      )}
      <button
        type="submit"
        aria-label="search"
        className="shrink-0 rounded-full p-1.5 text-dim transition-all duration-200 hover:gradient-brand hover:text-white"
      >
        ↵
      </button>
    </div>
  );
}
