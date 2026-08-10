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
    <motion.section
      {...motionProps}
      className={`max-w-4xl mx-auto px-1 sm:px-0 ${className}`.trim()}
    >
      <h2 className="section-title mb-2 sm:mb-3 text-center text-xl sm:text-2xl md:text-3xl px-2">
        {title}
      </h2>
      {subtitle && (
        <p className="section-subtitle mb-5 sm:mb-8 text-center max-w-3xl mx-auto text-sm sm:text-base px-2 leading-relaxed">
          {subtitle}
        </p>
      )}
      <figure className="glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 md:p-6">
        <img
          src={veinAnatomy}
          alt="Żylaki i pajączki na nogach — schemat anatomiczny pajączka żylnego — przekrój skóry pokazujący naskórek (epidermis), skórę właściwą (dermis) z pajączkiem (wenulektazja) i żyłą zasilającą oraz tkankę podskórną (hypodermis) z żyłą głęboką"
          loading="lazy"
          decoding="async"
          width={1456}
          height={819}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px"
          className="w-full h-auto rounded-lg sm:rounded-xl bg-background/40 block"
          style={{ aspectRatio: "1456 / 819" }}
        />
        <figcaption className="text-[11px] sm:text-xs text-muted-foreground/80 mt-2.5 sm:mt-3 text-center leading-snug sm:leading-relaxed px-1">
          Naskórek · Skóra właściwa (pajączek + żyła zasilająca) · Tkanka podskórna (żyła głęboka)
        </figcaption>
      </figure>
    </motion.section>
  );
};

export default VeinAnatomyImage;
