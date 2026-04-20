import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardCheck, HeartPulse, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreparationRecoveryCardsProps {
  /** Krótki opis (1-2 zdania) na karcie "Przed zabiegiem" */
  preparationDescription: string;
  /** URL do pełnej strony przygotowania */
  preparationHref: string;
  /** Krótki opis (1-2 zdania) na karcie "Po zabiegu" */
  recoveryDescription: string;
  /** URL do pełnej strony zaleceń pozabiegowych */
  recoveryHref: string;
  /** Opcjonalny nadtytuł (np. nazwa zabiegu) — wyświetlany pod h2 */
  procedureLabel?: string;
}

const cardAnim = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const PreparationRecoveryCards = ({
  preparationDescription,
  preparationHref,
  recoveryDescription,
  recoveryHref,
  procedureLabel,
}: PreparationRecoveryCardsProps) => {
  return (
    <motion.section {...cardAnim} aria-labelledby="prep-recovery-heading">
      <h2 id="prep-recovery-heading" className="section-title mb-3 text-center">
        Przygotowanie i zalecenia
      </h2>
      {procedureLabel ? (
        <p className="section-subtitle mb-8 text-center">{procedureLabel}</p>
      ) : (
        <p className="section-subtitle mb-8 text-center">
          Wszystko, co warto wiedzieć przed wizytą i po zabiegu — w dwóch checklistach.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Przed zabiegiem */}
        <article className="glass-card rounded-2xl p-6 md:p-7 flex flex-col gap-4 border border-primary/20 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Przed zabiegiem</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {preparationDescription}
          </p>
          <Button asChild variant="outline" className="w-full mt-auto group">
            <Link to={preparationHref}>
              Zobacz checklistę
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </article>

        {/* Po zabiegu */}
        <article className="glass-card rounded-2xl p-6 md:p-7 flex flex-col gap-4 border border-primary/20 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Po zabiegu</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {recoveryDescription}
          </p>
          <Button asChild variant="outline" className="w-full mt-auto group">
            <Link to={recoveryHref}>
              Zobacz checklistę
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </article>
      </div>
    </motion.section>
  );
};

export default PreparationRecoveryCards;
