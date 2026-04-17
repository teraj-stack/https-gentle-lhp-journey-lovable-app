import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/badge";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const isNew = (publishedAt: string | null) =>
  !!publishedAt && Date.now() - new Date(publishedAt).getTime() <= SEVEN_DAYS_MS;

const Blog = () => {
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
          ) : posts && posts.length > 0 ? (
            <div className="space-y-10">
              {posts.map((post) => (
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
              Brak opublikowanych artykułów. Wróć wkrótce!
            </p>
          )}
        </div>
      </section>
    </>
  );
};

export default Blog;
