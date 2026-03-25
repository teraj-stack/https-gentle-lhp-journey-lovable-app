import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";


export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs = ({ items, className = "" }: Props) => {
  const allItems: BreadcrumbItem[] = [{ label: "Strona główna", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://cml.pl${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap ${className}`}
      >
        {allItems.map((item, i) => {
          const isLast = i === allItems.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
              {isLast ? (
                <span className="text-foreground/70 font-medium">
                  {i === 0 && <Home className="w-3 h-3 inline mr-1 -mt-0.5" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href!}
                  className="hover:text-primary transition-colors"
                >
                  {i === 0 && <Home className="w-3 h-3 inline mr-1 -mt-0.5" />}
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
};

export default Breadcrumbs;
