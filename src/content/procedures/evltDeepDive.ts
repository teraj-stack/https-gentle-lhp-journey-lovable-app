import type { ProcedureDeepDiveContent } from "@/components/shared/ProcedureDeepDive";

export const evltDeepDive: ProcedureDeepDiveContent = {
  intro:
    "Żylaki kończyn dolnych to objaw przewlekłej niewydolności żylnej — krew, zamiast płynąć ku sercu, cofa się przez niewydolne zastawki i zalega w żyłach powierzchownych. EVLT (endowenozna ablacja laserowa) polega na zamknięciu chorego pnia żylnego od wewnątrz energią lasera podawaną przez światłowód wprowadzony przez pojedyncze nakłucie skóry. Metoda zastąpiła klasyczne „strippingu” jako standard w wytycznych europejskich i amerykańskich dzięki porównywalnej skuteczności przy znacznie mniejszej urazowości.",
  steps: [
    {
      title: "Konsultacja i mapowanie USG Doppler",
      body:
        "Podstawą kwalifikacji jest badanie USG Doppler w pozycji stojącej. Oceniamy kierunek i czas refluksu, średnicę żyły odpiszczelowej lub odstrzałkowej, obecność perforatorów oraz drożność układu głębokiego. To badanie decyduje o tym, które odcinki żył zostaną zamknięte i jaką energię zaplanujemy — bez niego zabieg jest leczeniem „na ślepo”.",
    },
    {
      title: "Znieczulenie tumescencyjne",
      body:
        "Nie stosujemy znieczulenia ogólnego. Wokół żyły, pod kontrolą USG, podajemy rozcieńczony roztwór znieczulający (tumescencja). Pełni on trzy funkcje: znieczula, obkurcza żyłę wokół światłowodu i tworzy warstwę ochronną chroniącą skórę oraz nerwy przed ciepłem.",
    },
    {
      title: "Wprowadzenie światłowodu",
      body:
        "Przez nakłucie igłą (technika Seldingera) zakładamy cienką koszulkę naczyniową i wprowadzamy światłowód, kierując jego końcówkę pod kontrolą USG 2 cm poniżej ujścia odpiszczelowo-udowego. Nie ma nacięć chirurgicznych ani szwów.",
    },
    {
      title: "Ablacja laserowa",
      body:
        "Podczas równomiernego wycofywania włókna podajemy energię (zwykle 60–80 J/cm dla żyły odpiszczelowej, długość fali 1470 nm z emisją radialną). Ciepło uszkadza śródbłonek i obkurcza kolagen ściany, co prowadzi do trwałego zwłóknienia i zamknięcia naczynia. Krew natychmiast przekierowuje się do zdrowych żył głębokich.",
    },
    {
      title: "Zaopatrzenie dopływów",
      body:
        "W tej samej sesji często wykonujemy miniflebektomię (usunięcie poszerzonych dopływów przez nakłucia 1–2 mm) lub skleroterapię piankową. Dzięki temu efekt czynnościowy i estetyczny jest widoczny szybciej.",
    },
    {
      title: "Kompresja i wypis",
      body:
        "Zakładamy pończochę uciskową II klasy. Pacjent chodzi bezpośrednio po zabiegu i wraca do domu tego samego dnia. Zabieg trwa od 40 minut do 2,5 godziny zależnie od zakresu.",
    },
  ],
  recoveryIntro:
    "EVLT to zabieg jednego dnia — nie wymaga hospitalizacji ani zwolnienia lekarskiego u większości pacjentów pracujących biurowo. Kluczowe dla dobrego wyniku są dwa elementy: konsekwentna kompresja i codzienny ruch.",
  recoveryPoints: [
    {
      title: "Pierwsza doba",
      body:
        "Zalecamy 30–40 minut spaceru jeszcze w dniu zabiegu i unikanie długiego stania czy siedzenia bez ruchu. Pończochę nosi się przez pierwsze 24–48 godzin bez zdejmowania.",
    },
    {
      title: "Kompresja",
      body:
        "Pończocha uciskowa II klasy przez ok. 2 tygodnie w ciągu dnia. Kompresja zmniejsza obrzęk, zasinienia i ryzyko powikłań zakrzepowych, a także poprawia komfort.",
    },
    {
      title: "Powrót do pracy",
      body:
        "Praca biurowa: następnego dnia lub po 1–2 dniach. Praca fizyczna: 5–7 dni. Prowadzenie samochodu: zwykle już następnego dnia.",
    },
    {
      title: "Typowe dolegliwości",
      body:
        "Uczucie ciągnięcia wzdłuż zamkniętej żyły nasilające się w 5.–10. dobie (obkurczanie zwłókniałego naczynia), zasinienia i tkliwość. Ustępują w ciągu 2–4 tygodni; pomagają NLPZ i ruch.",
    },
    {
      title: "Czego unikać",
      body:
        "Przez 2–4 tygodnie: sauna, gorące kąpiele, solarium, intensywny trening siłowy i długie loty bez profilaktyki przeciwzakrzepowej.",
    },
    {
      title: "Kontrole USG",
      body:
        "Pierwsze USG kontrolne po 1–2 tygodniach (potwierdzenie zamknięcia żyły i wykluczenie zakrzepicy), kolejne po 3 i 12 miesiącach. W CML wizyty kontrolne do wygojenia są w cenie zabiegu.",
    },
  ],
  outcomesIntro:
    "EVLT należy do najlepiej udokumentowanych metod flebologicznych. Poniższe dane pochodzą z randomizowanych badań i długoterminowych obserwacji porównujących ablację termiczną z chirurgią klasyczną i skleroterapią.",
  stats: [
    { value: "95–98%", label: "Zamknięcie żyły po roku", source: "Ablacja termiczna 1470 nm" },
    { value: "~90%", label: "Trwałość efektu po 5 latach", source: "Obserwacje długoterminowe" },
    { value: "1 dzień", label: "Powrót do pracy biurowej", source: "vs 2–3 tygodnie po strippingu" },
    { value: "<1%", label: "Ryzyko powikłań zakrzepowych", source: "Przy prawidłowej kompresji i ruchu" },
  ],
  outcomesNote:
    "Warto rozdzielić dwa pojęcia: „nawrót żylaków” to nie to samo co „otwarcie się zamkniętej żyły”. Zamknięty laserem pień pozostaje zamknięty u ok. 9 na 10 pacjentów po 5 latach, ale choroba żylna jest postępująca — z czasem niewydolność może pojawić się w innych, wcześniej zdrowych naczyniach. Dlatego zalecamy kontrolne USG raz na 1–2 lata oraz profilaktykę: ruch, kompresja przy długim staniu, kontrola masy ciała.",
  contraindicationsAbsolute: [
    "Zakrzepica żył głębokich w fazie ostrej",
    "Niedrożność układu żył głębokich (żyły powierzchowne pełnią wtedy funkcję krążenia obocznego)",
    "Ciężkie niedokrwienie kończyny (choroba tętnic obwodowych)",
    "Ciąża",
    "Aktywne zakażenie skóry w okolicy planowanych nakłuć",
  ],
  contraindicationsRelative: [
    "Trombofilia i przebyta żylna choroba zakrzepowo-zatorowa — wymagają profilaktyki przeciwkrzepliwej",
    "Bardzo duża średnica żyły (>2 cm) lub silnie kręty przebieg naczynia",
    "Znaczna otyłość utrudniająca kompresję i obrazowanie",
    "Unieruchomienie, brak możliwości chodzenia po zabiegu",
    "Owrzodzenie żylne — nie wyklucza zabiegu, ale zmienia plan leczenia i pielęgnacji",
  ],
  complications: [
    {
      title: "Zasinienia i tkliwość (bardzo częste)",
      body:
        "Efekt tumescencji i obkurczania żyły. Ustępują samoistnie w 2–4 tygodnie. Nie są powikłaniem w sensie klinicznym.",
    },
    {
      title: "Zapalenie zakrzepowe żył powierzchownych (kilka %)",
      body:
        "Bolesne, zaczerwienione zgrubienie wzdłuż naczynia. Leczenie: NLPZ, kompresja, ruch, czasem heparyna drobnocząsteczkowa.",
    },
    {
      title: "EHIT / zakrzepica żył głębokich (<1%)",
      body:
        "Przejście zakrzepu do układu głębokiego. Wykrywane w kontrolnym USG — to główny powód, dla którego badanie po 1–2 tygodniach jest obowiązkowe.",
    },
    {
      title: "Parestezje (1–5%)",
      body:
        "Mrowienie lub drętwienie skóry przy podrażnieniu nerwu odpiszczelowego lub łydkowego. Zwykle przemijające w ciągu kilku tygodni do kilku miesięcy.",
    },
    {
      title: "Przebarwienia skóry",
      body:
        "Częściej po skleroterapii dopływów niż po samej ablacji. Blakną w ciągu 6–12 miesięcy.",
    },
    {
      title: "Rekanalizacja żyły (5–10% w 5 lat)",
      body:
        "Ponowne otwarcie zamkniętego naczynia. W razie objawów możliwa powtórna ablacja lub skleroterapia.",
    },
  ],
  comparisonIntro:
    "Dobór metody zależy od średnicy i przebiegu żyły, nasilenia objawów oraz stopnia CEAP. Często najlepsze wyniki daje leczenie hybrydowe — ablacja pnia plus skleroterapia lub miniflebektomia dopływów.",
  comparison: [
    {
      method: "EVLT (laser wewnątrzżylny)",
      effectiveness: "95–98% w 1. roku, ~90% w 5 lat",
      invasiveness: "Nakłucie, znieczulenie miejscowe",
      recovery: "1–2 dni",
      note: "Standard leczenia niewydolności pnia odpiszczelowego i odstrzałkowej.",
    },
    {
      method: "RFA (ablacja falami radiowymi)",
      effectiveness: "Porównywalna z EVLT",
      invasiveness: "Nakłucie, znieczulenie miejscowe",
      recovery: "1–2 dni",
      note: "Nieco mniej zasinień w pierwszych dniach, podobne wyniki odległe.",
    },
    {
      method: "Skleroterapia piankowa",
      effectiveness: "70–80% dla drobnych naczyń, niższa dla pni",
      invasiveness: "Sam zastrzyk, bez znieczulenia",
      recovery: "Natychmiastowy",
      note: "Świetna do dopływów, pajączków i uzupełnienia po EVLT; słabsza jako leczenie dużych pni.",
    },
    {
      method: "Miniflebektomia",
      effectiveness: "Wysoka dla wybranych żylaków",
      invasiveness: "Nakłucia 1–2 mm",
      recovery: "2–5 dni",
      note: "Usuwa widoczne, wypukłe dopływy — najczęściej łączona z EVLT w jednej sesji.",
    },
    {
      method: "Stripping (chirurgia klasyczna)",
      effectiveness: "Wysoka, porównywalna",
      invasiveness: "Nacięcia, zwykle znieczulenie ogólne/podpajęczynówkowe",
      recovery: "2–3 tygodnie",
      note: "Dziś rezerwowany dla wybranych przypadków; więcej bólu i zwolnienia.",
    },
    {
      method: "Klej cyjanoakrylowy",
      effectiveness: "Zbliżona do EVLT",
      invasiveness: "Bez tumescencji, bez kompresji",
      recovery: "Natychmiastowy",
      note: "Wygodny, ale droższy i z ryzykiem reakcji na materiał pozostający w żyle.",
    },
  ],
  comparisonNote:
    "Skleroterapia nie jest „słabszą wersją EVLT” — to metoda o innym przeznaczeniu. Leczenie samych pajączków bez zamknięcia niewydolnego pnia kończy się szybkim nawrotem, dlatego zawsze zaczynamy od USG i naprawy przyczyny, a dopiero potem zajmujemy się efektem estetycznym.",
};
