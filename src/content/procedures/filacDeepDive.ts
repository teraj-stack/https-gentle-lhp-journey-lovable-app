import type { ProcedureDeepDiveContent } from "@/components/shared/ProcedureDeepDive";

export const filacDeepDive: ProcedureDeepDiveContent = {
  intro:
    "Przetoka odbytu to nieprawidłowy kanał łączący wnętrze kanału odbytu ze skórą okolicy okołoodbytniczej — najczęściej powstaje jako następstwo przebytego ropnia okołoodbytniczego. FiLaC (Fistula Laser Closure) polega na kontrolowanym zamknięciu tego kanału energią lasera diodowego 1470 nm podawaną przez cienki, elastyczny światłowód. Kluczowa różnica wobec klasycznej fistulotomii: nie przecinamy mięśni zwieraczy, więc ryzyko trwałych zaburzeń trzymania stolca i gazów jest minimalne.",
  steps: [
    {
      title: "Kwalifikacja i mapowanie przetoki",
      body:
        "Przed zabiegiem wykonujemy badanie proktologiczne oraz diagnostykę obrazową — USG transrektalne (endosonografia) lub MRI miednicy. Celem jest precyzyjne określenie przebiegu kanału, lokalizacji ujścia wewnętrznego, liczby odgałęzień oraz stosunku przetoki do zwieraczy (klasyfikacja Parksa). Bez tego etapu ryzyko nawrotu istotnie rośnie — to najczęstsza przyczyna niepowodzeń leczenia przetok.",
    },
    {
      title: "Przygotowanie i znieczulenie",
      body:
        "Zabieg jest ambulatoryjny. Stosujemy znieczulenie miejscowe, podpajęczynówkowe lub krótkie dożylne — dobór zależy od złożoności przetoki i preferencji pacjenta. Nie jest wymagane pełne oczyszczanie jelita; zwykle wystarcza lekka dieta w dniu poprzedzającym i wlewka doodbytnicza rano.",
    },
    {
      title: "Oczyszczenie kanału przetoki",
      body:
        "Kanał zostaje delikatnie zgłębnikowany i oczyszczony z ziarniny oraz treści zapalnej (kiretaż). Usunięcie nabłonka i ziarniny jest warunkiem trwałego zrośnięcia ścian kanału — sam laser bez prawidłowego oczyszczenia daje gorsze wyniki.",
    },
    {
      title: "Zaopatrzenie ujścia wewnętrznego",
      body:
        "Ujście wewnętrzne (w kanale odbytu) zamykamy szwem lub — zależnie od anatomii — płatem śluzówkowym. Ten krok odcina stałe zanieczyszczanie kanału treścią jelitową i zwiększa skuteczność metody o kilkanaście punktów procentowych w porównaniu z samym zamknięciem laserowym.",
    },
    {
      title: "Ablacja laserowa 1470 nm",
      body:
        "Do kanału wprowadzamy światłowód z emisją radialną. Energia (zwykle 8–13 W, 100–120 J na centymetr kanału) podawana jest podczas równomiernego wycofywania włókna. Ciepło obkurcza kolagen ściany przetoki i wywołuje kontrolowaną martwicę nabłonka wyściełającego kanał, który następnie zarasta tkanką łączną.",
    },
    {
      title: "Zakończenie i wypis",
      body:
        "Zabieg trwa 30–60 minut. Nie zakładamy rozległych ran ani setonów tnących. Po 1–2 godzinach obserwacji pacjent wraca do domu z zaleceniami, receptą na leki przeciwbólowe i terminem pierwszej kontroli.",
    },
  ],
  recoveryIntro:
    "Brak rozcinania zwieraczy i brak dużej rany otwartej to główny powód, dla którego rekonwalescencja po FiLaC jest nieporównywalnie łagodniejsza niż po klasycznej fistulotomii, gdzie gojenie rany otwartej trwa 6–12 tygodni.",
  recoveryPoints: [
    {
      title: "Pierwsze 48 godzin",
      body:
        "Dyskomfort oceniany zwykle na 2–4/10, kontrolowany paracetamolem lub NLPZ. Wskazane nasiadówki w letniej wodzie 2–3 razy dziennie i chłodne okłady. Nie zaleca się leżenia w łóżku — krótkie spacery zmniejszają obrzęk.",
    },
    {
      title: "Pierwsze wypróżnienie",
      body:
        "Powinno nastąpić w ciągu 24–48 godzin. Stosujemy środki zmiękczające stolec (np. makrogole) i dietę bogatobłonnikową z 2–2,5 l płynów dziennie. Twardy stolec i parcie to najczęstsze przyczyny bólu w tym okresie.",
    },
    {
      title: "Powrót do pracy",
      body:
        "Praca biurowa: zwykle 3–5 dni. Praca fizyczna i długie prowadzenie samochodu: 10–14 dni. Warto zabrać poduszkę odciążającą okolicę krocza.",
    },
    {
      title: "Aktywność fizyczna",
      body:
        "Spacery od pierwszego dnia, lekki wysiłek po 2 tygodniach, sport, basen i podnoszenie ciężarów po 4–6 tygodniach — po potwierdzeniu wygojenia podczas kontroli.",
    },
    {
      title: "Wydzielina i gojenie",
      body:
        "Przez 2–4 tygodnie może utrzymywać się skąpy surowiczy lub podbarwiony krwią wyciek. To normalny element gojenia kanału. Niepokojące są: narastający ból, gorączka, obrzęk i wyciek ropny — wymagają pilnego kontaktu.",
    },
    {
      title: "Kontrole",
      body:
        "Pierwsza kontrola po 7–14 dniach, kolejne co 4–6 tygodni do pełnego wygojenia. W CML wszystkie wizyty kontrolne do czasu wygojenia zawarte są w cenie zabiegu.",
    },
  ],
  outcomesIntro:
    "Skuteczność leczenia przetok zależy przede wszystkim od ich typu. Przetoki proste (podskórne, międzyzwieraczowe niskie) goją się znacznie lepiej niż złożone, wysokie czy nawrotowe. Poniższe liczby pochodzą z opublikowanych serii klinicznych i metaanaliz dotyczących FiLaC.",
  stats: [
    { value: "70–85%", label: "Wygojenie pierwotne", source: "Zbiorcze dane dla przetok kryptogennych" },
    { value: ">90%", label: "Zachowanie pełnej kontynencji", source: "Brak przecinania zwieraczy" },
    { value: "30–60 min", label: "Czas zabiegu", source: "Tryb ambulatoryjny" },
    { value: "3–5 dni", label: "Powrót do pracy biurowej", source: "vs 3–6 tygodni po fistulotomii" },
  ],
  outcomesNote:
    "Istotna zaleta metody: FiLaC można bezpiecznie powtórzyć. W razie braku wygojenia po pierwszym zabiegu kolejna procedura nie jest ograniczona wcześniejszym uszkodzeniem zwieraczy, a łączna skuteczność po drugim zabiegu sięga w publikowanych seriach 80–90%. Dla porównania klasyczna fistulotomia daje wyższy odsetek wygojeń (ok. 90–95%), ale wiąże się z ryzykiem zaburzeń trzymania gazów sięgającym kilkunastu procent w przetokach wysokich — to koszt, którego większość pacjentów świadomie unika.",
  contraindicationsAbsolute: [
    "Aktywny, niezdrenowany ropień okołoodbytniczy — najpierw konieczny drenaż",
    "Aktywna, ciężka postać choroby Leśniowskiego-Crohna w okolicy odbytu bez leczenia biologicznego",
    "Podejrzenie procesu nowotworowego w obrębie przetoki lub kanału odbytu",
    "Nieleczone ciężkie zaburzenia krzepnięcia",
  ],
  contraindicationsRelative: [
    "Przetoki bardzo rozgałęzione, podkowiaste lub z mnogimi ujściami — często wymagają etapowego leczenia z setonem",
    "Niewykryte ujście wewnętrzne — bez jego zamknięcia skuteczność znacząco spada",
    "Ciąża i połóg (odroczenie zabiegu)",
    "Niewyrównana cukrzyca, immunosupresja, nikotynizm — pogarszają gojenie",
    "Otyłość olbrzymia utrudniająca dostęp i pielęgnację okolicy",
  ],
  complications: [
    {
      title: "Nawrót przetoki (15–30%)",
      body:
        "Najczęstsze zdarzenie niepożądane, zwykle w ciągu pierwszych 6–12 miesięcy. Objawia się ponownym wyciekiem. Postępowanie: powtórzenie FiLaC lub inna technika oszczędzająca zwieracze.",
    },
    {
      title: "Ropień w miejscu po przetoce (do kilku %)",
      body:
        "Zamknięcie ujścia zewnętrznego przed wygojeniem kanału może prowadzić do gromadzenia wydzieliny. Wymaga drenażu — objawy to narastający ból, obrzęk i gorączka.",
    },
    {
      title: "Przejściowy wyciek surowiczy",
      body:
        "Typowy przez 2–4 tygodnie. Nie jest powikłaniem, lecz elementem gojenia; ustępuje samoistnie.",
    },
    {
      title: "Zaburzenia kontynencji (rzadko, <5%)",
      body:
        "Zwykle przejściowe i dotyczą gazów. Ryzyko jest wielokrotnie niższe niż po fistulotomii, ponieważ mięśnie zwieraczy pozostają nienaruszone.",
    },
    {
      title: "Ból pooperacyjny",
      body:
        "Zazwyczaj 2–4/10, największy w pierwszych 48 godzinach i przy pierwszym wypróżnieniu. Kontrolowany standardowymi lekami doustnymi.",
    },
    {
      title: "Krwawienie",
      body:
        "Niewielkie plamienie jest normą. Obfite krwawienie występuje bardzo rzadko i wymaga kontaktu z lekarzem.",
    },
  ],
  comparisonIntro:
    "Nie istnieje jedna metoda idealna dla każdej przetoki. Wybór to zawsze kompromis między szansą na wygojenie a ryzykiem uszkodzenia zwieraczy. Poniżej najczęściej rozważane opcje.",
  comparison: [
    {
      method: "FiLaC (laser 1470 nm)",
      effectiveness: "70–85% (do 90% po powtórzeniu)",
      invasiveness: "Minimalna, bez przecinania zwieraczy",
      recovery: "3–5 dni",
      note: "Metoda z wyboru w przetokach wysokich i u pacjentów z ryzykiem nietrzymania.",
    },
    {
      method: "Fistulotomia klasyczna",
      effectiveness: "90–95%",
      invasiveness: "Wysoka — przecięcie części zwieracza",
      recovery: "3–6 tygodni (rana otwarta)",
      note: "Bardzo skuteczna w przetokach niskich; w wysokich ryzyko nietrzymania nawet kilkanaście procent.",
    },
    {
      method: "Seton (nić drenująca)",
      effectiveness: "Etap przygotowawczy, nie leczenie docelowe",
      invasiveness: "Niska",
      recovery: "Nić utrzymywana tygodniami/miesiącami",
      note: "Kontroluje zapalenie i przygotowuje kanał przed FiLaC lub inną metodą.",
    },
    {
      method: "LIFT",
      effectiveness: "60–75%",
      invasiveness: "Umiarkowana — nacięcie w przestrzeni międzyzwieraczowej",
      recovery: "2–3 tygodnie",
      note: "Dobra opcja w przetokach przezzwieraczowych; wymaga wygodnego dostępu chirurgicznego.",
    },
    {
      method: "Płat przesunięty (advancement flap)",
      effectiveness: "60–80%",
      invasiveness: "Wysoka — plastyka śluzówkowa",
      recovery: "3–4 tygodnie",
      note: "Stosowany w przetokach nawrotowych; obarczony ryzykiem niepowodzenia płata.",
    },
    {
      method: "Klej fibrynowy / plug",
      effectiveness: "30–60%",
      invasiveness: "Bardzo niska",
      recovery: "Kilka dni",
      note: "Nieinwazyjny, ale najniższa trwałość efektu — dziś rzadziej rekomendowany.",
    },
  ],
  comparisonNote:
    "Ostateczna decyzja zapada po obrazowaniu i rozmowie z pacjentem. W CML priorytetem jest zachowanie funkcji zwieraczy — dlatego w przetokach wysokich i nawrotowych zaczynamy od technik oszczędzających, takich jak FiLaC, zachowując bardziej inwazyjne opcje jako rozwiązanie zapasowe.",
};
