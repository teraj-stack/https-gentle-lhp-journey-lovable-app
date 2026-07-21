import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import zylakiAnatomia from "@/assets/zylaki-anatomia.webp";
import ukladZyl from "@/assets/uklad-zyl-powierzchownych.webp";
import zylakiSchemat from "@/assets/zylaki-schemat.webp";

const images = [
  { src: zylakiAnatomia, alt: "Anatomia żył kończyny dolnej — powięź, mięsień, żylak, żyła głęboka, perforator", title: "Przekrój żył kończyny", desc: "Żyła głęboka, perforatory i żylak powierzchowny w kontekście powięzi i mięśni." },
  { src: ukladZyl, alt: "Układ żył powierzchownych kończyny dolnej", title: "Układ żył powierzchownych", desc: "Żyła odpiszczelowa wielka i mała — główne pnie, które najczęściej ulegają niewydolności." },
  { src: zylakiSchemat, alt: "Infografika żylaków — czynniki ryzyka, objawy, profilaktyka", title: "Żylaki — przegląd", desc: "Czynniki ryzyka, objawy i metody profilaktyki w jednym schemacie." },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const EVLTAnatomy = ({ fadeUp }: Props) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
      if (e.key === "ArrowLeft") setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lightboxIndex, close]);

  return (
    <>
      <motion.section {...fadeUp}>
        <h2 className="section-title mb-3 text-center">Anatomia żył kończyn dolnych</h2>
        <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
          Aby zrozumieć chorobę żylną, warto poznać budowę układu żylnego nóg. Poniższe schematy ukazują kluczowe struktury anatomiczne, które odgrywają rolę w powstawaniu żylaków.
        </p>
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {images.map((img, i) => (
            <motion.div
              key={img.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass-card rounded-2xl p-4 text-center flex flex-col"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="block flex-shrink-0 focus:outline-none"
                aria-label={`Powiększ: ${img.title}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  width={560}
                  height={560}
                  className="w-full max-w-[280px] h-[280px] object-contain mx-auto rounded-xl mb-4 cursor-zoom-in hover:opacity-90 transition-opacity"
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <div className="mt-auto">
                <h3 className="font-bold text-foreground text-sm mb-1">{img.title}</h3>
                <p className="text-xs text-muted-foreground">{img.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            onClick={close}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Zamknij"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation arrows */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + images.length) % images.length); }}
              className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors"
              aria-label="Poprzedni obraz"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % images.length); }}
              className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors"
              aria-label="Następny obraz"
            >
              ›
            </button>

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[lightboxIndex].src}
                alt={images[lightboxIndex].alt}
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
              <p className="text-white/80 text-sm mt-4 text-center font-medium">
                {images[lightboxIndex].title}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EVLTAnatomy;
