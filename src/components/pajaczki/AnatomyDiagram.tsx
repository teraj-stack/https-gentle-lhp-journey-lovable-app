import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ResponsiveImage from "@/components/shared/ResponsiveImage";
import pajaczkiAnatomiaPicture from "@/assets/pajaczki-anatomia.webp?w=480;768;1024;1280&format=avif;webp&as=picture";

interface Hotspot {
  id: string;
  label: string;
  x: string;
  y: string;
  /** Target point on the anatomy where the arrow points to (% coords) */
  tx: string;
  ty: string;
  title: string;
  description: string;
}

const hotspots: Hotspot[] = [
  {
    id: "epidermis",
    label: "Naskórek",
    x: "78%", y: "12%",
    tx: "50%", ty: "14%",
    title: "Naskórek (Epidermis)",
    description:
      "Najcieńsza, zewnętrzna warstwa skóry. Pajączki są widoczne przez nią jako fioletowo-czerwona siateczka. Sama w sobie nie jest źródłem problemu — jedynie ujawnia to, co dzieje się głębiej.",
  },
  {
    id: "pajaczek",
    label: "Pajączek żylny",
    x: "80%", y: "34%",
    tx: "52%", ty: "26%",
    title: "Pajączek żylny (wenulektazja)",
    description:
      "Rozszerzone, drobne naczynka w warstwie skóry właściwej (dermis). Mają średnicę poniżej 1 mm i tworzą charakterystyczną siateczkę. Są zasilane przez głębiej położoną żyłę — bez jej zamknięcia problem wraca.",
  },
  {
    id: "zasilajaca",
    label: "Żyła zasilająca",
    x: "80%", y: "60%",
    tx: "48%", ty: "55%",
    title: "Żyła zasilająca (reticular vein)",
    description:
      'Ukryte \u017ar\u00f3d\u0142o problemu \u2014 \u017cy\u0142a o \u015brednicy 1\u20133 mm, kt\u00f3ra \u201Ekarmi\u201D paj\u0105czki ci\u015bnieniem krwi. Metoda CLaCS celuje w\u0142a\u015bnie w ni\u0105: laser obkurcza \u015bcian\u0119, a mikrodawka sklerozantu zamyka \u015bwiat\u0142o naczynia.',
  },
  {
    id: "gleboka",
    label: "Żyła głęboka",
    x: "72%", y: "85%",
    tx: "48%", ty: "90%",
    title: "Żyła głęboka (deep vein)",
    description:
      "Główna autostrada odpływu krwi z kończyny. Badanie USG Doppler pozwala wykryć niewydolność zastawek na tym poziomie — co jest kluczowe dla oceny, czy pajączki są jedynie defektem kosmetycznym, czy sygnałem Przewlekłej Niewydolności Żylnej (PNŻ).",
  },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const AnatomyDiagram = ({ fadeUp }: Props) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  return (
    <motion.section {...fadeUp} className="max-w-4xl mx-auto">
      <h2 className="section-title mb-3 text-center">Co dzieje się pod skórą?</h2>
      <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">
        Pajączki to nie losowe plamki — to rozszerzone wenule (teleangiektazje) w warstwie skóry
        właściwej, zasilane przez głębiej położone żyły.
        <span className="block text-xs text-muted-foreground/60 mt-2">
          Najedź na punkt, aby poznać szczegóły
        </span>
      </p>
      <div className="glass-card rounded-2xl p-6 md:p-10">
        {/* Image with hotspots */}
        <div className="relative rounded-xl overflow-hidden bg-background/50">
          <ResponsiveImage
            picture={pajaczkiAnatomiaPicture}
            alt="Schemat anatomiczny powstawania pajączków żylnych — przekrój skóry pokazujący epidermis, dermis i hypodermis z żyłą zasilającą i pajączkiem żylnym"
            sizes="(min-width: 1024px) 896px, 100vw"
            className="block"
            imgClassName="w-full h-auto rounded-xl"
          />

          {/* SVG connector lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L6,2 L0,4 Z" fill="hsl(43, 72%, 55%)" />
              </marker>
              <marker
                id="arrowhead-dim"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L6,2 L0,4 Z" fill="hsl(43, 72%, 55%)" fillOpacity="0.25" />
              </marker>
            </defs>
            {hotspots.map((spot) => {
              const x1 = parseFloat(spot.x);
              const y1 = parseFloat(spot.y);
              const x2 = parseFloat(spot.tx);
              const y2 = parseFloat(spot.ty);
              const isActive = activeHotspot === spot.id;
              const isDimmed = activeHotspot !== null && !isActive;
              return (
                <line
                  key={spot.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(43, 72%, 55%)"
                  strokeWidth="0.25"
                  strokeDasharray={isActive ? "none" : "1 0.8"}
                  strokeOpacity={isDimmed ? 0.15 : isActive ? 0.9 : 0.35}
                  markerEnd={isDimmed ? "url(#arrowhead-dim)" : "url(#arrowhead)"}
                  style={{ transition: "stroke-opacity 0.3s, stroke-dasharray 0.3s" }}
                />
              );
            })}
          </svg>

          {/* Hotspot dots */}
          {hotspots.map((spot) => (
            <div
              key={spot.id}
              className="absolute group z-10"
              style={{ left: spot.x, top: spot.y, transform: "translate(-50%, -50%)" }}
              onMouseEnter={() => setActiveHotspot(spot.id)}
              onMouseLeave={() => setActiveHotspot(null)}
              onClick={() =>
                setActiveHotspot((prev) => (prev === spot.id ? null : spot.id))
              }
            >
              {/* Pulse ring */}
              <span className="absolute inset-0 w-8 h-8 -m-1.5 rounded-full bg-primary/20 animate-ping" />
              {/* Dot */}
              <span
                className={`relative z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 cursor-pointer transition-all duration-300 ${
                  activeHotspot === spot.id
                    ? "bg-primary border-primary scale-125"
                    : "bg-primary/60 border-primary/80 hover:bg-primary hover:scale-110"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              </span>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="mt-6 min-h-[120px]">
          <AnimatePresence mode="wait">
            {activeHotspot ? (
              <motion.div
                key={activeHotspot}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="bg-secondary/60 border border-border rounded-xl p-5"
              >
                <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
                  {hotspots.find((h) => h.id === activeHotspot)?.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {hotspots.find((h) => h.id === activeHotspot)?.description}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid sm:grid-cols-4 gap-4"
              >
                {hotspots.map((spot) => (
                  <button
                    key={spot.id}
                    className="text-center p-3 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer"
                    onMouseEnter={() => setActiveHotspot(spot.id)}
                    onClick={() => setActiveHotspot(spot.id)}
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                      {spot.label}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Najedź, aby dowiedzieć się więcej
                    </p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
};

export default AnatomyDiagram;
