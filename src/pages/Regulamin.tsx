import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";

const Regulamin = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Regulamin usług | CML Centrum Medycyny Laserowej"
      description="Warunki świadczenia usług medycznych w CML: zasady umawiania i odwoływania wizyt, płatności, reklamacje oraz prawa pacjenta. Zapoznaj się przed wizytą."
      path="/regulamin"
    />
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
      <Breadcrumbs items={BREADCRUMBS_MAP["/regulamin"]} />

      <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-8 mb-10">
        Regulamin
      </h1>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Postanowienia ogólne</h2>
          <p>
            Niniejszy regulamin określa zasady korzystania z&nbsp;serwisu internetowego oraz usług
            świadczonych przez Centrum Medycyny Laserowej (CML), z&nbsp;siedzibą w&nbsp;Warszawie
            (dalej: „Usługodawca").
          </p>
          <p>
            Korzystanie z&nbsp;serwisu oznacza akceptację niniejszego regulaminu.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Definicje</h2>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li><strong className="text-foreground">Serwis</strong> — strona internetowa dostępna pod adresem cml.pl</li>
            <li><strong className="text-foreground">Pacjent</strong> — osoba fizyczna korzystająca z&nbsp;usług medycznych CML</li>
            <li><strong className="text-foreground">Usługi</strong> — świadczenia zdrowotne z&nbsp;zakresu proktologii i&nbsp;flebologii</li>
            <li><strong className="text-foreground">Konsultacja</strong> — wizyta lekarska, w&nbsp;tym badanie i&nbsp;omówienie planu leczenia</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Zakres usług</h2>
          <p>
            CML świadczy usługi medyczne w&nbsp;zakresie proktologii laserowej i&nbsp;flebologii,
            obejmujące m.in.:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>Konsultacje lekarskie i&nbsp;diagnostykę</li>
            <li>Zabiegi laserowe (LHP, FiLaC, SiLaC, EVLT)</li>
            <li>Skleroterapię i&nbsp;CLaCS</li>
            <li>Plastykę i&nbsp;estetykę proktologiczną</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Umawianie wizyt</h2>
          <p>
            Wizyty umawiane są telefonicznie, mailowo lub za pośrednictwem formularza kontaktowego
            na stronie. Potwierdzenie wizyty następuje drogą telefoniczną lub SMS.
          </p>
          <p>
            Pacjent zobowiązany jest do odwołania wizyty co najmniej 24 godziny przed wyznaczonym terminem.
            W&nbsp;przypadku nieodwołania wizyty Usługodawca zastrzega sobie prawo do naliczenia opłaty
            za nieobecność.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Odpowiedzialność</h2>
          <p>
            Treści zamieszczone w&nbsp;serwisie mają charakter informacyjny i&nbsp;edukacyjny.
            Nie stanowią porady medycznej ani nie zastępują konsultacji lekarskiej.
          </p>
          <p>
            Usługodawca dokłada wszelkich starań, aby informacje zawarte w&nbsp;serwisie były
            aktualne i&nbsp;rzetelne, jednak nie ponosi odpowiedzialności za decyzje podjęte
            na ich podstawie bez konsultacji z&nbsp;lekarzem.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Prawa autorskie</h2>
          <p>
            Wszelkie treści zamieszczone w&nbsp;serwisie, w&nbsp;tym teksty, grafiki, zdjęcia
            i&nbsp;materiały wideo, stanowią własność Usługodawcy lub zostały wykorzystane
            za zgodą właścicieli praw autorskich. Kopiowanie, rozpowszechnianie lub wykorzystywanie
            materiałów bez pisemnej zgody jest zabronione.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Reklamacje</h2>
          <p>
            Reklamacje dotyczące funkcjonowania serwisu lub świadczonych usług można składać
            na adres e-mail:{" "}
            <a href="mailto:kontakt@cml.pl" className="text-primary hover:underline">kontakt@cml.pl</a>.
          </p>
          <p>
            Reklamacja zostanie rozpatrzona w&nbsp;terminie 14 dni od dnia jej otrzymania.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Postanowienia końcowe</h2>
          <p>
            Usługodawca zastrzega sobie prawo do zmiany niniejszego regulaminu.
            Zmiany wchodzą w&nbsp;życie z&nbsp;dniem ich publikacji w&nbsp;serwisie.
          </p>
          <p>
            W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy
            prawa polskiego, w&nbsp;szczególności Kodeksu cywilnego oraz ustawy o&nbsp;prawach
            pacjenta i&nbsp;Rzeczniku Praw Pacjenta.
          </p>
        </section>

        <p className="text-xs text-muted-foreground/50 pt-4 border-t border-border">
          Ostatnia aktualizacja: marzec 2026
        </p>
      </div>
    </div>
  </div>
);

export default Regulamin;
