import { motion } from "framer-motion";
import veinAnatomy from "@/assets/pajaczki-anatomia-warstwy.webp";

interface Props {
  /** Optional title above the image. Defaults to a sensible Polish phrase. */
  title?: string;
  /** Optional subtitle / caption shown under the title. */
  subtitle?: string;
  /** Pass-through framer-motion props (entrance animation). */
  fadeUp?: Record<string, unknown>;
  /** Optional extra Tailwind classes for the outer section. */
  className?: string;
}

/**
 * Schemat anatomiczny przekroju skóry: epidermis / dermis / hypodermis
 * z pajączkiem żylnym (wenulektazja), żyłą zasilającą i żyłą głęboką.
 *
 * Reużywalny komponent — używany na podstronach o pajączkach naczyniowych,
 * skleroterapii i CLaCS, aby spójnie tłumaczyć skąd biorą się pajączki
 * i co dokładnie zamykamy podczas zabiegu.
 */
const VeinAnatomyImage = ({
  title = "Anatomia pajączka — co dokładnie zamykamy?",
  subtitle = "Pajączek (wenulektazja) leży w skórze właściwej, ale zasilany jest przez głębszą żyłę odżywczą. Skuteczne leczenie celuje w oba poziomy.",
  fadeUp,
  className = "",
}: Props) => {
  const motionProps = fadeUp ?? {};

  return (
    <motion.section {...motionProps} className={`max-w-4xl mx-auto ${className}`.trim()}>
      <h2 className="section-title mb-3 text-center">{title}</h2>
      {subtitle && (
        <p className="section-subtitle mb-8 text-center max-w-3xl mx-auto">{subtitle}</p>
      )}
      <figure className="glass-card rounded-2xl p-4 md:p-6">
        <img
          src={veinAnatomy}
          alt="Schemat anatomiczny pajączka żylnego — przekrój skóry pokazujący naskórek (epidermis), skórę właściwą (dermis) z pajączkiem (wenulektazja) i żyłą zasilającą oraz tkankę podskórną (hypodermis) z żyłą głęboką"
          loading="lazy"
          decoding="async"
          className="w-full h-auto rounded-xl bg-background/40"
        />
        <figcaption className="text-xs text-muted-foreground/80 mt-3 text-center leading-relaxed">
          Naskórek · Skóra właściwa (pajączek + żyła zasilająca) · Tkanka podskórna (żyła głęboka)
        </figcaption>
      </figure>
    </motion.section>
  );
};

export default VeinAnatomyImage;
