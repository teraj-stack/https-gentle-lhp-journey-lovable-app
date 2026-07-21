import { motion } from "framer-motion";
import { Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import ebookCoverLhp from "@/assets/ebook-cover-powrot.webp";

const EbookBanner = () => {
  const isMobile = useIsMobile();

  return (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="glass-card rounded-2xl p-8 md:p-10"
  >
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="w-36 md:w-44 shrink-0" style={{ perspective: "800px" }}>
        {isMobile ? (
          <img
            src={ebookCoverLhp}
            alt="Okładka e-booka — Powrót do Komfortu"
            className="w-full rounded-xl shadow-xl ring-1 ring-primary/20"
            loading="lazy"
            width={640}
            height={896}
          />
        ) : (
          <motion.img
            src={ebookCoverLhp}
            alt="Okładka e-booka — Powrót do Komfortu"
            className="w-full rounded-xl shadow-xl ring-1 ring-primary/20 cursor-pointer"
            style={{ transformOrigin: "left center" }}
            whileHover={{ rotateY: -15, scale: 1.05, boxShadow: "12px 12px 30px rgba(0,0,0,0.25)" }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            loading="lazy"
            width={640}
            height={896}
          />
        )}
      </div>
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-xl font-bold text-foreground mb-2">
          📖 Pobierz darmowy e-book: „Powrót do Komfortu"
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
          Kompleksowy przewodnik Dr. Jana Bujoka — 13 stron o mechanizmie hemoroidów, porównanie lasera vs. skalpela, 
          opis zabiegu krok po kroku i plan rekonwalescencji. Przeczytaj w domu, w spokoju i bez pośpiechu.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
          <Button variant="hero" size="lg" asChild>
            <a href="/ebooks/Powrot-do-Komfortu-Przewodnik.pdf" download>
              <Download className="w-4 h-4 mr-2" />
              Pobierz Przewodnik (PDF)
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/dla-pacjenta/hemoroidy-infografika">
              <ChevronRight className="w-4 h-4 mr-2" />
              Infografika A–Z
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </motion.section>
  );
};

export default EbookBanner;
