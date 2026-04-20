import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import { ArrowRight, Zap, Shield, Scissors, Flame, Bug, Activity, CircleDot } from "lucide-react";

const sectionAnim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const procedures = [
  {
    title: "Hemoroidy – LHP",
    description: "Laserowa dearterialization hemoroidów. Bez wycinania, bez szwów — powrót do aktywności w kilka dni.",
    href: "/leczenie/lhp",
    icon: Zap,
    tag: "Najpopularniejszy",
  },
  {
    title: "Przetoki – FiLaC",
    description: "Zamknięcie przetoki laserem 1470 nm. Oszczędzenie zwieracza, minimalna inwazyjność.",
    href: "/leczenie/filac",
    icon: Shield,
  },
  {
    title: "Torbiel pilonidalna – SiLaC",
    description: "Laserowe zamknięcie torbieli włosowej w 30 minut. Małe nacięcie, szybki powrót do pracy.",
    href: "/leczenie/silac",
    icon: CircleDot,
  },
  {
    title: "Szczelina odbytu",
    description: "Leczenie przewlekłej szczeliny odbytu. Botoks, laserterapia, indywidualny plan leczenia.",
    href: "/leczenie/szczelina",
    icon: Flame,
  },
  {
    title: "Plastyka odbytu",
    description: "Estetyczna korekta okolicy odbytu techniką laserową. Bez szwów, dyskretnie i bezpiecznie.",
    href: "/leczenie/plastyka",
    icon: Scissors,
  },
  {
    title: "Zapalenie odbytu (Anusitis)",
    description: "Diagnostyka i leczenie stanów zapalnych odbytu. Terapia celowana i łagodzenie objawów.",
    href: "/leczenie/anusitis",
    icon: Bug,
  },
  {
    title: "Przewlekły ból odbytu",
    description: "Spazm mięśnia łonowo-odbytniczego — identyfikacja triggerów i nowoczesne metody leczenia.",
    href: "/leczenie/spazm-lonowoodbytniczy",
    icon: Activity,
  },
];

const Proktologia = () => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Proktologia laserowa – zabiegi | CML"
        description="Kompleksowe leczenie proktologiczne technikami laserowymi: hemoroidy (LHP), przetoki (FiLaC), torbiel pilonidalna (SiLaC), szczelina odbytu i więcej."
        path="/leczenie/proktologia"
      />
      <MedicalWebPageSchema
        name="Proktologia laserowa – zabiegi"
        description="Kompleksowe leczenie proktologiczne technikami laserowymi w CML."
        path="/leczenie/proktologia"
      />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/proktologia"]} className="mb-8" />
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <p className="text-primary text-sm font-sans uppercase tracking-[0.2em] mb-6">
              Centrum Medycyny Laserowej
            </p>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground mb-6">
              Proktologia <span className="italic text-primary">laserowa</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Nowoczesne, minimalnie inwazyjne zabiegi proktologiczne. Bez wycinania, bez szwów —
              z zachowaniem pełnej funkcji zwieraczy i szybkim powrotem do codziennych aktywności.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Procedures Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...sectionAnim}>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4 text-center">
              Zabiegi proktologiczne
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Każdy zabieg dobieramy indywidualnie — po dokładnej diagnostyce i rozmowie z pacjentem.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {procedures.map((proc, i) => {
              const Icon = proc.icon;
              return (
                <motion.div
                  key={proc.href}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={proc.href}
                    className="group block h-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      {proc.tag && (
                        <span className="text-[10px] uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                          {proc.tag}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                      {proc.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {proc.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Dowiedz się więcej <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <motion.section {...sectionAnim} className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
            Nie wiesz, który zabieg jest dla Ciebie?
          </h2>
          <p className="text-muted-foreground mb-8">
            Umów się na konsultację — po badaniu dobierzemy optymalną metodę leczenia.
          </p>
          <Link
            to="/kontakt"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Umów konsultację <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default Proktologia;
