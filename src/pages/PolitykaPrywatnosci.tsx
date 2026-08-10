import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import SeoHead from "@/components/shared/SeoHead";

const PolitykaPrywatnosci = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="Polityka prywatności | CML Centrum Medycyny Laserowej"
      description="Jak CML przetwarza dane osobowe pacjentów zgodnie z RODO: cele, podstawy prawne, okresy przechowywania, pliki cookie i Twoje prawa. Sprawdź szczegóły."
      path="/polityka-prywatnosci"
    />
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
      <Breadcrumbs items={BREADCRUMBS_MAP["/polityka-prywatnosci"]} />

      <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-8 mb-10">
        Polityka prywatności
      </h1>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Administrator danych</h2>
          <p>
            Administratorem Państwa danych osobowych jest Centrum Medycyny Laserowej (CML),
            z&nbsp;siedzibą w&nbsp;Warszawie, ul.&nbsp;[adres do uzupełnienia], NIP:&nbsp;[do uzupełnienia]
            (dalej: „Administrator").
          </p>
          <p>
            Kontakt z&nbsp;Administratorem możliwy jest pod adresem e-mail:{" "}
            <a href="mailto:kontakt@cml.pl" className="text-primary hover:underline">kontakt@cml.pl</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Cele i&nbsp;podstawy przetwarzania</h2>
          <p>Państwa dane osobowe przetwarzane są w&nbsp;następujących celach:</p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>Realizacja umowy o&nbsp;świadczenie usług medycznych (art.&nbsp;6 ust.&nbsp;1 lit.&nbsp;b RODO)</li>
            <li>Prowadzenie dokumentacji medycznej (art.&nbsp;9 ust.&nbsp;2 lit.&nbsp;h RODO)</li>
            <li>Odpowiedź na zapytania i&nbsp;kontakt (art.&nbsp;6 ust.&nbsp;1 lit.&nbsp;f RODO — prawnie uzasadniony interes)</li>
            <li>Marketing usług własnych, w&nbsp;tym wysyłka newslettera (art.&nbsp;6 ust.&nbsp;1 lit.&nbsp;a RODO — zgoda)</li>
            <li>Wypełnianie obowiązków prawnych, np. podatkowych (art.&nbsp;6 ust.&nbsp;1 lit.&nbsp;c RODO)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Okres przechowywania danych</h2>
          <p>
            Dane osobowe przechowywane są przez okres niezbędny do realizacji celów, dla których zostały zebrane:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>Dokumentacja medyczna — 20 lat od końca roku kalendarzowego, w&nbsp;którym dokonano ostatniego wpisu</li>
            <li>Dane rozliczeniowe — 5 lat od końca roku podatkowego</li>
            <li>Dane marketingowe — do momentu wycofania zgody</li>
            <li>Dane kontaktowe — do czasu zakończenia korespondencji + 3 lata</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Prawa osób, których dane dotyczą</h2>
          <p>Przysługują Państwu następujące prawa:</p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>Prawo dostępu do treści swoich danych (art.&nbsp;15 RODO)</li>
            <li>Prawo do sprostowania danych (art.&nbsp;16 RODO)</li>
            <li>Prawo do usunięcia danych — „prawo do bycia zapomnianym" (art.&nbsp;17 RODO)</li>
            <li>Prawo do ograniczenia przetwarzania (art.&nbsp;18 RODO)</li>
            <li>Prawo do przenoszenia danych (art.&nbsp;20 RODO)</li>
            <li>Prawo do sprzeciwu (art.&nbsp;21 RODO)</li>
            <li>Prawo do cofnięcia zgody w&nbsp;dowolnym momencie (art.&nbsp;7 ust.&nbsp;3 RODO)</li>
            <li>Prawo do wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Odbiorcy danych</h2>
          <p>
            Państwa dane mogą być przekazywane podmiotom przetwarzającym dane na zlecenie Administratora,
            w&nbsp;tym dostawcom usług IT, hostingu, systemów do zarządzania placówką medyczną,
            a&nbsp;także podmiotom uprawnionym na podstawie przepisów prawa (np. NFZ, organy podatkowe).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Pliki cookies</h2>
          <p>
            Strona internetowa CML wykorzystuje pliki cookies w&nbsp;celu zapewnienia prawidłowego
            działania serwisu, analizy ruchu oraz dostosowania treści. Szczegółowe informacje:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li><strong className="text-foreground">Niezbędne</strong> — wymagane do funkcjonowania strony, nie wymagają zgody</li>
            <li><strong className="text-foreground">Analityczne</strong> — pomagają zrozumieć, jak użytkownicy korzystają ze strony (np. Google Analytics)</li>
            <li><strong className="text-foreground">Marketingowe</strong> — używane do personalizacji reklam</li>
          </ul>
          <p className="mt-3">
            Mogą Państwo zarządzać ustawieniami cookies w&nbsp;przeglądarce internetowej.
            Zablokowanie niektórych cookies może wpłynąć na funkcjonalność strony.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Bezpieczeństwo danych</h2>
          <p>
            Administrator stosuje odpowiednie środki techniczne i&nbsp;organizacyjne zapewniające
            ochronę danych osobowych, w&nbsp;tym szyfrowanie połączenia (SSL/TLS), kontrolę dostępu
            oraz regularne audyty bezpieczeństwa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Kontakt</h2>
          <p>
            W sprawach związanych z&nbsp;ochroną danych osobowych prosimy o&nbsp;kontakt:{" "}
            <a href="mailto:kontakt@cml.pl" className="text-primary hover:underline">kontakt@cml.pl</a>.
          </p>
        </section>

        <p className="text-xs text-muted-foreground/50 pt-4 border-t border-border">
          Ostatnia aktualizacja: marzec 2026
        </p>
      </div>
    </div>
  </div>
);

export default PolitykaPrywatnosci;
