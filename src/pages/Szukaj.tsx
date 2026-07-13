import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import SeoHead from "@/components/shared/SeoHead";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

interface BlogHit {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

/**
 * Prosta strona wyszukiwania — realny cel dla `SearchAction`
 * w globalnym schemacie WebSite. Przeszukuje opublikowane wpisy blogowe
 * po `title` / `excerpt` (ILIKE %q%), maks. 30 wyników.
 */
const Szukaj = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [hits, setHits] = useState<BlogHit[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setInput(q), [q]);

  // Internal search results — noindex,follow (Google best practice).
  useEffect(() => {
    const el = document.createElement("meta");
    el.setAttribute("name", "robots");
    el.setAttribute("content", "noindex,follow");
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = q.trim();
    if (!query) {
      setHits(null);
      return;
    }
    setLoading(true);
    (async () => {
      const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, published_at")
        .not("published_at", "is", null)
        .or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`)
        .order("published_at", { ascending: false })
        .limit(30);
      if (!cancelled) {
        setHits(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = input.trim();
    if (next) setParams({ q: next }, { replace: true });
    else setParams({}, { replace: true });
  };

  const title = useMemo(
    () => (q ? `Wyniki wyszukiwania: „${q}” | CML` : "Wyszukiwarka | CML"),
    [q],
  );

  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title={title}
        description="Wyszukaj artykuły, poradniki i informacje o zabiegach w CML Warszawa Wilanów."
        path={q ? `/szukaj?q=${encodeURIComponent(q)}` : "/szukaj"}
      />
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Breadcrumbs
            items={[
              { label: "Strona główna", href: "/" },
              { label: "Wyszukiwarka" },
            ]}
            className="mb-8"
          />
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-4xl md:text-5xl text-foreground mb-4"
          >
            Wyszukiwarka
          </motion.h1>
          <p className="text-muted-foreground mb-8">
            Przeszukujemy artykuły blogowe i poradniki.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2 mb-10">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="np. hemoroidy, żylaki, LHP…"
                className="pl-10"
                autoFocus
                aria-label="Wyszukaj w witrynie"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              Szukaj
            </button>
          </form>

          {loading && (
            <p className="text-muted-foreground">Wyszukiwanie…</p>
          )}

          {!loading && q && hits && hits.length === 0 && (
            <p className="text-muted-foreground">
              Brak wyników dla „{q}”. Spróbuj innej frazy lub przejdź do{" "}
              <Link to="/blog" className="underline text-primary">
                bloga
              </Link>
              .
            </p>
          )}

          {!loading && hits && hits.length > 0 && (
            <ul className="space-y-6">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    to={`/blog/${hit.slug}`}
                    className="group block rounded-lg border border-border p-5 hover:border-primary/50 transition"
                  >
                    <h2 className="font-serif text-2xl text-foreground group-hover:text-primary transition mb-2">
                      {hit.title}
                    </h2>
                    {hit.excerpt && (
                      <p className="text-muted-foreground line-clamp-2 mb-3">
                        {hit.excerpt}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm text-primary">
                      Czytaj artykuł
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!q && (
            <p className="text-muted-foreground">
              Wpisz frazę powyżej lub wróć do{" "}
              <Link to="/blog" className="underline text-primary">
                bloga
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Szukaj;
