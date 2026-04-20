import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardCheck, HeartPulse, ArrowRight, Check } from "lucide-react";
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
  /** Wariant karty: "default" (tylko opis) lub "rich" (opis + preview-lista 3 punktów). Default: "default". */
  variant?: "default" | "rich";
  /** 3 kluczowe punkty z checklisty przygotowania — pokazywane gdy variant="rich" */
  preparationPreviewItems?: string[];
  /** 3 kluczowe punkty z checklisty zaleceń pozabiegowych — pokazywane gdy variant="rich" */
  recoveryPreviewItems?: string[];
}

const cardAnim = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const PreviewList = ({ items }: { items: string[] }) => (
  <ul className="relative space-y-2 pt-1">
    {items.map((item, idx) => (
      <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-snug">
        <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary" strokeWidth={3} />
        </span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const PreparationRecoveryCards = ({
  preparationDescription,
  preparationHref,
  recoveryDescription,
  recoveryHref,
  procedureLabel,
  variant = "default",
  preparationPreviewItems,
  recoveryPreviewItems,
}: PreparationRecoveryCardsProps) => {
  const isRich = variant === "rich";

  return (
    <motion.section {...cardAnim} id="przygotowanie-zalecenia" aria-labelledby="prep-recovery-heading" className="scroll-mt-24">
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
        <article className="group relative overflow-hidden glass-card rounded-2xl p-6 md:p-7 flex flex-col gap-4 border border-primary/20 hover:border-primary/50 hover:shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.45)] transition-all duration-500">
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top right, hsl(var(--primary) / 0.12) 0%, transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-primary tracking-wide">Przed zabiegiem</h3>
          </div>
          <p className="relative text-sm text-muted-foreground leading-relaxed">
            {preparationDescription}
          </p>
          {isRich && preparationPreviewItems && preparationPreviewItems.length > 0 && (
            <PreviewList items={preparationPreviewItems} />
          )}
          <Button asChild variant="outline" className="relative w-full mt-auto">
            <Link to={preparationHref}>
              Zobacz pełną checklistę
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </article>

        {/* Po zabiegu */}
        <article className="group relative overflow-hidden glass-card rounded-2xl p-6 md:p-7 flex flex-col gap-4 border border-primary/20 hover:border-primary/50 hover:shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.45)] transition-all duration-500">
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, hsl(var(--primary) / 0.12) 0%, transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
              <HeartPulse className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-primary tracking-wide">Po zabiegu</h3>
          </div>
          <p className="relative text-sm text-muted-foreground leading-relaxed">
            {recoveryDescription}
          </p>
          {isRich && recoveryPreviewItems && recoveryPreviewItems.length > 0 && (
            <PreviewList items={recoveryPreviewItems} />
          )}
          <Button asChild variant="outline" className="relative w-full mt-auto">
            <Link to={recoveryHref}>
              Zobacz pełną checklistę
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </article>
      </div>
    </motion.section>
  );
};

export default PreparationRecoveryCards;
