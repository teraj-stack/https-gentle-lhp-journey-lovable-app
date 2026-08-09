import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight } from "lucide-react";
import { searchTopics, type ScoredEntry } from "@/lib/searchIndex";
import { cn } from "@/lib/utils";

const TopicSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results: ScoredEntry[] = useMemo(() => searchTopics(query, 8), [query]);

  // Click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset active item on new results
  useEffect(() => setActiveIdx(0), [query]);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIdx].path);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      {/* Input */}
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-sm border bg-background/70 backdrop-blur-md transition-all",
          "border-primary/30 hover:border-primary/50",
          showDropdown && "border-primary/60 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.4)]"
        )}
      >
        <Search className="w-5 h-5 text-primary ml-4 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Szukaj tematu: hemoroidy, pajączki, EVLT, przetoki…"
          aria-label="Wyszukaj temat"
          className="flex-1 bg-transparent py-4 pr-4 text-foreground placeholder:text-muted-foreground/70 outline-none text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="mr-3 p-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Wyczyść"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick-tag chips when empty + focused */}
      {open && query.trim().length < 2 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {["Hemoroidy", "Pajączki", "EVLT", "FiLaC", "SiLaC", "Profilaktyka żylaków"].map(
            (tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  inputRef.current?.focus();
                }}
                className="px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground border border-primary/20 rounded-sm hover:border-primary/60 hover:text-primary transition-colors bg-background/40 backdrop-blur-sm"
              >
                {tag}
              </button>
            )
          )}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-sm border border-primary/30 bg-card/95 backdrop-blur-xl shadow-[0_20px_60px_-10px_hsl(var(--primary)/0.35)] overflow-hidden"
        >
          {results.length === 0 ? (
            <div className="px-5 py-6 text-center text-muted-foreground text-sm font-serif italic">
              Brak wyników dla „{query}". Spróbuj innego hasła lub{" "}
              <button
                onClick={() => go("/kontakt")}
                className="text-primary hover:underline"
              >
                skontaktuj się z nami
              </button>
              .
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {results.map((r, idx) => (
                <li key={r.path}>
                  <button
                    type="button"
                    onClick={() => go(r.path)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      "w-full text-left px-5 py-3 flex items-center gap-4 group transition-colors border-l-2",
                      idx === activeIdx
                        ? "bg-primary/10 border-primary"
                        : "border-transparent hover:bg-primary/5"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium truncate">
                          {r.title}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-primary/80 px-1.5 py-0.5 border border-primary/30 rounded-sm shrink-0">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {r.excerpt}
                      </p>
                    </div>
                    <ArrowRight
                      className={cn(
                        "w-4 h-4 shrink-0 transition-all",
                        idx === activeIdx
                          ? "text-primary translate-x-0 opacity-100"
                          : "text-muted-foreground/40 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicSearch;
