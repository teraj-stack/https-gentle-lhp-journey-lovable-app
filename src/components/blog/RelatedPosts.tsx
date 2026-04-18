import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  detectCategory,
  CATEGORY_LABELS,
  type BlogCategory,
} from "@/lib/blogCategories";
import CategoryBadge from "./CategoryBadge";
import NewBadge, { isNew } from "./NewBadge";

interface RelatedPostsProps {
  /** Slug of the current post — excluded from results. */
  currentSlug: string;
  /** Category of the current post — used to find siblings. */
  category: BlogCategory;
}

const MAX = 3;

/**
 * Renders up to 3 most recent published posts from the same category,
 * excluding the current post. Hidden if no siblings exist.
 *
 * Strategy: fetch a slightly larger pool (50 latest published) and filter
 * client-side using `detectCategory`. Avoids needing a `category` column.
 */
const RelatedPosts = ({ currentSlug, category }: RelatedPostsProps) => {
  const { data: related } = useQuery({
    queryKey: ["related-posts", category, currentSlug],
    enabled: category !== "inne",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? [])
        .filter((p) => p.slug !== currentSlug && detectCategory(p) === category)
        .slice(0, MAX);
    },
  });

  if (category === "inne" || !related || related.length === 0) return null;

  return (
    <aside
      className="mt-16 pt-12 border-t border-border"
      aria-labelledby="related-posts-heading"
    >
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2
          id="related-posts-heading"
          className="text-2xl md:text-3xl font-bold font-serif text-foreground"
        >
          Powiązane wpisy
        </h2>
        <Link
          to={`/blog?category=${category}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
        >
          Wszystkie z kategorii „{CATEGORY_LABELS[category]}"
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <article key={post.id} className="group">
            <Link to={`/blog/${post.slug}`} className="block h-full">
              {post.cover_image_url ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-background mb-3">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
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
                <div className="w-full h-36 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
                  <span className="text-3xl opacity-60">📝</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CategoryBadge category={category} />
                {isNew(post.published_at) && <NewBadge />}
              </div>
              <h3 className="text-base md:text-lg font-semibold font-serif text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                {post.title}
              </h3>
              {post.published_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
};

export default RelatedPosts;
