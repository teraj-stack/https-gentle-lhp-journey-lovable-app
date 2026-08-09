import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import ProktologiaGuide from "@/components/proktologia/ProktologiaGuide";
import ProcedureSearch, { type ProcedureItem } from "@/components/shared/ProcedureSearch";
import { ArrowRight, Zap, Shield, Scissors, Flame, Bug, Activity, CircleDot } from "lucide-react";

const sectionAnim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const procedures: ProcedureItem[] = [
  {
    title: "Hemoroidy – LHP",
    description: "Laserowa dearterialization hemoroidów. Bez wycinania, bez szwów — powrót do aktywności w kilka dni.",
    href: "/leczenie/lhp",
    icon: Zap,
    tag: "Najpopularniejszy",
    categories: ["Hemoroidy", "Laser", "Bez szwów"],
    keywords: ["guzki krwawnicze", "krwawienie z odbytu", "świąd", "ból przy wypróżnianiu", "dearterializacja"],
  },
  {
    title: "Przetoki – FiLaC",
    description: "Zamknięcie przetoki laserem 1470 nm. Oszczędzenie zwieracza, minimalna inwazyjność.",
    href: "/leczenie/filac",
    icon: Shield,
    categories: ["Przetoki", "Laser", "Oszczędzający zwieracz"],
    keywords: ["fistula", "ropień okołoodbytniczy", "wyciek ropy", "1470 nm"],
  },
  {
    title: "Torbiel pilonidalna – SiLaC",
    description: "Laserowe zamknięcie torbieli włosowej w 30 minut. Małe nacięcie, szybki powrót do pracy.",
    href: "/leczenie/silac",
    icon: CircleDot,
    categories: ["Torbiel pilonidalna", "Laser", "Ambulatoryjnie"],
    keywords: ["zatoka włosowa", "kość ogonowa", "ropień", "pilonidal"],
  },
  {
    title: "Szczelina odbytu",
    description: "Leczenie przewlekłej szczeliny odbytu. Botoks, laserterapia, indywidualny plan leczenia.",
    href: "/leczenie/szczelina",
    icon: Flame,
    categories: ["Szczelina", "Laser", "Botoks"],
    keywords: ["fissura", "ostry ból", "krwawienie", "skurcz zwieracza", "anal fissure"],
  },
  {
    title: "Plastyka odbytu",
    description: "Estetyczna korekta okolicy odbytu techniką laserową. Bez szwów, dyskretnie i bezpiecznie.",
    href: "/leczenie/plastyka",
    icon: Scissors,
    categories: ["Estetyka", "Laser", "Bez szwów"],
    keywords: ["korekta", "fałdy skórne", "marisca", "estetyka intymna"],
  },
  {
    title: "Zapalenie odbytu (Anusitis)",
    description: "Diagnostyka i leczenie stanów zapalnych odbytu. Terapia celowana i łagodzenie objawów.",
    href: "/leczenie/anusitis",
    icon: Bug,
    categories: ["Stany zapalne", "Diagnostyka"],
    keywords: ["świąd odbytu", "pieczenie", "zapalenie", "kryptyt"],
  },
  {
    title: "Przewlekły ból odbytu",
    description: "Spazm mięśnia łonowo-odbytniczego — identyfikacja triggerów i nowoczesne metody leczenia.",
    href: "/leczenie/spazm-lonowoodbytniczy",
    icon: Activity,
    categories: ["Ból przewlekły", "Diagnostyka"],
    keywords: ["proctalgia", "spazm", "puborectalis", "ból miednicy", "tężec mięśniowy"],
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

      <ProcedureSearch
        procedures={procedures}
        heading="Zabiegi proktologiczne"
        subtitle="Każdy zabieg dobieramy indywidualnie — po dokładnej diagnostyce i rozmowie z pacjentem."
        searchPlaceholder="Szukaj zabiegu (np. hemoroidy, szczelina, przetoka)…"
      />

      <ProktologiaGuide />

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
