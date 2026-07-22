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
    <div className="relative flex items-center gap-2 border border-line rounded px-3 py-2 focus-within:border-accent">
      <span className="text-accent">$</span>
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="peer min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-dim"
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
        className="shrink-0 text-dim hover:text-accent"
      >
        ↵
      </button>
    </div>
  );
}
