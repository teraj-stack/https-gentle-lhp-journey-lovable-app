import { motion } from "framer-motion";
import zastawkiImg from "@/assets/niewydolnosc-zylna-zastawki.webp";
import perforatorImg from "@/assets/niewydolny-perforator.webp";

interface Props {
  /** Optional title above the images. */
  title?: string;
  /** Optional subtitle / caption shown under the title. */
  subtitle?: string;
  /** Pass-through framer-motion props (entrance animation). */
  fadeUp?: Record<string, unknown>;
  /** When true, render only the main valve comparison image (no perforator). */
  hidePerforator?: boolean;
  /** Optional extra classes for the outer section. */
  className?: string;
  /** Per-page alt text for the main valve comparison image. */
  mainAlt?: string;
  /** Per-page figcaption under the main valve comparison image. */
  mainCaption?: string;
  /** Per-page alt text for the perforator image. */
  perforatorAlt?: string;
  /** Per-page figcaption under the perforator image. */
  perforatorCaption?: string;
}

/**
 * Schemat anatomiczny niewydolności żylnej:
 *  - Lewy obraz: porównanie zdrowych żył (domknięte zastawki) i żylaków
 *    (osłabione ścianki, niedomykające się zastawki, stan zapalny).
 *  - Prawy obraz (opcjonalny): niewydolny perforator — zastój krwi żylnej
 *    i przeciążenie powierzchownych naczyń.
 *
 * Reużywalny komponent — używany na podstronach o niewydolności żylnej,
 * EVLT, mikroflebektomii, profilaktyce żylaków i flebologii laserowej.
 */
const VenousInsufficiencyImage = ({
  title = "Co dzieje się w żyłach z żylakami?",
  subtitle = "Zdrowe zastawki domykają się i kierują krew w górę. Gdy ścianki żył słabną, zastawki przestają się stykać — krew cofa się, naczynie poszerza się, a wokół rozwija się stan zapalny.",
  fadeUp,
  hidePerforator = false,
  className = "",
  mainAlt = "Schemat porównawczy: zdrowe żyły z domkniętymi zastawkami i prawidłowym przepływem krwi obok żył z żylakami — osłabione ścianki, niedomykające się zastawki, cofanie krwi i stan zapalny",
  mainCaption = "Zdrowe żyły · Domknięte zastawki · Żylaki · Niedomykające się zastawki · Stan zapalny",
  perforatorAlt = "Schemat niewydolnego perforatora: niewydolność zastawek żylnych prowadzi do zastoju krwi żylnej i przeciążenia powierzchownych naczyń żylnych",
  perforatorCaption = "Niewydolny perforator · Zastój krwi · Przeciążenie naczyń powierzchownych",
}: Props) => {
  const motionProps = fadeUp ?? {};

  return (
    <motion.section
      {...motionProps}
      className={`max-w-5xl mx-auto px-1 sm:px-0 ${className}`.trim()}
    >
      <h2 className="section-title mb-2 sm:mb-3 text-center text-xl sm:text-2xl md:text-3xl px-2">
        {title}
      </h2>
      {subtitle && (
        <p className="section-subtitle mb-5 sm:mb-8 text-center max-w-3xl mx-auto text-sm sm:text-base px-2 leading-relaxed">
          {subtitle}
        </p>
      )}

      <div
        className={`grid gap-4 sm:gap-6 ${
          hidePerforator ? "" : "lg:grid-cols-[1.7fr_1fr]"
        }`}
      >
        {/* Główny obraz: zdrowe żyły vs żylaki */}
        <figure className="glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 md:p-6">
          <div className="rounded-lg sm:rounded-xl bg-white overflow-hidden">
            <img
              src={zastawkiImg}
              alt={mainAlt}
              loading="lazy"
              decoding="async"
              width={600}
              height={417}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 700px"
              className="w-full h-auto block"
              style={{ aspectRatio: "600 / 417" }}
            />
          </div>
          <figcaption className="text-[11px] sm:text-xs text-muted-foreground/80 mt-2.5 sm:mt-3 text-center leading-snug sm:leading-relaxed px-1">
            {mainCaption}
          </figcaption>
        </figure>

        {/* Drugi obraz: niewydolny perforator */}
        {!hidePerforator && (
          <figure className="glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 md:p-6 flex flex-col">
            <div className="rounded-lg sm:rounded-xl bg-white overflow-hidden flex-1 flex items-center justify-center">
              <img
                src={perforatorImg}
                alt={perforatorAlt}
                loading="lazy"
                decoding="async"
                width={200}
                height={148}
                sizes="(max-width: 1024px) 90vw, 360px"
                className="w-full max-w-[280px] sm:max-w-[320px] mx-auto h-auto block"
                style={{ aspectRatio: "200 / 148" }}
              />
            </div>
            <figcaption className="text-[11px] sm:text-xs text-muted-foreground/80 mt-2.5 sm:mt-3 text-center leading-snug sm:leading-relaxed px-1">
              {perforatorCaption}
            </figcaption>
          </figure>
        )}
      </div>
    </motion.section>
  );
};

export default VenousInsufficiencyImage;
