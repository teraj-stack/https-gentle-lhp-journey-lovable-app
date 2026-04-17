import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const isNew = (publishedAt: string | null) =>
  !!publishedAt && Date.now() - new Date(publishedAt).getTime() <= SEVEN_DAYS_MS;

type FilterValue = "all" | "new";

const Blog = () => {
  const [filter, setFilter] = useState<FilterValue>("all");

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

  const newCount = useMemo(
    () => (posts ?? []).filter((p) => isNew(p.published_at)).length,
    [posts],
  );

  const filteredPosts = useMemo(() => {
    if (!posts) return posts;
    return filter === "new" ? posts.filter((p) => isNew(p.published_at)) : posts;
  }, [posts, filter]);

  return (
    <>
      <SeoHead
        title="Blog"
        description="Artykuły o proktologii, flebologii i nowoczesnych metodach leczenia laserowego. Wiedza prosto od specjalistów CML."
        path="/blog"
      />

      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Breadcrumbs items={[{ label: "Blog" }]} className="mb-6" />
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
                <span className="text-xs text-muted-foreground">({posts?.length ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2" disabled={newCount === 0}>
                <Sparkles className="w-3.5 h-3.5" />
                Nowe
                <span className="text-xs text-muted-foreground">({newCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
                      <div className="flex items-start gap-2 mb-2 flex-wrap">
                        <h2 className="text-xl md:text-2xl font-semibold font-serif text-foreground group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                        {isNew(post.published_at) && (
                          <Badge className="bg-primary text-primary-foreground gap-1 mt-1 shrink-0">
                            <Sparkles className="w-3 h-3" />
                            Nowy
                          </Badge>
                        )}
                      </div>
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
              Brak opublikowanych artykułów. Wróć wkrótce!
            </p>
          )}
        </div>
      </section>
    </>
  );
};

export default Blog;
