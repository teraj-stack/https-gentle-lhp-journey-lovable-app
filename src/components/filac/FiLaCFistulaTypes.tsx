import { motion } from "framer-motion";
import fistulaImg from "@/assets/fistula-types.webp";

const types = [
  {
    letter: "A",
    name: "Przetoka przezzwieraczowa",
    description:
      "Kanał przebiega przez zwieracz wewnętrzny i zewnętrzny. Najczęstszy typ — stanowi ok. 45 % przypadków.",
    filac: true,
  },
  {
    letter: "B",
    name: "Przetoka międzyzwieraczowa",
    description:
      "Kanał biegnie między zwieraczem wewnętrznym a zewnętrznym i otwiera się nisko przy odbycie. Drugi co do częstości (~30 %).",
    filac: true,
  },
  {
    letter: "C",
    name: "Przetoka powierzchowna (podskórna)",
    description:
      "Biegnie tuż pod skórą, bez przechodzenia przez mięśnie zwieraczy. Zwykle najprostsza w leczeniu.",
    filac: true,
  },
  {
    letter: "D",
    name: "Przetoka nadzwieraczowa",
    description:
      "Kanał przebiega powyżej mięśnia łonowo-odbytniczego. Typ rzadki, ale złożony — wymaga szczegółowej diagnostyki.",
    filac: false,
  },
  {
    letter: "E",
    name: "Przetoka pozazwieraczowa",
    description:
      "Kanał omija aparat zwieraczowy i może łączyć się z jamą brzuszną. Najrzadsza, często wtórna do choroby Leśniowskiego-Crohna.",
    filac: false,
  },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const FiLaCFistulaTypes = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
      Rodzaje przetok okołoodbytniczych
    </h2>
    <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10 leading-relaxed">
      Klasyfikacja Parksa wyróżnia 5 głównych typów przetok w zależności od ich przebiegu
      względem mięśni zwieraczy odbytu. Typ przetoki determinuje wybór metody leczenia.
    </p>

    <div className="grid md:grid-cols-2 gap-8 items-start">
      {/* Diagram */}
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
        <img
          src={fistulaImg}
          alt="Schemat anatomiczny klasyfikacji Parksa — przekrój kanału odbytu z zaznaczonymi typami przetok A–E"
          width={600}
          height={800}
          className="w-full max-w-xs mx-auto"
          loading="lazy"
          decoding="async"
        />
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Klasyfikacja Parksa — przekrój kanału odbytu
        </p>
      </div>

      {/* Types list */}
      <div className="space-y-4">
        {types.map((t) => (
          <div
            key={t.letter}
            className="glass-card rounded-xl p-4 border-l-4"
            style={{
              borderLeftColor: t.filac
                ? "hsl(var(--accent))"
                : "hsl(var(--muted-foreground) / 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/20 text-accent font-bold text-sm shrink-0">
                {t.letter}
              </span>
              <h3 className="font-semibold text-foreground text-sm md:text-base">
                {t.name}
              </h3>
              {t.filac && (
                <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  FiLaC ✓
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed pl-9">
              {t.description}
            </p>
          </div>
        ))}
      </div>
    </div>

    <p className="text-muted-foreground text-center mt-6 max-w-xl mx-auto">
      <strong className="text-foreground">Przetoki przezzwieraczowe (A) i międzyzwieraczowe (B)</strong> charakteryzują się najmniejszym ryzykiem wystąpienia niepożądanych zdarzeń w przebiegu leczenia.
      Dla tych typów <strong className="text-[hsl(160,45%,55%)]">zabieg laserowy FiLaC</strong> jest metodą z wyboru — oferuje najwyższą skuteczność przy minimalnym urazie tkanek i pełnej ochronie funkcji zwieraczy.
    </p>
    <p className="text-muted-foreground text-center mt-4 max-w-xl mx-auto">
      Metoda FiLaC jest szczególnie skuteczna w przetokach przezzwieraczowych,
      międzyzwieraczowych i powierzchownych. Typy nadzwieraczowe i pozazwieraczowe
      wymagają indywidualnej oceny chirurgicznej.
    </p>
  </motion.section>
);

export default FiLaCFistulaTypes;
