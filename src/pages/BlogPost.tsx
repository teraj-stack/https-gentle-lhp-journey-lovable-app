import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowLeft } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";

/** Simple markdown-like renderer for headings, bold, lists, paragraphs */
const renderContent = (content: string) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-6 space-y-1 text-muted-foreground mb-6">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (text: string) =>
    text.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-xl font-semibold font-serif text-foreground mt-8 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
    } else if (line.match(/^\d+\.\s/)) {
      flushList();
      listItems.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p
          key={i}
          className="text-muted-foreground leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  }
  flushList();
  return elements;
};

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

  return (
    <>
      <SeoHead
        title={`${post.title} – Blog CML`}
        description={post.excerpt || post.title}
        canonicalUrl={`https://cml.pl/blog/${post.slug}`}
      />

      <article className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć do bloga
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">
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

          <div className="prose-custom">{renderContent(post.content)}</div>
        </div>
      </article>
    </>
  );
};

export default BlogPost;
