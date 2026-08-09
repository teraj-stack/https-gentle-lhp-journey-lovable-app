import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";


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
      ...(item.href ? { item: `https://mcml.pro${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <motion.nav
        aria-label="Breadcrumb"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap ${className}`}
      >
        {allItems.map((item, i) => {
          const isLast = i === allItems.length - 1;
          return (
            <motion.span
              key={i}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
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
            </motion.span>
          );
        })}
      </motion.nav>
    </>
  );
};

export default Breadcrumbs;
