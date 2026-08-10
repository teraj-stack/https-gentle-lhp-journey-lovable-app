import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import VenousInsufficiencyImage from "@/components/shared/VenousInsufficiencyImage";
import VeinImageDevOverlay from "@/components/dev/VeinImageDevOverlay";
import ProcedureSearch, { type ProcedureItem } from "@/components/shared/ProcedureSearch";
import { ArrowRight, Zap, Droplets, Scissors, Sparkles, Sun } from "lucide-react";

const sectionAnim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const procedures: ProcedureItem[] = [
  {
    title: "Żylaki – EVLT",
    description: "Endowenozna ablacja laserowa żylaków. Zamknięcie niewydolnej żyły od wewnątrz — bez strippingu, bez blizn.",
    href: "/leczenie/evlt",
    icon: Zap,
    tag: "Złoty standard",
    categories: ["Żylaki", "Laser", "Bez blizn"],
    keywords: ["niewydolność żylna", "ablacja", "endowaskularnie", "stripping", "VSM", "VSP"],
  },
  {
    title: "Skleroterapia żylaków",
    description: "Zamknięcie żylaków i pajączków żylnych za pomocą precyzyjnych iniekcji środka sklerotyzującego.",
    href: "/leczenie/skleroterapia",
    icon: Droplets,
    categories: ["Żylaki", "Pajączki", "Iniekcje", "Bez blizn"],
    keywords: ["pianka", "polidokanol", "ECHO-skleroterapia", "siateczki"],
  },
  {
    title: "Pajączki – CLaCS",
    description: "Hybrydowa metoda łącząca krioskleroterapię z laserem przezskórnym. Najwyższa skuteczność w usuwaniu pajączków.",
    href: "/leczenie/clacs",
    icon: Sparkles,
    tag: "Metoda hybrydowa",
    categories: ["Pajączki", "Laser", "Hybrydowo", "Estetyka"],
    keywords: ["telangiektazje", "krioskleroterapia", "Vasculyse", "naczynka", "siateczki"],
  },
  {
    title: "Mikroflebektomia piankowa",
    description: "Ambulatoryjne usunięcie żylaków powierzchownych przez mikroskopijne nakłucia. Bez szwów, natychmiastowy efekt.",
    href: "/leczenie/mikroflebektomia",
    icon: Scissors,
    categories: ["Żylaki", "Ambulatoryjnie", "Bez szwów"],
    keywords: ["Mullera", "haczyk", "perforator", "bocznice"],
  },
  {
    title: "Fototerapia LED (PBM)",
    description: "Fotobiomodulacja przyspieszająca gojenie i regenerację tkanek po zabiegach flebologicznych.",
    href: "/leczenie/fototerapia",
    icon: Sun,
    categories: ["Regeneracja", "Wsparcie pozabiegowe"],
    keywords: ["LED", "PBM", "photobiomodulation", "gojenie", "siniaki"],
  },
];

const Flebologia = () => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Flebologia laserowa w CML | Leczenie żylaków | Warszawa"
        description="Żylaki i pajączki: EVLT, skleroterapia, CLaCS i mikroflebektomia — minimalnie inwazyjnie, bez blizn. Szybki powrót do normalności. Umów wizytę w CML."
        path="/leczenie/flebologia"
      />
      <MedicalWebPageSchema
        name="Flebologia laserowa – zabiegi na żylaki"
        description="Nowoczesne leczenie żylaków i pajączków żylnych w CML."
        path="/leczenie/flebologia"
        specialty="Phlebology"
      />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/flebologia"]} className="mb-8" />
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
              Flebologia <span className="italic text-primary">laserowa</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Kompleksowe leczenie żylaków i pajączków żylnych nowoczesnymi, minimalnie inwazyjnymi metodami.
              Bez strippingu, bez blizn — z szybkim powrotem do aktywności.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Anatomia niewydolności żylnej */}
      <section className="pb-4 md:pb-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <VenousInsufficiencyImage
            pageKey="flebologia"
            title="Mechanika żylaków — od zastawki do widocznego naczynia"
            subtitle="Każdy zabieg flebologiczny w CML celuje w konkretne ogniwo tej kaskady: laser zamyka chory pień, mikroflebektomia usuwa żylakowate bocznice, skleroterapia eliminuje resztkowe naczynia, a CLaCS — drobne pajączki. Diagnostyka USG Doppler decyduje, gdzie zaczynamy."
            mainAlt="Schemat mechaniki żylaków — niedomykalność zastawek w przewlekłej niewydolności żylnej powoduje refluks (cofanie krwi), poszerzenie naczynia i stan zapalny prowadzący do widocznych żylaków"
            mainCaption="Zastawka · Refluks · Poszerzenie naczynia · Stan zapalny · Widoczny żylak"
            perforatorAlt="Schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym, którego refluks dociąża powierzchowne żyły i napędza powstawanie żylaków"
            perforatorCaption="Niewydolny perforator · Dociąża układ powierzchowny · Punkt diagnostyki USG Doppler"
          />
          <VeinImageDevOverlay pageKey="flebologia" />
        </div>
      </section>

      <ProcedureSearch
        procedures={procedures}
        heading="Zabiegi flebologiczne"
        subtitle="Dobieramy metodę leczenia na podstawie badania USG Doppler i indywidualnej oceny klinicznej."
        searchPlaceholder="Szukaj zabiegu (np. żylaki, pajączki, EVLT)…"
      />

      {/* Educational cross-link */}
      <motion.section {...sectionAnim} className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to="/dla-pacjenta/profilaktyka-zylakow"
            className="group block rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6 md:p-8 hover:border-primary/40 hover:from-primary/10 transition-all"
          >
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-4xl shrink-0">🛡️</div>
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs uppercase tracking-widest text-primary/70 mb-1 font-sans">
                  Strefa Pacjenta
                </p>
                <h3 className="font-heading text-xl md:text-2xl text-foreground mb-1 group-hover:text-primary transition-colors">
                  Jak zapobiegać żylakom?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Czynniki ryzyka, objawy ostrzegawcze i 6 filarów codziennej profilaktyki.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section {...sectionAnim} className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
            Nie wiesz, która metoda jest dla Ciebie?
          </h2>
          <p className="text-muted-foreground mb-8">
            Umów się na konsultację z badaniem USG Doppler — dobierzemy optymalny plan leczenia.
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

export default Flebologia;
