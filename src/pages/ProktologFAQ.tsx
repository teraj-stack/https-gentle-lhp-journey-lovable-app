import { motion } from "framer-motion";
import ParallaxSection from "@/components/ui/parallax-section";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, Baby, ShieldCheck, Stethoscope } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const qaItems = [
  {
    q: "Kiedy powinniśmy zgłosić się do lekarza i na jakie objawy zwrócić uwagę?",
    a: (
      <>
        <p className="mb-3">Do lekarza należy zgłosić się zawsze, gdy pojawią się niepokojące sygnały. Niestety, pacjenci często bagatelizują problem, nie zdając sobie sprawy, że choroby proktologiczne mają charakter <strong>przewlekły i postępujący</strong>. W przeciwieństwie do przeziębienia, które mija samoistnie, nieleczone hemoroidy będą się powiększać.</p>
        <p>Zasada jest prosta: <strong>im wcześniej zgłosisz się do specjalisty, tym leczenie będzie mniej obciążające, tańsze i skuteczniejsze.</strong> Zwlekanie prowadzi do zaostrzenia stanu i konieczności stosowania bardziej radykalnych metod.</p>
      </>
    ),
  },
  {
    q: "Jakie objawy powinny nas zaniepokoić?",
    a: (
      <>
        <p className="mb-3">Niezależnie od tego, czy jest to świąd, pieczenie, ból, czy wyczuwalny guzek – każda z tych dolegliwości wymaga konsultacji w poradni proktologicznej.</p>
        <div className="flex gap-3 items-start bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm"><strong>Sygnał alarmowy:</strong> Szczególnym sygnałem jest krwawienie podczas defekacji. Choć najczęściej przyczyną są hemoroidy, w pierwszej kolejności musimy wykluczyć choroby nowotworowe. Dlatego diagnostykę zaczynamy od dokładnego badania, a czasem zalecamy kolonoskopię.</p>
        </div>
      </>
    ),
  },
  {
    q: "Jak wygląda badanie proktologiczne? Czy boli?",
    a: (
      <>
        <p className="mb-3">To jedno z najczęstszych pytań. Badanie składa się z kilku etapów:</p>
        <ul className="space-y-2 mb-4 ml-1">
          <li className="flex gap-2 text-sm"><span className="text-primary font-bold">1.</span><span><strong>Ocena wzrokowa:</strong> Lekarz ogląda skórę wokół odbytu, szukając stanów zapalnych, zakrzepicy czy przetok.</span></li>
          <li className="flex gap-2 text-sm"><span className="text-primary font-bold">2.</span><span><strong>Badanie palpacyjne (per rectum):</strong> Ocena napięcia zwieraczy i sprawdzenie, czy w kanale odbytu nie ma guzów.</span></li>
          <li className="flex gap-2 text-sm"><span className="text-primary font-bold">3.</span><span><strong>Anoskopia:</strong> To kluczowy moment. Lekarz wprowadza krótki wziernik (anoskop), aby dokładnie obejrzeć wnętrze kanału odbytu. Bez tego nie da się precyzyjnie ocenić stopnia zaawansowania choroby.</span></li>
        </ul>
        <p><strong>Czy to boli?</strong> W naszej klinice dbamy o maksymalny komfort. Badanie wykonuje się w pozycjach najmniej krępujących dla pacjenta. Jeśli nie ma ostrego stanu zapalnego, badanie jest zazwyczaj bezbolesne. Jeśli pacjent zgłasza silny ból, modyfikujemy przebieg badania, by nie sprawiać cierpienia.</p>
      </>
    ),
  },
  {
    q: "Czym właściwie są hemoroidy?",
    a: (
      <p>To naturalne struktury anatomiczne, które ma każdy z nas! Działają jak „poduszeczki" uszczelniające kanał odbytu. Problem zaczyna się wtedy, gdy dochodzi do zastoju krwi. Pociągane przez masy kałowe guzki rozciągają się, powiększają i zaczynają wypadać na zewnątrz. W zaawansowanym stadium nie da się ich już ręcznie odprowadzić na miejsce.</p>
    ),
  },
  {
    q: "Jakie są obecnie najlepsze metody leczenia?",
    a: (
      <p>Nie ma jednej, uniwersalnej metody dla każdego. Wszystko zależy od anatomii, wielkości guzków i oczekiwań pacjenta. Obecnie <strong>„złotym standardem" jest leczenie hybrydowe</strong>, czyli łączenie kilku technik u jednego pacjenta (np. laseroterapia + gumkowanie). Pozwala to na zoptymalizowanie wyników przy minimalnej inwazyjności. Warto pytać lekarza o dostępne opcje – w nowoczesnej proktologii mamy szeroki wachlarz rozwiązań.</p>
    ),
  },
  {
    q: "Wiele osób wstydzi się wizyty. Co powiedziałby Pan pacjentom, którzy zwlekają latami?",
    a: (
      <p>Proktolog w ciągu jednego dnia przyjmuje kilkudziesięciu pacjentów z identycznym problemem. Dla nas to <strong>codzienność medyczna, nie temat tabu.</strong> Strach i wstyd są naturalne, ale najczęściej mijają już po pierwszych minutach rozmowy w gabinecie. Widząc profesjonalne i rzeczowe podejście lekarza, pacjenci szybko czują się swobodnie. Pamiętaj: lekarz jest po to, aby Ci pomóc i przeprowadzić Cię przez proces leczenia, a nie oceniać.</p>
    ),
  },
  {
    q: "Czy wyleczone hemoroidy mogą wrócić?",
    a: (
      <p>Choroba hemoroidalna ma podłoże genetyczne, a styl życia tylko przyspiesza jej ujawnienie. Zabieg usuwa przerośniętą tkankę, ale nie zmienia genów. Dlatego nawrót jest możliwy, ale zazwyczaj następuje dopiero <strong>po kilku lub kilkunastu latach</strong>. Odpowiednia profilaktyka może ten okres znacznie wydłużyć.</p>
    ),
  },
  {
    q: "Jak ustrzec się przed chorobą? Profilaktyka na co dzień",
    a: (
      <ul className="space-y-3">
        <li className="flex gap-2 text-sm"><span className="text-primary">•</span><span><strong>Dbaj o dietę i wagę:</strong> Otyłość i zaparcia to główni wrogowie.</span></li>
        <li className="flex gap-2 text-sm"><span className="text-primary">•</span><span><strong>Zmień nawyki toaletowe:</strong> Unikaj długiego przesiadywania na toalecie z telefonem!</span></li>
        <li className="flex gap-2 text-sm"><span className="text-primary">•</span><span><strong>Pozycja ma znaczenie:</strong> Fizjologicznie najlepszą pozycją do wypróżniania jest „kuczna". Warto w toalecie korzystać z podnóżka pod stopy – to ułatwia defekację i zmniejsza parcie na naczynia.</span></li>
      </ul>
    ),
  },
  {
    q: "Co z kobietami w ciąży?",
    a: (
      <p>Ciąża to czas burzy hormonalnej i zwiększonego ciśnienia w jamie brzusznej, co sprzyja powstawaniu hemoroidów. Zazwyczaj jednak po porodzie ciało wraca do normy. W ciąży unikamy zabiegów inwazyjnych, chyba że jest to bezwzględnie konieczne. Skupiamy się na <strong>łagodzeniu objawów i bezpieczeństwie mamy oraz dziecka</strong>.</p>
    ),
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  name: "Hemoroidy i wizyta u proktologa — najczęstsze pytania",
  url: "https://mcml.pro/dla-pacjenta/proktolog-faq",
  mainEntity: qaItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: typeof item.a === "string" ? item.a : item.q, // fallback; real text below
    },
  })),
};

// Build plain-text answers for JSON-LD from the JSX
const faqAnswerTexts: Record<number, string> = {
  0: "Do lekarza należy zgłosić się zawsze, gdy pojawią się niepokojące sygnały. Choroby proktologiczne mają charakter przewlekły i postępujący. Im wcześniej zgłosisz się do specjalisty, tym leczenie będzie mniej obciążające, tańsze i skuteczniejsze.",
  1: "Niezależnie od tego, czy jest to świąd, pieczenie, ból, czy wyczuwalny guzek – każda z tych dolegliwości wymaga konsultacji. Szczególnym sygnałem alarmowym jest krwawienie podczas defekacji.",
  2: "Badanie składa się z oceny wzrokowej, badania palpacyjnego (per rectum) oraz anoskopii. W naszej klinice dbamy o maksymalny komfort — badanie jest zazwyczaj bezbolesne.",
  3: "Hemoroidy to naturalne struktury anatomiczne działające jak poduszeczki uszczelniające kanał odbytu. Problem zaczyna się, gdy dochodzi do zastoju krwi i guzki się powiększają.",
  4: "Nie ma jednej uniwersalnej metody. Złotym standardem jest leczenie hybrydowe, czyli łączenie kilku technik u jednego pacjenta, np. laseroterapia + gumkowanie.",
  5: "Proktolog w ciągu jednego dnia przyjmuje kilkudziesięciu pacjentów z identycznym problemem. Strach i wstyd są naturalne, ale zazwyczaj mijają po pierwszych minutach rozmowy.",
  6: "Choroba hemoroidalna ma podłoże genetyczne. Zabieg usuwa przerośniętą tkankę, ale nawrót jest możliwy — zazwyczaj po kilku lub kilkunastu latach. Odpowiednia profilaktyka może ten okres wydłużyć.",
  7: "Dbaj o dietę i wagę, unikaj długiego przesiadywania na toalecie, korzystaj z podnóżka pod stopy — to ułatwia defekację i zmniejsza parcie na naczynia.",
  8: "Ciąża sprzyja powstawaniu hemoroidów. Po porodzie ciało zwykle wraca do normy. W ciąży unikamy zabiegów inwazyjnych, skupiamy się na łagodzeniu objawów.",
};

// Patch plain-text answers into the schema
faqSchema.mainEntity = qaItems.map((item, i) => ({
  "@type": "Question" as const,
  name: item.q,
  acceptedAnswer: {
    "@type": "Answer" as const,
    text: faqAnswerTexts[i] || item.q,
  },
}));

const ProktologFAQ = () => (
  <div className="min-h-screen bg-background pt-20">
    <SeoHead
      title="Jak przygotować się do wizyty u proktologa"
      description="Najczęstsze pytania o wizytę proktologiczną. Dowiedz się jak wygląda badanie, czym są hemoroidy i jakie są metody leczenia."
      path="/dla-pacjenta/proktolog-faq"
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
    <ParallaxSection className="gradient-bg py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl mx-auto text-center"
      >
        <div className="w-14 h-14 rounded-xl bg-primary-foreground/15 flex items-center justify-center mx-auto mb-6">
          <Stethoscope className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          Hemoroidy i wizyta u proktologa
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-primary-foreground/90 mb-4">
          Lekarz odpowiada na najczęstsze pytania
        </p>
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Wokół wizyty u proktologa narosło wiele mitów i obaw. Rozwiewamy wątpliwości, tłumaczymy jak wygląda badanie i dlaczego nie warto zwlekać z leczeniem.
        </p>
      </motion.div>
    </ParallaxSection>

    <div className="max-w-3xl mx-auto px-4 py-16 space-y-16">
      <Breadcrumbs items={BREADCRUMBS_MAP["/dla-pacjenta/proktolog-faq"]} className="mb-4" />

      {/* Key highlights */}
      <motion.div {...fadeUp} className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: ShieldCheck, title: "Bez tabu", desc: "Proktolog codziennie przyjmuje pacjentów z identycznym problemem" },
          { icon: Stethoscope, title: "Bezbolesne badanie", desc: "Komfort pacjenta jest priorytetem w każdym etapie" },
          { icon: Baby, title: "Także w ciąży", desc: "Bezpieczne podejście dla przyszłych mam" },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="glass-card rounded-xl p-5 text-center"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Q&A Accordion */}
      <motion.section {...fadeUp}>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
          Pytania i odpowiedzi
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Rozmowa z lekarzem — najważniejsze zagadnienia dotyczące hemoroidów, badania i leczenia
        </p>
        <Accordion type="single" collapsible className="space-y-3">
          {qaItems.map((item, i) => (
            <AccordionItem
              key={i}
              value={`qa-${i}`}
              className="glass-card rounded-xl border-none px-6"
            >
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary hover:no-underline py-5 text-left">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>

      {/* CTA */}
      <motion.section {...fadeUp} className="glass-card rounded-2xl p-8 md:p-12 text-center">
        <div className="text-4xl mb-4">🩺</div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Gotowy na konsultację?</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Przeczytałeś odpowiedzi na najczęstsze pytania? Umów się na niezobowiązującą konsultację. Lekarz oceni stopień zaawansowania i zaproponuje najlepszą metodę leczenia.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa" target="_blank" rel="noopener noreferrer">Umów się na konsultację</a>
        </Button>
      </motion.section>
    </div>
  </div>
);

export default ProktologFAQ;
