import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import fototerapiaPbmImg from "@/assets/fototerapia-pbm-mechanism.webp";

const RecoveryBoostBanner = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="mt-8 glass-card rounded-2xl p-5 md:p-6 border border-green-600 bg-secondary"
  >
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-600/10 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h4 className="font-semibold text-foreground text-base mb-1">
          Przyspiesz gojenie — fototerapia zgodna z EBM
        </h4>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Zgodnie z aktualnymi wytycznymi medycyny opartej na dowodach (EBM), po każdym zabiegu oferujemy możliwość skrócenia rekonwalescencji dzięki{" "}
          <strong className="text-foreground">fotobiomodulacji (PBM)</strong> oraz{" "}
          <strong className="text-foreground">terapii polem magnetycznym</strong>. Badania kliniczne potwierdzają, że terapie te stymulują procesy naprawcze tkanek, redukują obrzęk i zmniejszają dolegliwości bólowe — co przekłada się na szybszy powrót do codziennej aktywności.
        </p>
        <Link
          to="/leczenie/fototerapia"
          className="inline-flex items-center gap-1 text-green-600 text-sm font-medium mt-2 hover:underline"
        >
          Dowiedz się więcej o fototerapii →
        </Link>
      </div>
    </div>

    <figure className="mt-6">
      <img
        src={fototerapiaPbmImg}
        alt="Wpływ światła na regenerację komórkową — schemat fotobiomodulacji (PBM) pokazujący wzrost proliferacji, ATP i migracji komórek"
        width={1200}
        height={675}
        className="w-full max-w-2xl mx-auto rounded-2xl border border-border object-contain"
        loading="lazy"
        decoding="async"
      />
      <figcaption className="text-center text-sm text-muted-foreground mt-3">
        Wpływ światła na regenerację — fotobiomodulacja stymuluje proliferację, produkcję ATP i migrację komórek
      </figcaption>
    </figure>
  </motion.div>
);

export default RecoveryBoostBanner;
