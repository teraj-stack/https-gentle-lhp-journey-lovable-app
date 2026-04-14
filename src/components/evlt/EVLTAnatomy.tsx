import { motion } from "framer-motion";
import zylakiAnatomia from "@/assets/zylaki-anatomia.jpg";
import ukladZyl from "@/assets/uklad-zyl-powierzchownych.png";
import zylakiSchemat from "@/assets/zylaki-schemat.png";

const images = [
  { src: zylakiAnatomia, alt: "Anatomia żył kończyny dolnej — powięź, mięsień, żylak, żyła głęboka, perforator", title: "Przekrój żył kończyny", desc: "Żyła głęboka, perforatory i żylak powierzchowny w kontekście powięzi i mięśni." },
  { src: ukladZyl, alt: "Układ żył powierzchownych kończyny dolnej", title: "Układ żył powierzchownych", desc: "Żyła odpiszczelowa wielka i mała — główne pnie, które najczęściej ulegają niewydolności." },
  { src: zylakiSchemat, alt: "Infografika żylaków — czynniki ryzyka, objawy, profilaktyka", title: "Żylaki — przegląd", desc: "Czynniki ryzyka, objawy i metody profilaktyki w jednym schemacie." },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const EVLTAnatomy = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Anatomia żył kończyn dolnych</h2>
    <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
      Aby zrozumieć chorobę żylną, warto poznać budowę układu żylnego nóg. Poniższe schematy ukazują kluczowe struktury anatomiczne, które odgrywają rolę w powstawaniu żylaków.
    </p>
    <div className="grid md:grid-cols-3 gap-8 items-start">
      {images.map((img, i) => (
        <motion.div
          key={img.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.12 }}
          className="glass-card rounded-2xl p-4 text-center"
        >
          <a href={img.src} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={img.src}
              alt={img.alt}
              className="w-full max-w-[280px] mx-auto rounded-xl mb-4 cursor-zoom-in hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </a>
          <h3 className="font-bold text-foreground text-sm mb-1">{img.title}</h3>
          <p className="text-xs text-muted-foreground">{img.desc}</p>
        </motion.div>
      ))}
    </div>
  </motion.section>
);

export default EVLTAnatomy;
