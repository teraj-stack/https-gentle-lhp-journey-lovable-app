import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowLeft } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import NewBadge, { isNew } from "@/components/blog/NewBadge";
import CategoryBadge from "@/components/blog/CategoryBadge";
import RelatedPosts from "@/components/blog/RelatedPosts";
import { detectCategory } from "@/lib/blogCategories";
import RiskFactorsAccordion from "@/components/blog/RiskFactorsAccordion";

const RISK_MARKER = "<!-- RISK_FACTORS_ACCORDION -->";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="pt-32 pb-24 max-w-3xl mx-auto px-4 md:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-full mt-8" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-32 pb-24 max-w-3xl mx-auto px-4 md:px-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Nie znaleziono artykułu</h1>

        <Link to="/blog" className="text-primary hover:underline">
          ← Wróć do bloga
        </Link>
      </div>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.title,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    image: post.cover_image_url || "https://mcml.pro/og-image.png",
    author: {
      "@type": "Person",
      name: "lek. med. Jan Bujok",
    },
    publisher: {
      "@type": "MedicalOrganization",
      "@id": "https://mcml.pro/#clinic",
      name: "CML – Centrum Medycyny Laserowej",
      logo: {
        "@type": "ImageObject",
        url: "https://mcml.pro/og-image.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://mcml.pro/blog/${post.slug}`,
    },
  };

  return (
    <>
      <SeoHead
        title={post.title}
        description={post.excerpt || post.title}
        path={`/blog/${post.slug}`}
        image={post.cover_image_url || undefined}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />


      <article className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <Breadcrumbs
            items={[
              { label: "Blog", href: "/blog" },
              { label: post.title },
            ]}
            className="mb-6"
          />

          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć do bloga
          </Link>

          {post.cover_image_url && (
            <figure className="mb-8 -mx-4 md:mx-0 overflow-hidden md:rounded-lg border-y md:border border-border/50 bg-background">
              <div className="relative w-full max-h-[480px]">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  width={1200}
                  height={630}
                  className="w-full h-auto max-h-[480px] object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
                {/* Subtelny ciemny gradient harmonizujący z dark theme — spójny z listą /blog */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/25 to-background/10 mix-blend-multiply pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </figure>
          )}

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <CategoryBadge category={detectCategory(post)} linkToFilter />
            {isNew(post.published_at) && <NewBadge />}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground whitespace-pre-line mb-4">
            {post.title}
          </h1>

          {post.published_at && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString("pl-PL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          )}

          <div className="premium-divider !mx-0 mb-8" />

          {post.content.includes(RISK_MARKER) ? (
            (() => {
              const [before, after] = post.content.split(RISK_MARKER);
              return (
                <>
                  <MarkdownRenderer content={before} className="prose-custom" />
                  <RiskFactorsAccordion />
                  <MarkdownRenderer content={after} className="prose-custom" />
                </>
              );
            })()
          ) : (
            <MarkdownRenderer content={post.content} className="prose-custom" />
          )}

          <RelatedPosts currentSlug={post.slug} category={detectCategory(post)} />
        </div>
      </article>
    </>
  );
};

export default BlogPost;
