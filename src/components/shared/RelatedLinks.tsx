import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getInternalLinks, type InternalLinkGroup } from "@/lib/internalLinks";

interface RelatedLinksProps {
  /** Ścieżka bieżącej strony — klucz w mapie INTERNAL_LINKS */
  path?: string;
  /** Alternatywnie: gotowa grupa linków (np. dla bloga) */
  group?: InternalLinkGroup;
  className?: string;
}

/**
 * Sekcja linkowania wewnętrznego z anchor textem zawierającym frazy kluczowe.
 * Renderuje się tylko wtedy, gdy dla ścieżki zdefiniowano linki.
 */
const RelatedLinks = ({ path, group, className = "" }: RelatedLinksProps) => {
  const data = group ?? (path ? getInternalLinks(path) : undefined);
  const links = data?.links.filter((link) => link.href !== path);

  if (!data || !links?.length) return null;

  return (
    <motion.nav
      aria-label={data.heading}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={`max-w-4xl mx-auto my-12 px-4 ${className}`}
    >
      <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-5">
        {data.heading}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="group glass-card flex h-full items-start gap-3 rounded-xl p-4 transition-colors hover:border-primary/50"
            >
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              <span>
                <span className="block font-medium text-foreground first-letter:uppercase">
                  {link.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {link.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
};

export default RelatedLinks;
