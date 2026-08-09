import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ShieldCheck,
  BookMarked,
  ExternalLink,
  ClipboardList,
  Stethoscope,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import MedicalWebPageSchema from "@/components/shared/MedicalWebPageSchema";
import EBMSourcesSection from "@/components/hemoroidy/EBMSourcesSection";
import RelatedLinks from "@/components/shared/RelatedLinks";

const easeOut = [0.16, 1, 0.3, 1] as const;

type KeyPoint = {
  title: string;
  summary: string;
  evidence: string;
  sources: { label: string; url: string }[];
};

const RISK_FACTORS: KeyPoint[] = [
  {
    title: "Przewlekłe zaparcia i parcie (Valsalva)",
    summary:
      "Najsilniej udokumentowany modyfikowalny czynnik ryzyka. Parcie zwiększa ciśnienie żylne w splotach hemoroidalnych, prowadząc do osłabienia tkanki łącznej i wypadania guzków.",
    evidence:
      "Johanson & Sonnenberg (1990) — prospektywne badanie populacyjne potwierdzające silną korelację zaparć z chorobą hemoroidalną.",
    sources: [
      {
        label: "Johanson J.F., Sonnenberg A. (1990) — Gastroenterology",
        url: "https://pubmed.ncbi.nlm.nih.gov/2295392/",
      },
      {
        label: "Garg P., Singh P. (2017) — TONE technique, Minerva Gastroenterol",
        url: "https://pubmed.ncbi.nlm.nih.gov/28206729/",
      },
    ],
  },
  {
    title: "Dieta uboga w błonnik (<25 g/d)",
    summary:
      "Niedobór błonnika rozpuszczalnego (psyllium) zwiększa ryzyko twardych stolców, zaparć i krwawień. Suplementacja redukuje objawy o ok. 50% (Cochrane).",
    evidence:
      "Alonso-Coello et al. (2006) — meta-analiza 7 RCT: błonnik istotnie redukuje krwawienie i objawy.",
    sources: [
      {
        label: "Alonso-Coello P. et al. (2006) — Am J Gastroenterol",
        url: "https://pubmed.ncbi.nlm.nih.gov/16405552/",
      },
      {
        label: "Cochrane Review — Alonso-Coello (2005)",
        url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004649.pub2/full",
      },
    ],
  },
  {
    title: "Niedostateczne nawodnienie (<1,5 l/d)",
    summary:
      "Łagodne odwodnienie zwiększa twardość stolca i częstość zaparć. Synergiczny efekt z błonnikiem — sam błonnik bez wody nasila zaparcia.",
    evidence:
      "Arnaud (2003) i Anti et al. (1998) — woda jest krytyczna dla skuteczności suplementacji błonnika.",
    sources: [
      {
        label: "Arnaud M.J. (2003) — Eur J Clin Nutr",
        url: "https://pubmed.ncbi.nlm.nih.gov/14681719/",
      },
      {
        label: "Anti M. et al. (1998) — Hepatogastroenterology",
        url: "https://pubmed.ncbi.nlm.nih.gov/9684123/",
      },
    ],
  },
  {
    title: "Długie wizyty w toalecie (>3 min) i pozycja siedząca",
    summary:
      "Czas >3 min na sedesie + parcie powodują grawitacyjny zastój żylny. Pozycja kuczna (Sikirov) redukuje wysiłek o 60%.",
    evidence:
      "Sikirov D. (2003) — RCT porównujące 3 pozycje: kuczna istotnie redukuje czas i parcie.",
    sources: [
      {
        label: "Sikirov D. (2003) — Dig Dis Sci",
        url: "https://pubmed.ncbi.nlm.nih.gov/12870773/",
      },
    ],
  },
  {
    title: "Ciąża i poród naturalny",
    summary:
      "Ciśnienie macicy + zmiany hormonalne (relaksyna) + parcie podczas porodu → 25–35% ciężarnych ma objawy. Większość ustępuje po połogu.",
    evidence:
      "Poskus T. et al. (2014) — kohortowe badanie 280 kobiet: 39% incydencji w ciąży.",
    sources: [
      {
        label: "Poskus T. et al. (2014) — BJOG",
        url: "https://pubmed.ncbi.nlm.nih.gov/24810254/",
      },
    ],
  },
  {
    title: "Siedzący tryb życia i otyłość (BMI >30)",
    summary:
      "Brak ruchu spowalnia perystaltykę i nasila zaparcia. Otyłość zwiększa ciśnienie wewnątrzbrzuszne — niezależny czynnik ryzyka (PLoS ONE).",
    evidence:
      "Peery A.F. et al. (2015) — screening colonoscopy n=1074: BMI i siedzący tryb istotnymi predyktorami.",
    sources: [
      {
        label: "Peery A.F. et al. (2015) — PLoS ONE",
        url: "https://pubmed.ncbi.nlm.nih.gov/26406337/",
      },
      {
        label: "Riss S. et al. (2012) — Int J Colorectal Dis",
        url: "https://pubmed.ncbi.nlm.nih.gov/21932016/",
      },
    ],
  },
];

const PREVENTION: KeyPoint[] = [
  {
    title: "Błonnik 25–35 g dziennie (psyllium + warzywa)",
    summary:
      "Stopniowo wprowadzaj psyllium (1–2 łyżki) + 5 porcji warzyw/owoców. Redukcja krwawienia o ~50% w 6 tygodni.",
    evidence:
      "ASCRS 2018 i ESCP 2020 — błonnik to zalecenie 1A (najwyższy poziom dowodów).",
    sources: [
      {
        label: "ASCRS 2018 — Davis et al., Diseases of the Colon & Rectum",
        url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
      },
      {
        label: "ESCP 2020 — van Tol et al., Colorectal Disease",
        url: "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975",
      },
    ],
  },
  {
    title: "Nawodnienie 2–2,5 l wody/d",
    summary:
      "Woda + błonnik = miękki stolec. Bez wody błonnik może paradoksalnie nasilać zaparcia.",
    evidence:
      "Anti et al. (1998) — RCT: dodanie 1,5 l wody do diety wysokobłonnikowej istotnie zwiększyło częstość wypróżnień.",
    sources: [
      {
        label: "Anti M. et al. (1998) — Hepatogastroenterology",
        url: "https://pubmed.ncbi.nlm.nih.gov/9684123/",
      },
    ],
  },
  {
    title: "Krótkie wizyty w toalecie (max 3 min, bez telefonu)",
    summary:
      "Zasada „3 minuty bez parcia”. Jeśli stolec nie schodzi — wstań i wróć później. Pozycja kuczna (podnóżek) redukuje parcie o 60%.",
    evidence:
      "Sikirov D. (2003) — RCT n=28: pozycja kuczna istotnie skraca czas defekacji i parcie.",
    sources: [
      {
        label: "Sikirov D. (2003) — Dig Dis Sci",
        url: "https://pubmed.ncbi.nlm.nih.gov/12870773/",
      },
      {
        label: "Garg P., Singh P. (2017) — TONE technique",
        url: "https://pubmed.ncbi.nlm.nih.gov/28206729/",
      },
    ],
  },
  {
    title: "Aktywność fizyczna 150 min/tydzień",
    summary:
      "Spacery, joga, pływanie pobudzają perystaltykę. Unikaj długich treningów siłowych z parciem (przysiady ze sztangą).",
    evidence:
      "De Schryver et al. (2005) — 12 tyg. regularnego ruchu istotnie poprawiło rytm wypróżnień u pacjentów z zaparciami.",
    sources: [
      {
        label: "De Schryver A.M. et al. (2005) — Scand J Gastroenterol",
        url: "https://pubmed.ncbi.nlm.nih.gov/16028436/",
      },
    ],
  },
  {
    title: "Higiena okołoodbytnicza wodą (bez agresywnych mydeł)",
    summary:
      "Po wypróżnieniu spłucz wodą lub użyj wilgotnej chusteczki bez alkoholu. Twardy papier toaletowy + mydło antybakteryjne = podrażnienie i pęknięcia.",
    evidence:
      "ASCRS 2018 — sitz baths (3×/d, 10 min, ciepła woda) zalecane jako leczenie zachowawcze (poziom 1B).",
    sources: [
      {
        label: "ASCRS 2018 — Davis et al.",
        url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
      },
    ],
  },
  {
    title: "Wczesna konsultacja proktologiczna przy nawrotach",
    summary:
      "Jeśli mimo zmiany stylu życia objawy wracają w 4–8 tyg. — wskazana anoskopia. Wczesne LHP (II–III°) to skuteczność 90–95% i powrót do pracy w 3–7 dni.",
    evidence:
      "Naderan et al. (2017) — RCT: LHP vs Milligan-Morgan, krótszy czas rekonwalescencji i mniejszy ból przy porównywalnej skuteczności.",
    sources: [
      {
        label: "Naderan M. et al. (2017) — J Invest Surg",
        url: "https://pubmed.ncbi.nlm.nih.gov/27922290/",
      },
      {
        label: "Brusciano L. et al. (2020) — Updates Surg",
        url: "https://pubmed.ncbi.nlm.nih.gov/32086781/",
      },
    ],
  },
];

const KeyPointCard = ({ point, variant }: { point: KeyPoint; variant: "risk" | "prevention" }) => {
  const isRisk = variant === "risk";
  const colorClasses = isRisk
    ? "border-destructive/20 hover:border-destructive/40 bg-background/40"
    : "border-primary/20 hover:border-primary/40 bg-background/40";
  const iconBg = isRisk ? "bg-destructive/10" : "bg-primary/10";
  const iconColor = isRisk ? "text-destructive" : "text-primary";
  const Icon = isRisk ? AlertTriangle : ShieldCheck;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className={`rounded-xl border p-5 md:p-6 transition-colors ${colorClasses}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </span>
        <h3 className="font-heading text-lg md:text-xl text-foreground leading-snug flex-1">
          {point.title}
        </h3>
      </div>
      <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-3">{point.summary}</p>
      <p className="text-xs md:text-sm text-muted-foreground italic mb-4 border-l-2 border-border pl-3">
        {point.evidence}
      </p>
      <ul className="space-y-1.5">
        {point.sources.map((src, i) => (
          <li key={i} className="text-xs md:text-sm">
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-start gap-1.5 leading-snug"
            >
              <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{src.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </motion.article>
  );
};

const EbmHemoroidy = () => {
  const trail = BREADCRUMBS_MAP["/dla-pacjenta/ebm-hemoroidy"];

  return (
    <>
      <SeoHead
        title="EBM hemoroidy — czynniki ryzyka i profilaktyka oparte na badaniach | CML"
        description="Kompendium Evidence-Based Medicine: 6 kluczowych czynników ryzyka i 6 filarów profilaktyki hemoroidów. Linki do badań PubMed, wytycznych ASCRS, ESCP i Cochrane."
        path="/dla-pacjenta/ebm-hemoroidy"
      />
      <MedicalWebPageSchema
        name="EBM hemoroidy — czynniki ryzyka i profilaktyka"
        description="Kompendium Evidence-Based Medicine dotyczące choroby hemoroidalnej: kluczowe czynniki ryzyka, filary profilaktyki i pełna bibliografia (22 referencje, 8 kategorii) z linkami do PubMed, ASCRS i ESCP."
        path="/dla-pacjenta/ebm-hemoroidy"
      />

      <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-4 md:px-8 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto relative">
          {trail && <Breadcrumbs items={trail} className="mb-8" />}

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="text-center mb-14 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-5">
              <BookMarked className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
                Evidence-Based Medicine
              </span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl text-foreground mb-5 leading-[1.1]">
              EBM hemoroidy — <em className="text-primary not-italic">co naprawdę działa?</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Kluczowe czynniki ryzyka i profilaktyka choroby hemoroidalnej oparte wyłącznie na
              recenzowanych badaniach. Każdy punkt linkuje do oryginalnej publikacji w PubMed lub
              wytycznej ASCRS / ESCP / Cochrane.
            </p>
          </motion.div>

          {/* Quick stats / TOC */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16 max-w-3xl mx-auto"
          >
            {[
              { num: "6", label: "Czynników ryzyka" },
              { num: "6", label: "Filarów profilaktyki" },
              { num: "22", label: "Referencje EBM" },
              { num: "8", label: "Kategorii źródeł" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-background/40 p-4 text-center"
              >
                <p className="font-heading text-2xl md:text-3xl text-primary mb-1">{s.num}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Risk factors */}
          <div className="mb-20" id="czynniki-ryzyka">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 mb-4">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs font-sans uppercase tracking-[0.18em] text-destructive">
                  Co zwiększa ryzyko
                </span>
              </div>
              <h2 className="font-heading text-2xl md:text-4xl text-foreground mb-3">
                Czynniki ryzyka — <em className="text-destructive not-italic">co mówią badania</em>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                6 najsilniej udokumentowanych modyfikowalnych i niemodyfikowalnych czynników, które
                istotnie zwiększają ryzyko choroby hemoroidalnej.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {RISK_FACTORS.map((p) => (
                <KeyPointCard key={p.title} point={p} variant="risk" />
              ))}
            </div>
          </div>

          {/* Prevention */}
          <div className="mb-20" id="profilaktyka">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-sans uppercase tracking-[0.18em] text-primary">
                  Co naprawdę chroni
                </span>
              </div>
              <h2 className="font-heading text-2xl md:text-4xl text-foreground mb-3">
                Profilaktyka — <em className="text-primary not-italic">6 filarów EBM</em>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Strategie potwierdzone w wytycznych ASCRS i ESCP oraz meta-analizach Cochrane.
                Najwyższy poziom dowodów (1A/1B).
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {PREVENTION.map((p) => (
                <KeyPointCard key={p.title} point={p} variant="prevention" />
              ))}
            </div>

            {/* Red flags — when to see a doctor */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="mt-8"
              id="kiedy-do-lekarza"
            >
              <div className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-background/40 to-background/40 p-6 sm:p-8">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-destructive/10 blur-3xl pointer-events-none" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-[10px] font-sans uppercase tracking-[0.16em] text-destructive mb-2">
                        Czerwone flagi
                      </p>
                      <h3 className="font-heading text-xl md:text-2xl text-foreground leading-snug mb-1.5">
                        Kiedy zgłosić się do lekarza?
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        Profilaktyka działa, gdy nie ma jeszcze powikłań. Poniższe objawy wymagają
                        konsultacji proktologicznej (24–72 h) — nie diagnozuj samodzielnie.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-5">
                    {[
                      "Krwawienie z odbytu — zwłaszcza ciemna krew, skrzepy, krew zmieszana ze stolcem lub utrzymujące się >2 tygodni.",
                      "Zmiana rytmu wypróżnień >6 tygodni (naprzemienne biegunki/zaparcia, uczucie niepełnego wypróżnienia).",
                      "Silny, narastający ból odbytu, gorączka, dreszcze — możliwy ropień okołoodbytniczy (stan nagły).",
                      "Guzek przy odbycie, który nie cofa się ani nie znika w ciągu 7 dni mimo leczenia zachowawczego.",
                      "Niewyjaśniona utrata wagi, niedokrwistość, wiek >45 lat lub wywiad rodzinny raka jelita.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm md:text-base text-foreground/90 leading-relaxed">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2.5 font-sans">
                      Wybrane referencje EBM
                    </p>
                    <ul className="space-y-1.5">
                      {[
                        {
                          label: "USMSTF 2017 — Colorectal Cancer Screening (Rex et al.)",
                          url: "https://pubmed.ncbi.nlm.nih.gov/28600072/",
                        },
                        {
                          label: "NICE NG12 — Suspected cancer: recognition and referral",
                          url: "https://www.nice.org.uk/guidance/ng12",
                        },
                        {
                          label: "ASCRS 2018 — Hemorrhoid Management Guidelines (Davis et al.)",
                          url: "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx",
                        },
                        {
                          label: "Pełna kategoria: Diagnostyka różnicowa — bibliografia EBM",
                          url: "#ebm-diagnosis",
                          internal: true,
                        },
                      ].map((src, i) => (
                        <li key={i} className="text-xs md:text-sm">
                          <a
                            href={src.url}
                            {...(src.internal
                              ? {}
                              : { target: "_blank", rel: "noopener noreferrer" })}
                            className="text-primary hover:underline inline-flex items-start gap-1.5 leading-snug"
                          >
                            <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{src.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground italic mt-4">
                    W razie obfitego krwawienia, gorączki lub silnego narastającego bólu — zgłoś się
                    na SOR lub do izby przyjęć chirurgicznej.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quiz CTA — bridge between risk factors / prevention and bibliography */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mb-12 md:mb-16"
            aria-label="Quiz ryzyka hemoroidów"
          >
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/40 to-background/40 p-6 sm:p-8">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden="true" />
              <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-sans uppercase tracking-[0.16em] text-primary mb-2">
                    Sprawdź siebie
                  </p>
                  <h3 className="font-heading text-xl md:text-2xl text-foreground leading-snug mb-1.5">
                    Twoje czynniki ryzyka — w 9 pytaniach
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                    Przełóż wiedzę z tej sekcji na swój styl życia. Quiz oparty na ASCRS / ESCP
                    oszacuje Twoje ryzyko i podpowie konkretne kroki profilaktyczne.
                  </p>
                </div>
                <Button variant="hero" size="lg" asChild className="shrink-0 w-full md:w-auto">
                  <Link to="/dla-pacjenta/quiz-hemoroidy">
                    Zrób quiz ryzyka hemoroidów
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.aside>

          {/* Full bibliography */}
          <div className="mb-20" id="bibliografia">
            <EBMSourcesSection
              title="Pełna bibliografia EBM"
              subtitle="22 recenzowane referencje w 8 kategoriach — wytyczne, meta-analizy Cochrane i RCT z PubMed. Z możliwością pobrania PDF."
            />
          </div>

          {/* Related links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto"
          >
            <Link
              to="/dla-pacjenta/quiz-hemoroidy"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <Sparkles className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Test ryzyka — 9 pytań
              </p>
              <p className="text-xs text-muted-foreground">
                Sprawdź swoje ryzyko w minutę i otrzymaj dopasowane zalecenia.
              </p>
            </Link>
            <Link
              to="/dla-pacjenta/hemoroidy"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <ClipboardList className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Hemoroidy od A do Z
              </p>
              <p className="text-xs text-muted-foreground">
                Pełny przewodnik EBM po objawach, stopniach i metodach leczenia.
              </p>
            </Link>
            <Link
              to="/leczenie/lhp"
              className="group rounded-xl border border-border bg-background/40 hover:bg-primary/5 hover:border-primary/40 p-5 transition-all"
            >
              <Stethoscope className="w-5 h-5 text-primary mb-2.5" />
              <p className="font-heading text-foreground mb-1 group-hover:text-primary transition-colors">
                Leczenie laserowe LHP
              </p>
              <p className="text-xs text-muted-foreground">
                Małoinwazyjna metoda — 90–95% skuteczności, powrót do pracy w 3–7 dni.
              </p>
            </Link>
          </motion.div>
          <RelatedLinks path="/dla-pacjenta/ebm-hemoroidy" />
        </div>
      </section>
    </>
  );
};

export default EbmHemoroidy;
