import { useEffect } from "react";
import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import FaqSchema from "@/components/shared/FaqSchema";
import { Button } from "@/components/ui/button";
import { StaggeredListItem } from "@/components/shared/StaggeredList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import RelatedLinks from "@/components/shared/RelatedLinks";
import {
  GraduationCap,
  Clock,
  Brain,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  ArrowRight,
  Download,
  Users,
  Zap,
  Target,
  BookOpen,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const comparisonData = {
  traditional: {
    title: "Wizyta nieprzygotowana",
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    items: [
      "Lekarz tłumaczy anatomię od podstaw",
      "Większość czasu na edukację, nie diagnostykę",
      "Mniej czasu na badanie USG Doppler",
      "Pacjent podejmuje decyzje pod presją czasu",
    ],
  },
  cml: {
    title: "Standard CML",
    subtitle: "Świadoma wizyta",
    icon: Target,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      "Lekarz od razu przechodzi do diagnostyki",
      "100% czasu na badanie obrazowe i plan leczenia",
      "Precyzyjne mapowanie naczyń USG Doppler",
      "Pacjent podejmuje świadome decyzje wspólnie z lekarzem",
    ],
  },
};

const benefits = [
  {
    icon: Clock,
    title: "Optymalizacja czasu diagnostyki",
    desc: "Przyswojenie podstawowej wiedzy w domu uwalnia cenne minuty w gabinecie, które w całości inwestowane są w precyzyjne badania obrazowe (USG, anoskopia) i trafną diagnozę.",
  },
  {
    icon: ShieldCheck,
    title: "Redukcja stresu przedwizytowego",
    desc: "Zrozumienie przebiegu procedur małoinwazyjnych eliminuje lęk przed nieznanym i buduje poczucie bezpieczeństwa.",
  },
  {
    icon: Brain,
    title: "Świadome decyzje terapeutyczne",
    desc: "Znajomość różnic między tradycyjną chirurgią a metodami tkankowo-oszczędzającymi ułatwia wspólny z lekarzem wybór nowoczesnej terapii.",
  },
  {
    icon: Users,
    title: "Partnerstwo z lekarzem",
    desc: "Proces oparty na faktach naukowych (Evidence-Based Medicine) sprawia, że pacjent staje się aktywnym partnerem w procesie własnego leczenia.",
  },
];

const faqs = [
  {
    q: "W jaki sposób podstawowa wiedza maksymalizuje skuteczność konsultacji?",
    a: "Czas trwania wizyty lekarskiej jest ściśle określony. Kiedy mechanizmy powstawania schorzeń i metody ich leczenia (np. termiczna fotokoagulacja) są już znane dzięki materiałom edukacyjnym, cała uwaga medyczna w gabinecie zostaje przekierowana z teorii na praktykę. Lekarz może poświęcić maksimum czasu na precyzyjne badanie fizykalne i ultrasonograficzne, co stanowi fundament trafnej i bezpiecznej diagnozy.",
  },
  {
    q: "W jaki sposób małoinwazyjne technologie wpływają na powrót do sprawności?",
    a: "Zabiegi takie jak ablacja wewnątrzżylna (EVLT) czy leczenie splotów hemoroidalnych (LHP) to wewnątrztkankowe procedury termiczne. Nie wymagają radykalnego wycinania tkanek i usuwania żył (tzw. strippingu). Ze względu na tkankowo-oszczędzający charakter, metody te w wielu przypadkach pozwalają na powrót do standardowej aktywności w 48–72 godziny.",
  },
  {
    q: "Dlaczego nowoczesna diagnostyka często łączy flebologię i proktologię?",
    a: "Dane kliniczne wskazują jasno, że schorzenia układu żylnego i odbytnicy bardzo często współistnieją u pacjentów w wyniku ogólnego osłabienia tkanki łącznej. Stany po urazach okołoporodowych lub niewydolność żylna miednicy (PCS) nierzadko manifestują się jednoczesnymi problemami flebologicznymi kończyn dolnych i zmianami proktologicznymi. Zrozumienie tego faktu pozwala na znacznie dokładniejsze opisywanie objawów podczas wywiadu.",
  },
];

const timelineSteps = [
  {
    step: "01",
    icon: BookOpen,
    title: "Zapoznaj się z materiałami",
    desc: "Przeczytaj e-booki i przewodniki online w domowym zaciszu, bez pośpiechu.",
  },
  {
    step: "02",
    icon: Brain,
    title: "Zrozum swój problem",
    desc: "Poznaj mechanizmy choroby, dostępne metody leczenia i czego się spodziewać.",
  },
  {
    step: "03",
    icon: Stethoscope,
    title: "Przyjdź na wizytę przygotowany",
    desc: "Lekarz poświęci 100% czasu na diagnostykę i indywidualny plan leczenia.",
  },
  {
    step: "04",
    icon: HeartPulse,
    title: "Podejmij świadomą decyzję",
    desc: "Wspólnie z lekarzem wybierzesz optymalną metodę — bez presji i stresu.",
  },
];

const EdukacjaPrzedWizyta = () => {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: "Dlaczego edukacja przed wizytą jest kluczowa – Świadomy pacjent w gabinecie",
      description:
        "Dowiedz się, jak przygotowanie merytoryczne przed wizytą u proktologa lub flebologa optymalizuje czas konsultacji i podnosi jakość leczenia.",
      url: "https://mcml.pro/dla-pacjenta/edukacja",
      lastReviewed: "2025-06-01",
      medicalAudience: {
        "@type": "PatientAudience",
        audienceType: "Patient",
      },
      specialty: [
        { "@type": "MedicalSpecialty", name: "Proctology" },
        { "@type": "MedicalSpecialty", name: "Phlebology" },
      ],
      about: {
        "@type": "MedicalCondition",
        name: "Patient Education Before Medical Visit",
      },
      author: {
        "@type": "Physician",
        name: "lek. med. Jan Bujok",
        medicalSpecialty: "Proctology",
      },
      publisher: {
        "@type": "MedicalClinic",
        name: "CML – Centrum Medycyny Laserowej",
        url: "https://mcml.pro",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-medical-webpage", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Dlaczego edukacja przed wizytą jest kluczowa"
      description="Dowiedz się, jak przygotowanie merytoryczne przed wizytą u proktologa lub flebologa optymalizuje czas konsultacji i podnosi jakość leczenia."
      path="/dla-pacjenta/edukacja"
    />
    <FaqSchema
      faqs={faqs}
      name="FAQ – Edukacja pacjenta przed wizytą"
      url="https://mcml.pro/dla-pacjenta/edukacja"
    />

    {/* Hero */}
    <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto text-center"
      >
        <div className="w-14 h-14 rounded-xl bg-primary-foreground/15 flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Świadomy pacjent w gabinecie
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-primary-foreground/90 mb-4">
          Dlaczego wiedza optymalizuje czas konsultacji medycznej?
        </p>
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Współczesna medycyna zabiegowa ewoluuje w kierunku opieki zintegrowanej, w której pacjent staje się świadomym partnerem lekarza. Zrozumienie, jak zdobycie wiedzy podnosi jakość leczenia, to pierwszy krok.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">
      <Breadcrumbs
        items={BREADCRUMBS_MAP["/dla-pacjenta/edukacja"]}
        className="mb-4"
      />

      {/* Philosophy */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
            Filozofia CML
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Prehabilitacja informacyjna
          </h2>
          <div className="premium-divider mb-6" />
        </div>
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <p className="text-muted-foreground leading-relaxed text-base">
            W Centrum Medycyny Laserowej proces opieki rozpoczyna się <strong className="text-foreground">długo przed właściwą wizytą</strong>. Udostępnianie pacjentom merytorycznej wiedzy — w postaci e-booków i ikonografii medycznej — pełni funkcję przygotowawczą. Obiektywne zapoznanie się z wiedzą zdejmuje z pacjenta ciężar niepewności i stresu. Uświadomiona osoba odczuwa większy spokój, co prowadzi do sprawniejszego wywiadu medycznego, wyższego poziomu współpracy i <strong className="text-foreground">stuprocentowego wykorzystania czasu konsultacji</strong> na rzetelną diagnostykę.
          </p>
        </div>
      </motion.section>

      {/* Comparison: Two models */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
            Porównanie
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Dwa modele konsultacji
          </h2>
          <div className="premium-divider mb-6" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Traditional */}
          <div className={`rounded-2xl p-6 border border-border/50 ${comparisonData.traditional.bgColor}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <comparisonData.traditional.icon className={`w-5 h-5 ${comparisonData.traditional.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{comparisonData.traditional.title}</h3>
              </div>
            </div>
            <ul className="space-y-3">
              {comparisonData.traditional.items.map((item, i) => (
                <StaggeredListItem key={item} index={i} icon={<span className="text-destructive shrink-0 mt-0.5">✕</span>} className="flex gap-3 text-sm text-muted-foreground">
                  <span>{item}</span>
                </StaggeredListItem>
              ))}
            </ul>
          </div>

          {/* CML Standard */}
          <div className={`rounded-2xl p-6 border border-primary/20 ${comparisonData.cml.bgColor}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <comparisonData.cml.icon className={`w-5 h-5 ${comparisonData.cml.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{comparisonData.cml.title}</h3>
                <p className="text-[11px] text-primary uppercase tracking-wider">{comparisonData.cml.subtitle}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {comparisonData.cml.items.map((item, i) => (
                <StaggeredListItem key={item} index={i} icon={<span className="text-primary shrink-0 mt-0.5">✓</span>} className="flex gap-3 text-sm text-muted-foreground">
                  <span>{item}</span>
                </StaggeredListItem>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Timeline: 4 steps */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
            Proces
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Jak przygotować się do wizyty
          </h2>
          <div className="premium-divider mb-6" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {timelineSteps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 text-center relative"
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary/40 absolute top-4 left-4">
                {s.step}
              </span>
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4 mt-2">
                <s.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Key Benefits */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="text-center">
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-3">
            Korzyści
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Co zyskujesz dzięki wcześniejszej edukacji
          </h2>
          <div className="premium-divider mb-6" />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 flex gap-4 items-start"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Pytania i odpowiedzi
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Najczęstsze pytania pacjentów o przygotowanie do wizyty i nowoczesne metody leczenia
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass-card rounded-xl border-none px-6"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary hover:no-underline py-5 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </motion.section>

      {/* Highlight: Flebologia + Proktologia */}
      <motion.section {...fadeUp}>
        <div className="glass-card rounded-2xl p-8 md:p-10 border border-primary/10">
          <div className="flex items-center gap-3 mb-5">
            <Zap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Flebologia + Proktologia = Diagnostyka zintegrowana</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed text-sm mb-4">
            Schorzenia układu żylnego i odbytnicy bardzo często współistnieją w wyniku ogólnego osłabienia tkanki łącznej. Stany po urazach okołoporodowych lub niewydolność żylna miednicy (PCS — Pelvic Congestion Syndrome) nierzadko manifestują się jednoczesnymi problemami na obu polach. Zrozumienie tego powiązania pozwala na dokładniejsze opisywanie objawów i trafniejszą diagnostykę.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">EVLT — ablacja laserowa</span>
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">LHP — Laser HemorrhoidoPlasty</span>
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">Skleroterapia</span>
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">FiLaC — przetoki</span>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="glass-card rounded-2xl p-8 md:p-12 text-center">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Zdobądź wiedzę i przejmij kontrolę
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6 max-w-xl mx-auto">
            Pobierz darmowy e-book edukacyjny, aby w domowym zaciszu zdobyć rzetelne podstawy z zakresu flebologii i proktologii. Przygotuj się do wizyty i upewnij się, że Twoja konsultacja zostanie w 100% wykorzystana na indywidualną diagnozę.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" size="lg" asChild>
              <a href="/ebooks/Powrot-do-Komfortu-Przewodnik.pdf" download>
                <Download className="w-4 h-4 mr-2" />
                Pobierz e-book (PDF)
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                target="_blank"
                rel="noopener noreferrer"
              >
                Umów konsultację
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </motion.section>
      <RelatedLinks path="/dla-pacjenta/edukacja" />
    </div>
  </div>
  );
};

export default EdukacjaPrzedWizyta;
