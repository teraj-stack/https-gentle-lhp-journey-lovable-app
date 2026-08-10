import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight, Sparkles, X } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NewBadge, { isNew } from "@/components/blog/NewBadge";
import CategoryBadge from "@/components/blog/CategoryBadge";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  detectCategory,
  type BlogCategory,
} from "@/lib/blogCategories";

type FilterValue = "all" | "new";

const FILTERABLE_CATEGORIES: BlogCategory[] = CATEGORY_ORDER.filter(
  (c) => c !== "inne",
);

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter: FilterValue = searchParams.get("filter") === "new" ? "new" : "all";
  const categoryParam = searchParams.get("category");
  const activeCategory: BlogCategory | null =
    categoryParam && (FILTERABLE_CATEGORIES as string[]).includes(categoryParam)
      ? (categoryParam as BlogCategory)
      : null;

  const setFilter = (next: FilterValue) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    setSearchParams(params, { replace: true });
  };

  const setCategory = (next: BlogCategory | null) => {
    const params = new URLSearchParams(searchParams);
    if (!next) params.delete("category");
    else params.set("category", next);
    setSearchParams(params, { replace: true });
  };

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /** Wpisy z dopisaną kategorią — liczone raz. */
  const postsWithCategory = useMemo(
    () => (posts ?? []).map((p) => ({ ...p, category: detectCategory(p) })),
    [posts],
  );

  const newCount = useMemo(
    () => postsWithCategory.filter((p) => isNew(p.published_at)).length,
    [postsWithCategory],
  );

  /** Liczba wpisów per kategoria — do wyświetlenia w chipach. */
  const categoryCounts = useMemo(() => {
    const counts: Record<BlogCategory, number> = {
      flebologia: 0,
      proktologia: 0,
      ginekomastia: 0,
      inne: 0,
    };
    for (const p of postsWithCategory) counts[p.category]++;
    return counts;
  }, [postsWithCategory]);

  const filteredPosts = useMemo(() => {
    let result = postsWithCategory;
    if (filter === "new") result = result.filter((p) => isNew(p.published_at));
    if (activeCategory) result = result.filter((p) => p.category === activeCategory);
    return result;
  }, [postsWithCategory, filter, activeCategory]);

  return (
    <>
      <SeoHead
        title="Blog CML | Proktologia i flebologia bez tabu | Warszawa"
        description="Artykuły o hemoroidach, żylakach i leczeniu laserowym pisane przez specjalistów CML. Rzetelna wiedza EBM, konkretne odpowiedzi i praktyczne poradniki."
        path="/blog"
      />

      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Breadcrumbs items={BREADCRUMBS_MAP["/blog"]} className="mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-foreground mb-4">
            Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Wiedza medyczna w przystępnej formie. Artykuły naszych specjalistów o proktologii, flebologii i leczeniu laserowym.
          </p>
          <div className="premium-divider !mx-0 mt-8" />

          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as FilterValue)}
            className="mt-8"
          >
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="all" className="gap-2">
                Wszystkie
                <span className="text-xs text-muted-foreground">({postsWithCategory.length})</span>
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2" disabled={newCount === 0}>
                <Sparkles className="w-3.5 h-3.5" />
                Nowe
                <span className="text-xs text-muted-foreground">({newCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtr kategorii — kumuluje się z zakładkami Wszystkie/Nowe */}
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtruj według kategorii"
          >
            <span className="text-xs text-muted-foreground mr-1">Kategoria:</span>
            {FILTERABLE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat];
              const isActive = activeCategory === cat;
              const isDisabled = count === 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(isActive ? null : cat)}
                  disabled={isDisabled}
                  aria-pressed={isActive}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className="gap-1.5 cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {CATEGORY_LABELS[cat]}
                    <span className="text-[10px] opacity-70">({count})</span>
                  </Badge>
                </button>
              );
            })}
            {activeCategory && (
              <button
                type="button"
                onClick={() => setCategory(null)}
                className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label="Wyczyść filtr kategorii"
              >
                <X className="w-3 h-3" /> Wyczyść
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredPosts && filteredPosts.length > 0 ? (
            <div className="space-y-10">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="group border-b border-border pb-10 last:border-0"
                >
                  <Link to={`/blog/${post.slug}`} className="block md:flex md:gap-6">
                    <div className="mb-4 md:mb-0 md:flex-shrink-0 md:w-48 lg:w-56">
                      {post.cover_image_url ? (
                        <div className="relative w-full h-40 md:h-32 lg:h-36 rounded-lg overflow-hidden bg-background">
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* Subtelny ciemny gradient harmonizujący z dark theme */}
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/25 to-background/10 mix-blend-multiply pointer-events-none"
                            aria-hidden="true"
                          />
                          <div
                            className="absolute inset-0 rounded-lg ring-1 ring-inset ring-border/40 pointer-events-none"
                            aria-hidden="true"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-40 md:h-32 lg:h-36 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <span className="text-3xl opacity-60">📝</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CategoryBadge
                          category={post.category}
                          linkToFilter
                          stopPropagation
                        />
                        {isNew(post.published_at) && <NewBadge />}
                      </div>
                      <h2 className="text-xl md:text-2xl font-semibold font-serif text-foreground group-hover:text-primary transition-colors mb-2">
                        {post.title}
                      </h2>
                      {post.published_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          <time dateTime={post.published_at}>
                            {new Date(post.published_at).toLocaleDateString("pl-PL", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                      )}
                      {post.excerpt && (
                        <p className="text-muted-foreground leading-relaxed mb-3">
                          {post.excerpt}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        Czytaj więcej <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              {activeCategory && filter === "new"
                ? `Brak nowych artykułów w kategorii „${CATEGORY_LABELS[activeCategory]}”.`
                : activeCategory
                  ? `Brak artykułów w kategorii „${CATEGORY_LABELS[activeCategory]}”.`
                  : filter === "new"
                    ? "Brak nowych artykułów z ostatnich 7 dni."
                    : "Brak opublikowanych artykułów. Wróć wkrótce!"}
            </p>
          )}
        </div>
      </section>
    </>
  );
};

export default Blog;
