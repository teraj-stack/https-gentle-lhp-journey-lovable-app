import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import { Button } from "@/components/ui/button";
import { Stethoscope, Heart, Zap } from "lucide-react";
import { StaggeredListItem } from "@/components/shared/StaggeredList";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const consultations = [
  {
    title: "Konsultacja proktologiczna",
    price: "400 zł",
    icon: Stethoscope,
    description: "Badanie proktologiczne z omówieniem planu leczenia.",
    includes: ["Wywiad lekarski", "Badanie fizykalne", "Omówienie opcji leczenia"],
    link: "/kontakt",
  },
  {
    title: "Konsultacja flebologiczna",
    price: "400 zł",
    icon: Heart,
    description: "Ocena stanu żył z planem dalszego postępowania.",
    includes: ["Wywiad lekarski", "Badanie fizykalne", "Omówienie opcji leczenia"],
    link: "/kontakt",
  },
  {
    title: "Konsultacja flebologiczna z USG Doppler",
    price: "500 zł",
    icon: Zap,
    description: "Kompleksowa diagnostyka żylna z obrazowaniem ultrasonograficznym.",
    includes: ["Wywiad lekarski", "Badanie USG Doppler", "Mapa żylna", "Plan leczenia"],
    link: "/kontakt",
  },
];

const procedures = [
  { name: "Żylaki – EVLT", price: "od 5 500 zł", href: "/leczenie/evlt" },
  { name: "Mikroflebektomia piankowa", price: "3 500 zł", href: "/leczenie/mikroflebektomia" },
  { name: "Skleroterapia", price: "od 600 zł", href: "/leczenie/skleroterapia" },
  { name: "Pajączki – CLaCS", price: "od 500 zł", href: "/leczenie/clacs" },
  { name: "Leczenie hemoroidów – LHP", price: "od 4 500 zł", href: "/leczenie/lhp" },
  { name: "Leczenie przetok – FiLaC", price: "od 4 300 zł", href: "/leczenie/filac" },
  { name: "Torbiel pilonidalna – SiLaC", price: "8 000 zł", href: "/leczenie/silac" },
];

const Cennik = () => (
  <div className="min-h-screen">
    <SeoHead
      title="Cennik zabiegów laserowych w CML | Warszawa Wilanów"
      description="Przejrzysty cennik CML: konsultacja proktologiczna i flebologiczna 400 zł, z USG Doppler 500 zł, zabiegi laserowe od 3 000 zł. Sprawdź cennik i umów wizytę."
      path="/cennik"
    />
    <MedicalWebPageSchema
      name="Cennik – CML Centrum Medycyny Laserowej"
      description="Cennik konsultacji i zabiegów proktologicznych oraz flebologicznych w CML."
      path="/cennik"
    />
    <Breadcrumbs items={BREADCRUMBS_MAP["/cennik"]} />

    {/* Hero */}
    <section className="py-16 md:py-24 bg-gradient-to-b from-accent/30 to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.h1
          {...fadeUp}
          className="text-3xl md:text-5xl font-bold text-foreground mb-4"
        >
          Cennik
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-muted-foreground max-w-3xl mx-auto whitespace-pre-line"
        >
          Przejrzyste ceny bez ukrytych kosztów. Każda cena zabiegu obejmuje procedurę oraz wszystkie wizyty kontrolne do pełnego wygojenia.

          Przed konsultacją gorąco zachęcam do zapoznania się z treciami i opisami na stronie, to umożliwi Nam. Przygotowałem je dla Ciebie. Dzięki temu na samej konsultacji będziemy mogli się skupić na Twoich oczekiwaniach, obawach i zaplanowaniu dogodnego terminu. Edukacja najskuteczniej niwelują strach i dolegliwości bólowe, a negatywne emocje związane z badaniem zmniejszają się o ponad połowę. Zostań partnerem w rozwiązywaniu problemów zdrowotnych. Jestem po to, żeby pomóc, nie oceniać. 3 filary nowoczesnego podejjcia to "Zaufanie, Skutecznoć i i bezpieczeństwo.
        </motion.p>
      </div>
    </section>

    {/* Consultations */}
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <motion.h2
          {...fadeUp}
          className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12"
        >
          Konsultacje
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {consultations.map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-tight">
                  {item.title}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
              <ul className="space-y-1.5 mb-6 flex-1">
                {item.includes.map((inc, i) => (
                  <StaggeredListItem key={inc} index={i} icon={<span className="text-primary mt-0.5">✓</span>} className="text-sm text-foreground/80 flex items-start gap-2">
                    {inc}
                  </StaggeredListItem>
                  
                ))}
              </ul>
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">{item.price}</span>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Umów wizytę
                  </a>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Procedures */}
    <section className="py-16 md:py-20 bg-accent/20">
      <div className="max-w-4xl mx-auto px-4">
        <motion.h2
          {...fadeUp}
          className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4"
        >
          Zabiegi
        </motion.h2>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center text-muted-foreground mb-12 max-w-xl mx-auto"
        >
          Cena obejmuje zabieg oraz pełną opiekę pooperacyjną, łącznie z wizytami
          kontrolnymi aż do całkowitego wygojenia.
        </motion.p>
        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {procedures.map((proc, i) => (
              <Link
                key={proc.name}
                to={proc.href}
                className={`flex items-center justify-between px-6 py-5 hover:bg-accent/40 transition-colors group ${
                  i !== procedures.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                  {proc.name}
                </span>
                <span className="text-primary font-bold text-lg whitespace-nowrap ml-4">
                  {proc.price}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <motion.h2
          {...fadeUp}
          className="text-2xl md:text-3xl font-bold text-foreground mb-4"
        >
          Masz pytania dotyczące cen?
        </motion.h2>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-muted-foreground mb-8"
        >
          Skontaktuj się z nami — chętnie odpowiemy na wszystkie pytania i
          pomożemy dobrać najlepszy plan leczenia.
        </motion.p>
        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          <Button variant="hero" size="lg" asChild>
            <a
              href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Umów Konsultację
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  </div>
);

export default Cennik;
