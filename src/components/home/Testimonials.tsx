import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, ShieldCheck } from "lucide-react";
import {
  testimonials,
  CLINIC_AGGREGATE_RATING,
  TESTIMONIALS_SOURCE_URL,
} from "@/content/testimonials";
import ReviewSchema from "@/components/shared/ReviewSchema";

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const INITIAL_COUNT = 6;

const Testimonials = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? testimonials : testimonials.slice(0, INITIAL_COUNT);

  return (
    <section className="py-20 md:py-28 bg-card/50">
      <ReviewSchema />
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center mb-14"
        >
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
            Opinie pacjentów
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Co mówią nasi pacjenci
          </h2>
          <div className="premium-divider mb-8" />

          {/* ZnanyLekarz rating widget */}
          <a
            href={TESTIMONIALS_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-wrap items-center justify-center gap-3 bg-card border border-border rounded-full px-6 py-3 hover:border-primary/40 transition-colors group"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-2xl font-bold text-foreground">
              {CLINIC_AGGREGATE_RATING.ratingValue.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/5</span>
            <div className="w-px h-5 bg-border" />
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">
                {CLINIC_AGGREGATE_RATING.reviewCount}
              </strong>{" "}
              opinii
            </span>
            <div className="w-px h-5 bg-border" />
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
              ZnanyLekarz.pl →
            </span>
          </a>

          <p className="mt-5 text-xs text-muted-foreground inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
            Wszystkie opinie pochodzą od zweryfikowanych pacjentów z profilu
            ZnanyLekarz.pl. Nazwiska skrócone do inicjału ze względu na prywatność.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((t, i) => (
            <motion.div
              key={`${t.name}-${t.dateISO}`}
              initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.6,
                delay: (i % INITIAL_COUNT) * 0.08,
                ease: [0.16, 1, 0.3, 1] as const,
              }}
              className="glass-card rounded-2xl p-7 md:p-8 relative group flex flex-col"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/15 group-hover:text-primary/25 transition-colors duration-500" />

              <div
                className="flex gap-1 mb-4"
                aria-label={`Ocena ${t.rating} na 5`}
              >
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    aria-hidden="true"
                    className={
                      j < t.rating
                        ? "w-4 h-4 fill-primary text-primary"
                        : "w-4 h-4 text-muted-foreground/30"
                    }
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic flex-1">
                „{t.text}"
              </p>

              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <span className="text-sm font-semibold text-primary">
                    {t.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.procedure ? `${t.procedure} · ` : ""}
                    {t.date} · ZnanyLekarz.pl
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {testimonials.length > INITIAL_COUNT && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full border border-border text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors"
              aria-expanded={expanded}
            >
              {expanded
                ? "Pokaż mniej opinii"
                : `Pokaż wszystkie opinie (${testimonials.length})`}
            </button>
          </div>
        )}

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mt-6"
        >
          <a
            href={TESTIMONIALS_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Zobacz wszystkie opinie na ZnanyLekarz.pl →
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
