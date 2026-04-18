import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type BlogCategory } from "@/lib/blogCategories";

interface CategoryBadgeProps {
  category: BlogCategory;
  /** If true, renders as a link to /blog?category=... */
  linkToFilter?: boolean;
  /** Stop click propagation (useful inside an outer <Link>). */
  stopPropagation?: boolean;
  className?: string;
}

/**
 * Visual category marker for blog posts (Flebologia / Proktologia / Ginekomastia).
 * Hidden for category "inne" — uncategorised posts get no badge.
 *
 * When `linkToFilter` is true, renders as a <Link> that filters the blog list.
 * Use `stopPropagation` when nested inside another link (e.g. blog post card).
 */
const CategoryBadge = ({
  category,
  linkToFilter = false,
  stopPropagation = false,
  className,
}: CategoryBadgeProps) => {
  if (category === "inne") return null;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors shrink-0",
        className,
      )}
    >
      {CATEGORY_LABELS[category]}
    </Badge>
  );

  if (!linkToFilter) return badge;

  return (
    <Link
      to={`/blog?category=${category}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      aria-label={`Filtruj wpisy w kategorii ${CATEGORY_LABELS[category]}`}
      className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
    >
      {badge}
    </Link>
  );
};

export default CategoryBadge;
