import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const testimonials = [
  {
    name: "Katarzyna",
    text: "Po latach ukrywania nóg w końcu mogę nosić sukienki bez skrępowania. Zabieg był bezbolesny, a efekty widoczne już po kilku tygodniach.",
    rating: 5,
    date: "Marzec 2026",
  },
  {
    name: "Joanna",
    text: "Doktor dokładnie wyjaśnił, dlaczego kremy nie pomagały i co tak naprawdę dzieje się z moimi żyłami. Poczułam się zaopiekowana od pierwszej wizyty.",
    rating: 5,
    date: "Luty 2026",
  },
  {
    name: "Magdalena",
    text: "Bałam się, że zabieg będzie bolesny, ale metoda CLaCS okazała się naprawdę komfortowa. Teraz pakuję walizkę na urlop bez stresu!",
    rating: 5,
    date: "Styczeń 2026",
  },
  {
    name: "Anna",
    text: "Miałam pajączki od pierwszej ciąży. Myślałam, że to już na zawsze. Po dwóch sesjach CLaCS nogi wyglądają jak przed laty — żałuję tylko, że nie przyszłam wcześniej.",
    rating: 5,
    date: "Grudzień 2025",
  },
  {
    name: "Ewa",
    text: "Najbardziej doceniam szczerość doktora — powiedział wprost, czego się spodziewać i ile sesji będzie potrzebnych. Żadnych nierealistycznych obietnic, a efekty mówią same za siebie.",
    rating: 5,
    date: "Listopad 2025",
  },
  {
    name: "Monika",
    text: "Koleżanka poleciła mi tę klinikę po własnym zabiegu. Atmosfera jest spokojna, a cały zespół naprawdę dba o komfort. Moje nogi w końcu wyglądają tak, jak chciałam.",
    rating: 5,
    date: "Październik 2025",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const TestimonialCard = ({ t }: { t: (typeof testimonials)[number] }) => (
  <div className="glass-card rounded-2xl p-7 relative group flex flex-col h-full">
    <Quote className="absolute top-5 right-5 w-7 h-7 text-primary/15 group-hover:text-primary/25 transition-colors duration-500" />

    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: t.rating }).map((_, j) => (
        <Star key={j} className="w-4 h-4 fill-primary text-primary" />
      ))}
    </div>

    <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic flex-1">
      „{t.text}"
    </p>

    <div className="flex items-center gap-3 mt-auto">
      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
        <span className="text-sm font-semibold text-primary">
          {t.name.charAt(0)}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{t.name}</p>
        <p className="text-xs text-muted-foreground">
          Leczenie naczynek · {t.date}
        </p>
      </div>
    </div>
  </div>
);

const PajaczkiTestimonials = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    breakpoints: {
      "(min-width: 768px)": { slidesToScroll: 2 },
    },
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <motion.section {...fadeUp}>
      <h2 className="section-title mb-3 text-center">
        Głos pacjentek, które odzyskały beztroskę
      </h2>
      <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
        Autentyczne opinie z portalu ZnanyLekarz.pl
      </p>

      <div className="relative">
        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -ml-4">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-4 min-w-0"
              >
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          className="absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm flex items-center justify-center text-foreground/70 hover:text-foreground transition-all disabled:opacity-0 disabled:pointer-events-none z-10"
          aria-label="Poprzednia opinia"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm flex items-center justify-center text-foreground/70 hover:text-foreground transition-all disabled:opacity-0 disabled:pointer-events-none z-10"
          aria-label="Następna opinia"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {scrollSnaps.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? "bg-primary w-6"
                : "bg-primary/25 hover:bg-primary/40"
            }`}
            aria-label={`Przejdź do opinii ${i + 1}`}
          />
        ))}
      </div>

      <div className="text-center mt-8">
        <a
          href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          Zobacz wszystkie opinie na ZnanyLekarz.pl →
        </a>
      </div>
    </motion.section>
  );
};

export default PajaczkiTestimonials;
