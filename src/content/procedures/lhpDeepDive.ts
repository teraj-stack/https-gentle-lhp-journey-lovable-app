import type { ProcedureDeepDiveContent } from "@/components/shared/ProcedureDeepDive";

export const lhpDeepDive: ProcedureDeepDiveContent = {
  intro:
    "Choroba hemoroidalna to nie „żylaki odbytu”, lecz przerost prawidłowych poduszeczek naczyniowych kanału odbytu, które w warunkach zdrowia współodpowiadają za trzymanie gazów i stolca. Dlatego celem nowoczesnego leczenia nie jest ich wycięcie, ale zmniejszenie objętości i przywrócenie prawidłowego zawieszenia. LHP (Laser Hemorrhoidoplasty) realizuje to od wewnątrz: energia lasera diodowego 1470 nm zamyka tętniczki zasilające guzek i obkurcza tkankę, bez otwartej rany i bez naruszania zwieraczy.",
  steps: [
    {
      title: "Kwalifikacja: badanie proktologiczne i anoskopia",
      body:
        "Zaczynamy od wywiadu, badania per rectum i anoskopii. Oceniamy stopień zaawansowania w skali Goligher (I–IV), obecność komponenty zewnętrznej, fałdów skórnych, szczeliny lub przetoki. To badanie decyduje, czy laser wystarczy, czy potrzebna jest procedura hybrydowa. Krwawienie z odbytu u pacjenta po 45. roku życia lub z obciążonym wywiadem rodzinnym zawsze wymaga wcześniejszego wykluczenia przyczyny onkologicznej.",
    },
    {
      title: "Przygotowanie w dniu zabiegu",
      body:
        "Nie ma potrzeby głodówki ani pełnego oczyszczania jelita — wystarczy wypróżnienie rano lub mikrowlewka. Pacjent przyjeżdża w wygodnym ubraniu i wychodzi do domu tego samego dnia.",
    },
    {
      title: "Znieczulenie",
      body:
        "Najczęściej znieczulenie miejscowe (blokada okołoodbytnicza) lub krótkie znieczulenie dożylne, zależnie od preferencji pacjenta i liczby guzków. Nie stosujemy rutynowo znieczulenia podpajęczynówkowego, co skraca czas obserwacji po zabiegu i eliminuje ryzyko zatrzymania moczu z tego powodu.",
    },
    {
      title: "Wprowadzenie światłowodu",
      body:
        "Przez pojedyncze nakłucie u podstawy guzka (poniżej linii grzebieniastej, w okolicy słabo unerwionej czuciowo) wprowadzamy cienki światłowód radialny do wnętrza splotu naczyniowego. Nie ma nacięcia skalpelem, nie zakładamy szwów.",
    },
    {
      title: "Emisja energii i obkurczanie guzka",
      body:
        "Impulsowo podajemy energię (typowo 8–12 W, łącznie ok. 250–400 J na guzek, zależnie od objętości). Ciepło koaguluje tętniczki doprowadzające i wywołuje kontrolowane zwłóknienie podśluzówkowe. Guzek zapada się i ulega podciągnięciu — to właśnie zwłóknienie, a nie samo zamknięcie naczyń, odpowiada za trwałość efektu.",
    },
    {
      title: "Procedury towarzyszące (opcjonalnie)",
      body:
        "Przy komponencie zewnętrznej lub fałdach skórnych możemy w tej samej sesji wykonać mukopeksję albo plastykę fałdów. Dzięki temu efekt czynnościowy i estetyczny jest kompletny za jednym razem.",
    },
    {
      title: "Zakończenie i wypis",
      body:
        "Zabieg trwa 20–40 minut (przy wielu guzkach do godziny). Po 1–2 godzinach obserwacji pacjent wraca do domu z zaleceniami, receptą i terminem kontroli. Kierowanie samochodem po znieczuleniu dożylnym — dopiero następnego dnia.",
    },
  ],
  recoveryIntro:
    "Największy lęk pacjentów dotyczy nie samego zabiegu, lecz pierwszego wypróżnienia. Po LHP nie ma otwartej rany w kanale odbytu, dlatego ból jest nieporównywalnie mniejszy niż po klasycznej hemoroidektomii Milligana-Morgana. Kluczowe są trzy rzeczy: miękki stolec, nawodnienie i spokojny ruch.",
  recoveryPoints: [
    {
      title: "Doba 0–1",
      body:
        "Uczucie pełności lub ciała obcego w odbycie, czasem parcie naglące — to obrzęk pozabiegowy, nie powikłanie. Paracetamol lub ibuprofen zwykle wystarczają. Unikaj siedzenia dłużej niż 20–30 minut bez przerwy.",
    },
    {
      title: "Pierwsze wypróżnienie",
      body:
        "Powinno nastąpić w ciągu 24–48 godzin — nie należy go odkładać. Stosujemy środki zmiękczające (makrogole, laktuloza), 2–2,5 l płynów dziennie i dietę bogatoresztkową. Podnóżek pod stopy ustawia miednicę w pozycji fizjologicznej i zdejmuje napięcie z mięśnia łonowo-odbytniczego.",
    },
    {
      title: "Dni 2–7",
      body:
        "Kąpiele nasiadowe w letniej wodzie 2–3× dziennie po 10 minut. Krótkie spacery 15–20 minut. Możliwe śladowe krwawienie przy wypróżnieniu — kilka kropel to norma gojenia.",
    },
    {
      title: "Powrót do pracy",
      body:
        "Praca biurowa i zdalna: 1–3 dni. Praca fizyczna, kierowcy zawodowi: 7–10 dni. To główna przewaga LHP nad hemoroidektomią klasyczną, gdzie wykluczenie z pracy sięga 2–4 tygodni.",
    },
    {
      title: "Tygodnie 3–6",
      body:
        "Powrót do pełnej aktywności: siłownia, bieganie, rower, basen. Obkurczanie tkanki trwa do ok. 6 tygodni — ostateczny efekt ocenia się właśnie wtedy, nie w pierwszym tygodniu.",
    },
    {
      title: "Czego unikać",
      body:
        "Przez 2–4 tygodnie: sauna i gorące kąpiele, dźwiganie powyżej 5 kg, intensywny trening siłowy z parciem, alkohol i ostre przyprawy, długie siedzenie bez przerw.",
    },
  ],
  outcomesIntro:
    "LHP jest metodą dobrze udokumentowaną w chorobie hemoroidalnej II i III stopnia. Poniższe dane pochodzą z badań porównujących laser z hemoroidektomią klasyczną oraz z metaanaliz obejmujących obserwacje 1–3-letnie.",
  stats: [
    { value: "90–95%", label: "Ustąpienie krwawienia", source: "Stopień II–III, obserwacja 12 miesięcy" },
    { value: "~85%", label: "Trwałość efektu po 2–3 latach", source: "Metaanalizy LHP vs hemoroidektomia" },
    { value: "1–3 dni", label: "Powrót do pracy biurowej", source: "vs 14–28 dni po Milligan-Morgan" },
    { value: "<1%", label: "Ryzyko trwałego nietrzymania stolca", source: "Brak nacięcia zwieraczy" },
  ],
  outcomesNote:
    "Uczciwie: hemoroidektomia klasyczna pozostaje metodą o najniższym odsetku nawrotów w chorobie IV stopnia — laser nie zastąpi jej w każdej sytuacji. Przewaga LHP dotyczy stopni II–III i polega na radykalnie mniejszym bólu oraz krótszym wykluczeniu z życia zawodowego przy skuteczności zbliżonej do chirurgii. Największym czynnikiem ryzyka nawrotu nie jest sama metoda, lecz utrzymanie zaparć, długie siedzenie na toalecie i dieta ubogoresztkowa po zabiegu.",
  contraindicationsAbsolute: [
    "Aktywny ropień okołoodbytniczy lub inne ostre zakażenie w okolicy zabiegu",
    "Niewyjaśnione krwawienie z dolnego odcinka przewodu pokarmowego przed diagnostyką endoskopową",
    "Podejrzenie nowotworu odbytu lub odbytnicy",
    "Nieleczone zaburzenia krzepnięcia",
    "Zaawansowana, aktywna postać choroby Leśniowskiego-Crohna z zajęciem okolicy odbytu",
  ],
  contraindicationsRelative: [
    "Hemoroidy IV stopnia z trwałym wypadaniem — często wymagają metody hybrydowej lub klasycznej",
    "Dominująca komponenta zewnętrzna i duże fałdy skórne — sam laser nie usunie nadmiaru skóry",
    "Leczenie przeciwkrzepliwe — wymaga ustalenia okna okołozabiegowego z lekarzem prowadzącym",
    "Ciąża i połóg — zwykle odraczamy zabieg, objawy często ustępują samoistnie",
    "Przewlekłe zaparcia bez leczenia — najpierw uregulowanie wypróżnień, inaczej rośnie ryzyko nawrotu",
    "Współistniejąca szczelina odbytu lub spazm mięśnia łonowo-odbytniczego — leczymy równolegle",
  ],
  complications: [
    {
      title: "Obrzęk i uczucie ciała obcego (bardzo częste)",
      body:
        "Naturalna reakcja tkanki na energię lasera. Nasila się w 2.–4. dobie, ustępuje w 1–2 tygodnie. Pomagają kąpiele nasiadowe, NLPZ i ruch.",
    },
    {
      title: "Ból przy wypróżnieniu (częsty, umiarkowany)",
      body:
        "Zwykle 3–5/10 w skali VAS w pierwszych dniach, wyraźnie mniejszy niż po hemoroidektomii. Miękki stolec redukuje go najskuteczniej.",
    },
    {
      title: "Niewielkie krwawienie (kilka %)",
      body:
        "Śladowe plamienie przy wypróżnieniu do 2 tygodni jest normą. Krwawienie obfite, ciągłe lub ze skrzepami wymaga pilnego kontaktu.",
    },
    {
      title: "Zakrzepica brzeżna / guzek zakrzepowy (2–5%)",
      body:
        "Bolesne, twarde zgrubienie przy brzegu odbytu. Leczenie zachowawcze, rzadko nacięcie i ewakuacja skrzepu.",
    },
    {
      title: "Przejściowe zatrzymanie moczu (1–3%)",
      body:
        "Częściej u mężczyzn i po znieczuleniu dożylnym z dużą podażą płynów. Zwykle ustępuje w ciągu kilkunastu godzin.",
    },
    {
      title: "Zakażenie (rzadkie, <1%)",
      body:
        "Ropień lub przetoka to powikłania wyjątkowe po LHP, bo nie ma otwartej rany. Objawy alarmowe: gorączka >38°C, narastający ból, wydzielina ropna.",
    },
    {
      title: "Nawrót objawów (10–15% w 2–3 lata)",
      body:
        "Możliwe powtórzenie zabiegu laserem lub uzupełnienie inną metodą. Ryzyko wyraźnie spada przy uregulowanych wypróżnieniach.",
    },
  ],
  comparisonIntro:
    "Nie istnieje jedna metoda najlepsza dla wszystkich. Wybór zależy od stopnia zaawansowania, obecności komponenty zewnętrznej, chorób towarzyszących i tego, ile dni pacjent może realnie wyłączyć się z pracy.",
  comparison: [
    {
      method: "LHP (laser 1470 nm)",
      effectiveness: "90–95% (II–III st.)",
      invasiveness: "Bardzo niska — nakłucie, bez szwów",
      recovery: "1–3 dni",
      note: "Optymalna dla stopni II–III, także z krwawieniem dominującym. Brak blizn i ochrona zwieraczy.",
    },
    {
      method: "Hemoroidektomia Milligana-Morgana",
      effectiveness: "95–98% (wszystkie stopnie)",
      invasiveness: "Wysoka — wycięcie, otwarte rany",
      recovery: "14–28 dni",
      note: "Najniższy odsetek nawrotów, ale najsilniejszy ból pooperacyjny. Zarezerwowana głównie dla IV stopnia.",
    },
    {
      method: "Metoda Longo (stapler)",
      effectiveness: "85–90%",
      invasiveness: "Średnia — szew mechaniczny",
      recovery: "7–14 dni",
      note: "Skuteczna przy wypadaniu okrężnym. Rzadkie, ale poważne powikłania (ból przewlekły, urazy odbytnicy).",
    },
    {
      method: "Gumkowanie (Barron)",
      effectiveness: "60–80% (I–II st.)",
      invasiveness: "Minimalna, ambulatoryjna",
      recovery: "1–2 dni",
      note: "Tanie i szybkie, ale wymaga zwykle kilku sesji i ma wyższy odsetek nawrotów.",
    },
    {
      method: "Skleroterapia",
      effectiveness: "50–70% (I st.)",
      invasiveness: "Minimalna",
      recovery: "Bez przerwy",
      note: "Sprawdza się przy niewielkim krwawieniu we wczesnym stadium. Efekt często czasowy.",
    },
    {
      method: "HAL-RAR (podkłucie tętnic pod USG)",
      effectiveness: "85–90%",
      invasiveness: "Niska — szwy bez wycinania",
      recovery: "3–7 dni",
      note: "Dobra przy dominującym wypadaniu. Wymaga szycia i dłuższego czasu zabiegu niż LHP.",
    },
  ],
  comparisonNote:
    "W praktyce często łączymy metody: laser na guzki wewnętrzne plus plastyka fałdów skórnych lub leczenie współistniejącej szczeliny. Taka strategia hybrydowa pozwala uzyskać efekt porównywalny z chirurgią klasyczną przy zachowaniu krótkiej rekonwalescencji.",
};
