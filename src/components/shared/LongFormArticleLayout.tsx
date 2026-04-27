import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { List, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface TocItem {
  id: string;
  label: string;
  level?: 2 | 3;
}

interface Props {
  toc: TocItem[];
  /** Slot for hero/intro placed above the article body (full width on desktop). */
  hero?: React.ReactNode;
  /** Article body — use semantic sections with matching ids. */
  children: React.ReactNode;
  /** Optional aside content shown under TOC on desktop (e.g. CTA card). */
  asideExtra?: React.ReactNode;
}

/**
 * Reusable layout for long-form medical articles.
 *
 * Desktop (>= lg):
 *   ┌─────────────────────────────────────────────────────┐
 *   │                       HERO                          │
 *   ├──────────────┬──────────────────────────────────────┤
 *   │  STICKY TOC  │            ARTICLE BODY              │
 *   │  (left col)  │                                      │
 *   └──────────────┴──────────────────────────────────────┘
 *
 * Mobile/tablet: hero + body stacked, TOC available via floating button → Sheet.
 */
const LongFormArticleLayout = ({ toc, hero, children, asideExtra }: Props) => {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");

  // Scroll-spy: highlight TOC entry whose section is currently in view.
  useEffect(() => {
    if (typeof window === "undefined" || toc.length === 0) return;
    const sections = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that's currently intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        // Account for sticky header (--header-height) and offer a comfortable read zone.
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [toc]);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerVar =
      getComputedStyle(document.documentElement).getPropertyValue("--header-height") || "80px";
    const headerOffset = parseInt(headerVar, 10) || 80;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const renderTocList = (onItemClick?: () => void) => (
    <ol className="space-y-1 text-sm">
      {toc.map((item) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                scrollToId(item.id);
                onItemClick?.();
              }}
              className={`group w-full text-left px-3 py-2 rounded-md border-l-2 transition-colors ${
                item.level === 3 ? "pl-6 text-xs" : "text-sm"
              } ${
                isActive
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30"
              }`}
            >
              <span className="leading-snug block">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      {/* HERO */}
      {hero && (
        <section className="pt-32 pb-10 md:pt-40 md:pb-14 px-4 md:px-8 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"
            aria-hidden="true"
          />
          <div className="max-w-5xl mx-auto relative">{hero}</div>
        </section>
      )}

      {/* BODY + TOC */}
      <section className="pb-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10">
          {/* Desktop sticky TOC */}
          <aside className="hidden lg:block">
            <div
              className="sticky top-[calc(var(--header-height,80px)+24px)] max-h-[calc(100vh-var(--header-height,80px)-48px)] overflow-y-auto pr-2"
              aria-label="Spis treści artykułu"
            >
              <p className="text-xs font-sans uppercase tracking-[0.18em] text-primary mb-4 px-3">
                Spis treści
              </p>
              <nav>{renderTocList()}</nav>
              {asideExtra && <div className="mt-8">{asideExtra}</div>}
            </div>
          </aside>

          {/* Mobile floating TOC trigger */}
          <div className="lg:hidden fixed bottom-6 right-4 z-40">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-3 text-sm font-medium hover:bg-primary/90 transition"
                  aria-label="Otwórz spis treści"
                >
                  <List className="w-4 h-4" />
                  <span>Spis treści</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    Spis treści
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-4">{renderTocList(() => {})}</nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Article body */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            {children}
          </motion.article>
        </div>
      </section>
    </>
  );
};

export default LongFormArticleLayout;
