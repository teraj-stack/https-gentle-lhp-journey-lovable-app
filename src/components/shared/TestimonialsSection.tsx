import { motion } from "framer-motion";
import { Star, Quote, ShieldCheck } from "lucide-react";
import {
  testimonials as allTestimonials,
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

/** Na stronach zabiegowych pokazujemy skrót — 6 najnowszych zweryfikowanych opinii */
const testimonials = allTestimonials.slice(0, 6);

const TestimonialsSection = () => (
  <section className="py-16 md:py-20">
    {/* AggregateRating jest już emitowany przez MedicalProcedureSchema */}
    <ReviewSchema items={testimonials} includeAggregate={false} />

    <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center mb-10">
      <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
        Opinie pacjentów
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
        Zaufali nam
      </h2>
      <a
        href={TESTIMONIALS_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-wrap items-center justify-center gap-2 bg-card border border-border rounded-full px-5 py-2 hover:border-primary/40 transition-colors group text-sm"
      >
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
          ))}
        </div>
        <span className="font-bold text-foreground">
          {CLINIC_AGGREGATE_RATING.ratingValue.toFixed(1)}
        </span>
        <span className="text-muted-foreground">/5</span>
        <div className="w-px h-4 bg-border" />
        <span className="text-muted-foreground">
          <strong className="text-foreground">
            {CLINIC_AGGREGATE_RATING.reviewCount}
          </strong>{" "}
          opinii
        </span>
        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
          →
        </span>
      </a>
      <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        Opinie zweryfikowanych pacjentów z profilu ZnanyLekarz.pl
      </p>
    </motion.div>

    <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto px-4">
      {testimonials.map((t, i) => (
        <motion.div
          key={`${t.name}-${t.dateISO}`}
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
          className="glass-card rounded-2xl p-6 relative group flex flex-col"
        >
          <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/10 group-hover:text-primary/20 transition-colors duration-500" />
          <div className="flex gap-0.5 mb-3" aria-label={`Ocena ${t.rating} na 5`}>
            {Array.from({ length: 5 }).map((_, j) => (
              <Star
                key={j}
                aria-hidden="true"
                className={
                  j < t.rating
                    ? "w-3.5 h-3.5 fill-primary text-primary"
                    : "w-3.5 h-3.5 text-muted-foreground/30"
                }
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic flex-1">
            „{t.text}"
          </p>
          <div className="flex items-center gap-3 mt-auto">
            <div
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="text-xs font-semibold text-primary">
                {t.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.procedure ? `${t.procedure} · ` : ""}
                {t.date}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }} className="text-center mt-8">
      <a
        href={TESTIMONIALS_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        Zobacz wszystkie opinie na ZnanyLekarz.pl →
      </a>
    </motion.div>
  </section>
);

export default TestimonialsSection;
