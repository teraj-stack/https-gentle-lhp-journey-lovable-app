import { useMemo, useState, useId } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, X, type LucideIcon } from "lucide-react";

/**
 * Reusable wyszukiwarka + filtry kategorii dla hubów medycznych
 * (Proktologia, Flebologia). Wyszukiwanie pełnotekstowe po tytule,
 * opisie i słowach kluczowych (`keywords`). Filtry to chipy działające
 * w trybie multi-select OR — kliknięcie chipa dodaje kategorię do zbioru
 * widocznych zabiegów; pusty zbiór = wszystkie.
 *
 * Stan żyje w komponencie (URL nie zachowuje filtrów świadomie — huby są
 * stronami eksploracyjnymi, deep-link to konkretny zabieg, nie do filtra).
 */
export type ProcedureItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Wyróżnik wizualny w prawym górnym rogu karty. */
  tag?: string;
  /**
   * Kategorie do filtrów-chipów. Procedura może mieć kilka — pojawi się
   * w wyniku każdego z odpowiadających filtrów.
   */
  categories: string[];
  /**
   * Dodatkowe słowa kluczowe doklejane do indeksu wyszukiwania
   * (poza title + description). Wpisuj synonimy, nazwy ludowe, skróty
   * — np. „hemoroidy, guzki krwawnicze, krwawienie".
   */
  keywords?: string[];
};

type Props = {
  procedures: ProcedureItem[];
  /** Etykieta nagłówka — domyślnie „Zabiegi". */
  heading?: string;
  /** Krótki podtytuł nad gridem. */
  subtitle?: string;
  /** Placeholder pola wyszukiwania. */
  searchPlaceholder?: string;
};

/** Polish-aware fold do wyszukiwania accent-insensitive (ą→a, ł→l, itd.). */
function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l"); // NFD nie rozkłada ł — manualny edge case
}

export default function ProcedureSearch({
  procedures,
  heading = "Zabiegi",
  subtitle,
  searchPlaceholder = "Szukaj zabiegu (np. żylaki, hemoroidy, pajączki)…",
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set()
  );
  const inputId = useId();

  // Lista dostępnych kategorii — z deduplikacją, kolejnością wystąpienia.
  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const p of procedures) {
      for (const c of p.categories) {
        if (!seen.has(c)) {
          seen.add(c);
          ordered.push(c);
        }
      }
    }
    return ordered;
  }, [procedures]);

  // Filtrowanie + scoring: dokładne matche w title > matche w keywords > description.
  const filtered = useMemo(() => {
    const q = foldText(query.trim());
    const cats = activeCategories;

    return procedures.filter((p) => {
      // 1) Filtr kategorii (OR po wybranych)
      if (cats.size > 0 && !p.categories.some((c) => cats.has(c))) {
        return false;
      }
      // 2) Wyszukiwanie tekstowe — pusty query przechodzi
      if (!q) return true;
      const haystack = foldText(
        [p.title, p.description, ...(p.keywords ?? []), ...p.categories].join(
          " "
        )
      );
      return haystack.includes(q);
    });
  }, [procedures, query, activeCategories]);

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const resetAll = () => {
    setQuery("");
    setActiveCategories(new Set());
  };

  const hasActiveFilter = query.trim().length > 0 || activeCategories.size > 0;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4 text-center">
            {heading}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Search + filters bar */}
        <div className="max-w-4xl mx-auto mb-10 space-y-4">
          <div className="relative">
            <label htmlFor={inputId} className="sr-only">
              Szukaj zabiegu
            </label>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id={inputId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border border-border/60 bg-card/50 backdrop-blur-sm pl-11 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:bg-card/80 transition-colors"
              aria-describedby={`${inputId}-status`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {allCategories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {allCategories.map((cat) => {
                const active = activeCategories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={active}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card/40 text-foreground/70 border-border/60 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Wyczyść
                </button>
              )}
            </div>
          )}

          <p
            id={`${inputId}-status`}
            className="text-center text-xs text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {filtered.length === procedures.length
              ? `Wszystkie ${procedures.length} zabiegi`
              : `Znaleziono ${filtered.length} z ${procedures.length} zabiegów`}
          </p>
        </div>

        {/* Grid wyników */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filtered.map((proc, i) => {
                const Icon = proc.icon;
                return (
                  <motion.div
                    key={proc.href}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{
                      duration: 0.4,
                      delay: Math.min(i * 0.04, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Link
                      to={proc.href}
                      className="group block h-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        {proc.tag && (
                          <span className="text-[10px] uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                            {proc.tag}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                        {proc.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {proc.description}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Dowiedz się więcej <ArrowRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center py-12 rounded-2xl border border-dashed border-border/60 bg-card/20">
            <Search className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">
              Brak wyników dla „{query || "wybranych filtrów"}"
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Spróbuj innego słowa kluczowego lub zresetuj filtry.
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <X className="w-3.5 h-3.5" /> Wyczyść filtry
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
