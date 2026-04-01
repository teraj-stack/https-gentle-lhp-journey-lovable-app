import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const RecoveryBoostBanner = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="mt-8 glass-card rounded-2xl p-5 md:p-6 border border-primary/15 bg-primary/5"
  >
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold text-foreground text-base mb-1">
          Przyspiesz gojenie — fotobiomodulacja i pole magnetyczne
        </h4>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Po każdym zabiegu oferujemy możliwość skrócenia okresu rekonwalescencji dzięki urządzeniom wykorzystującym{" "}
          <strong className="text-foreground">fotobiomodulację (PBM)</strong> oraz{" "}
          <strong className="text-foreground">pole magnetyczne</strong>. Terapie te stymulują procesy naprawcze tkanek, redukują obrzęk i zmniejszają dolegliwości bólowe — co przekłada się na szybszy powrót do codziennej aktywności.
        </p>
        <Link
          to="/leczenie/fototerapia"
          className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-2 hover:underline"
        >
          Dowiedz się więcej o fototerapii →
        </Link>
      </div>
    </div>
  </motion.div>
);

export default RecoveryBoostBanner;
