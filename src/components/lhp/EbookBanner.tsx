import { motion } from "framer-motion";
import { Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logoCmlEbook from "@/assets/logo-cml-ebook.png";

const EbookBanner = () => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="glass-card rounded-2xl p-8 md:p-10"
  >
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="w-36 md:w-44 shrink-0">
        <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/90 to-primary shadow-xl flex flex-col items-center justify-between p-5 text-primary-foreground">
          <div className="flex items-center justify-center pt-1 pb-2">
            <img src={logoCmlEbook} alt="CML – Centrum Medycyny Laserowej" className="w-4/5 h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-xs font-bold text-center leading-snug font-serif">
              Powrót do Komfortu
            </h3>
            <div className="w-8 h-px bg-primary-foreground/30 my-2" />
            <p className="text-[10px] text-center opacity-70 font-sans">Przewodnik PDF</p>
          </div>
        </div>
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
            <a href="/ebooks/Hemoroidy-od-A-do-Z-Infografika.pdf" download>
              <Download className="w-4 h-4 mr-2" />
              Infografika A–Z
            </a>
          </Button>
        </div>
      </div>
    </div>
  </motion.section>
);

export default EbookBanner;
