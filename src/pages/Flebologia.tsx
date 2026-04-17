import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import { ArrowRight, Zap, Droplets, Scissors, Sparkles, Sun } from "lucide-react";

const sectionAnim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

const procedures = [
  {
    title: "Żylaki – EVLT",
    description: "Endowenozna ablacja laserowa żylaków. Zamknięcie niewydolnej żyły od wewnątrz — bez strippingu, bez blizn.",
    href: "/leczenie/evlt",
    icon: Zap,
    tag: "Złoty standard",
  },
  {
    title: "Skleroterapia żylaków",
    description: "Zamknięcie żylaków i pajączków żylnych za pomocą precyzyjnych iniekcji środka sklerotyzującego.",
    href: "/leczenie/skleroterapia",
    icon: Droplets,
  },
  {
    title: "Pajączki – CLaCS",
    description: "Hybrydowa metoda łącząca krioskleroterapię z laserem przezskórnym. Najwyższa skuteczność w usuwaniu pajączków.",
    href: "/leczenie/clacs",
    icon: Sparkles,
    tag: "Metoda hybrydowa",
  },
  {
    title: "Mikroflebektomia piankowa",
    description: "Ambulatoryjne usunięcie żylaków powierzchownych przez mikroskopijne nakłucia. Bez szwów, natychmiastowy efekt.",
    href: "/leczenie/mikroflebektomia",
    icon: Scissors,
  },
  {
    title: "Fototerapia LED (PBM)",
    description: "Fotobiomodulacja przyspieszająca gojenie i regenerację tkanek po zabiegach flebologicznych.",
    href: "/leczenie/fototerapia",
    icon: Sun,
  },
];

const Flebologia = () => {
  return (
    <div className="min-h-screen bg-background pt-20">
      <SeoHead
        title="Flebologia laserowa – zabiegi na żylaki | CML"
        description="Nowoczesne leczenie żylaków i pajączków żylnych: EVLT, skleroterapia, CLaCS, mikroflebektomia piankowa. Minimalnie inwazyjnie, bez blizn."
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
          <Breadcrumbs items={[{ label: "Flebologia" }]} className="mb-8" />
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

      {/* Procedures Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...sectionAnim}>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4 text-center">
              Zabiegi flebologiczne
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Dobieramy metodę leczenia na podstawie badania USG Doppler i indywidualnej oceny klinicznej.
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
