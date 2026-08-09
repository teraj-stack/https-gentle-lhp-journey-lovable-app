import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HOME_KEYWORD_LINKS } from "@/lib/internalLinks";

/**
 * Blok linkowania wewnętrznego na stronie głównej — anchor text z frazami
 * kluczowymi prowadzący bezpośrednio do stron zabiegowych.
 */
const HomeKeywordLinks = () => (
  <motion.section
    aria-labelledby="home-keyword-links-heading"
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.5 }}
    className="px-4 py-12 md:py-16"
  >
    <div className="max-w-5xl mx-auto">
      <h2
        id="home-keyword-links-heading"
        className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2"
      >
        Najczęściej wybierane zabiegi
      </h2>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Przejdź od razu do opisu zabiegu — znajdziesz tam przebieg krok po kroku,
        rekonwalescencję, przeciwwskazania i cenę.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_KEYWORD_LINKS.map((link) => (
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
    </div>
  </motion.section>
);

export default HomeKeywordLinks;
