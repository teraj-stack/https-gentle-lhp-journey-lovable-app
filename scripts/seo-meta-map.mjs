/**
 * Centralna mapa docelowych metadanych SEO (title 50–60, description 150–160).
 * Używana przez scripts/apply-seo-meta.mjs oraz jako źródło prawdy przy audycie.
 * Wzór dla stron zabiegów: "{Zabieg} w CML | Leczenie {problem} | Warszawa".
 */
export const SEO_META = {
  "/": {
    title: "CML Warszawa | Laserowe leczenie hemoroidów i żylaków",
    description:
      "Laserowe leczenie hemoroidów, żylaków, przetok i szczeliny odbytu w Warszawie Wilanów. Dyskrecja, krótka rekonwalescencja. Umów konsultację w CML.",
  },
  "/leczenie/lhp": {
    title: "LHP w CML | Laserowe leczenie hemoroidów | Warszawa",
    description:
      "Laserowa plastyka hemoroidów LHP bez skalpela i bez szwów, w znieczuleniu miejscowym. Szybki powrót do normalności. Umów konsultację w CML Warszawa.",
  },
  "/leczenie/filac": {
    title: "FiLaC w CML | Leczenie przetok odbytu laserem | Warszawa",
    description:
      "FiLaC zamyka przetokę odbytu laserem, bez rozcinania zwieraczy i ryzyka nietrzymania stolca. Szybki powrót do normalności. Umów konsultację w CML.",
  },
  "/leczenie/silac": {
    title: "SiLaC w CML | Leczenie torbieli pilonidalnej | Warszawa",
    description:
      "SiLaC zamyka torbiel pilonidalną laserem przez nakłucie 2–3 mm, bez rozległej rany i blizny. Szybki powrót do normalności. Umów konsultację w CML.",
  },
  "/leczenie/evlt": {
    title: "EVLT w CML | Laserowe leczenie żylaków nóg | Warszawa",
    description:
      "EVLT to endowenozna ablacja laserowa żylaków: zabieg ambulatoryjny, bez narkozy i bez szwów. Szybki powrót do normalności. Umów konsultację w CML.",
  },
  "/leczenie/skleroterapia": {
    title: "Skleroterapia w CML | Leczenie żylaków bez operacji",
    description:
      "Skleroterapia piankowa zamyka żylaki i pajączki bez operacji i bez znieczulenia, w kilkanaście minut. Szybki powrót do normalności. Umów wizytę w CML.",
  },
  "/leczenie/clacs": {
    title: "CLaCS w CML | Usuwanie pajączków naczyniowych | Warszawa",
    description:
      "CLaCS łączy laser i krioterapię, usuwając pajączki naczyniowe skuteczniej niż pojedyncze metody. Szybki powrót do normalności. Umów wizytę w CML.",
  },
  "/leczenie/mikroflebektomia": {
    title: "Mikroflebektomia w CML | Usuwanie żylaków | Warszawa",
    description:
      "Mikroflebektomia piankowa usuwa duże, wypukłe żylaki przez nakłucia 1–2 mm, bez narkozy i szwów. Szybki powrót do normalności. Umów wizytę w CML.",
  },
  "/leczenie/szczelina": {
    title: "Szczelina odbytu w CML | Leczenie laserem | Warszawa",
    description:
      "Leczenie szczeliny odbytu w CML: farmakoterapia, botoks i laser, bez rozcinania zwieracza. Szybki powrót do normalności. Umów konsultację w Warszawie.",
  },
  "/leczenie/plastyka": {
    title: "Plastyka odbytu w CML | Usuwanie fałdów | Warszawa",
    description:
      "Laserowa plastyka odbytu usuwa naddatki skórne i poprawia estetykę okolicy — bez szwów. Szybki powrót do normalności. Umów konsultację w CML Warszawa.",
  },
  "/leczenie/anusitis": {
    title: "Anusitis w CML | Leczenie zapalenia odbytu | Warszawa",
    description:
      "Zapalenie odbytu (anusitis) leczymy ambulatoryjnie: diagnostyka przyczyn i celowana farmakoterapia, bez chirurgii. Umów konsultację w CML Warszawa.",
  },
  "/leczenie/spazm-lonowoodbytniczy": {
    title: "Spazm w CML | Leczenie przewlekłego bólu odbytu",
    description:
      "Przewlekły ból odbytu ze spazmu mięśnia łonowo-odbytniczego: diagnostyka, botoks, fizjoterapia i leki. Ulga bez operacji. Umów konsultację w CML Warszawa.",
  },
  "/leczenie/fototerapia": {
    title: "Fototerapia LED w CML | Szybsze gojenie po zabiegu",
    description:
      "Fotobiomodulacja LED przyspiesza gojenie po zabiegach laserowych i wspiera redukcję naczynek — bezboleśnie i bez rekonwalescencji. Umów wizytę w CML.",
  },
  "/leczenie/proktologia": {
    title: "Proktologia laserowa w CML | Zabiegi w Warszawie",
    description:
      "Hemoroidy, przetoki, szczelina i torbiel pilonidalna — leczenie laserowe LHP, FiLaC i SiLaC bez skalpela. Szybki powrót do normalności. Umów wizytę w CML.",
  },
  "/leczenie/flebologia": {
    title: "Flebologia laserowa w CML | Leczenie żylaków | Warszawa",
    description:
      "Żylaki i pajączki: EVLT, skleroterapia, CLaCS i mikroflebektomia — minimalnie inwazyjnie, bez blizn. Szybki powrót do normalności. Umów wizytę w CML.",
  },
  "/leczenie/ginekomastia": {
    title: "Ginekomastia w CML | Leczenie chirurgiczne | Warszawa",
    description:
      "Korekcja ginekomastii metodą Vaser Lipo HD i wycięcie gruczołu piersiowego — trwały efekt, minimalne blizny. Szybki powrót do formy. Umów konsultację.",
  },
  "/leczenie/ginekomastia-gruczolowa": {
    title: "Ginekomastia gruczołowa w CML | Wycięcie | Warszawa",
    description:
      "Prawdziwa ginekomastia gruczołowa: chirurgiczne usunięcie rozrośniętego gruczołu z dyskretnym cięciem i trwałym efektem. Umów konsultację w CML Warszawa.",
  },
  "/leczenie/ginekomastia-tluszczowa": {
    title: "Ginekomastia tłuszczowa w CML | Vaser Lipo HD",
    description:
      "Pseudoginekomastia: liposukcja ultradźwiękowa Vaser Lipo HD modeluje klatkę piersiową bez blizn. Szybki powrót do formy. Umów konsultację w CML Warszawa.",
  },
  "/leczenie/ginekomastia-mieszana": {
    title: "Ginekomastia mieszana w CML | Vaser i wycięcie",
    description:
      "Ginekomastia mieszana: liposukcja Vaser Lipo HD i wycięcie gruczołu w jednej sesji, trwały i naturalny efekt. Umów konsultację w CML Warszawa Wilanów.",
  },
  "/cennik": {
    title: "Cennik zabiegów laserowych w CML | Warszawa Wilanów",
    description:
      "Przejrzysty cennik CML: konsultacja proktologiczna i flebologiczna 400 zł, z USG Doppler 500 zł, zabiegi laserowe od 3 000 zł. Sprawdź i umów wizytę.",
  },
  "/kontakt": {
    title: "Kontakt CML Warszawa Wilanów | Umów wizytę u proktologa",
    description:
      "CML, ul. Branickiego 10/U6, Warszawa Wilanów. Zadzwoń lub napisz — pomożemy dobrać dogodny termin wizyty proktologicznej albo flebologicznej. Zapraszamy.",
  },
  "/o-nas": {
    title: "O nas | Dr Jan Bujok, chirurg proktolog i flebolog | CML",
    description:
      "Poznaj dr. Jana Bujoka i filozofię S.C.A.L.E.: bezpieczeństwo, laser, empatia i pacjent jako świadomy partner. Umów konsultację w CML Warszawa Wilanów.",
  },
  "/wspolpraca": {
    title: "Współpraca B2B z CML | Dla klinik i gabinetów | Warszawa",
    description:
      "Model kooperacyjny CML: procedury tkankowo-oszczędzające, preedukacja pacjenta i cross-referrals bez utraty pacjenta. Poznaj zasady i nawiąż współpracę.",
  },
  "/blog": {
    title: "Blog CML | Proktologia i flebologia bez tabu | Warszawa",
    description:
      "Artykuły o hemoroidach, żylakach i leczeniu laserowym pisane przez specjalistów CML. Rzetelna wiedza EBM, konkretne odpowiedzi i praktyczne poradniki.",
  },
  "/dla-pacjenta": {
    title: "Dla pacjenta | Poradniki przed i po zabiegu | CML",
    description:
      "E-booki, checklisty i poradniki CML: jak przygotować się do wizyty, jak przebiega zabieg i jak wygląda rekonwalescencja. Wejdź na wizytę przygotowany.",
  },
  "/dla-pacjenta/hemoroidy": {
    title: "Hemoroidy od A do Z | Przewodnik pacjenta | CML",
    description:
      "Skąd biorą się hemoroidy, jak rozpoznać stopnie choroby i czym różni się laser LHP od klasycznej operacji. Przewodnik dr. Jana Bujoka dla pacjentów CML.",
  },
  "/dla-pacjenta/hemoroidy-infografika": {
    title: "Hemoroidy — infografika | Laser vs operacja | CML",
    description:
      "Infografika CML: porównanie lasera LHP z metodami klasycznymi, przebieg zabiegu krok po kroku i okno terapeutyczne. Zobacz dane w czytelnej formie.",
  },
  "/dla-pacjenta/pajaczki": {
    title: "Pajączki naczyniowe | Przyczyny i leczenie | CML",
    description:
      "Dlaczego powstają pajączki naczyniowe, jak wygląda diagnostyka i które metody działają: skleroterapia i CLaCS. Poradnik flebologów CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/profilaktyka-zylakow": {
    title: "Profilaktyka żylaków | Jak uniknąć żylaków nóg | CML",
    description:
      "Sześć filarów profilaktyki żylaków: ruch, kompresja, waga, dieta, praca stojąca i sygnały ostrzegawcze. Praktyczny przewodnik flebologów CML Warszawa.",
  },
  "/dla-pacjenta/faldy-odbytu": {
    title: "Fałdy okolicy odbytu | Norma czy wskazanie do zabiegu",
    description:
      "Fałdy brzeżne odbytu: skąd się biorą, kiedy są wariantem anatomii, a kiedy warto je usunąć. Rzetelna wiedza bez oceniania — poradnik CML Warszawa.",
  },
  "/dla-pacjenta/pielegnacja-nog": {
    title: "Pielęgnacja nóg po zabiegu laserowym | Instrukcja CML",
    description:
      "Oś czasu aplikacji kremu, cztery złote zasady bezpieczeństwa i objawy wymagające kontaktu z lekarzem po laserze Nd:YAG. Instrukcja krok po kroku od CML.",
  },
  "/dla-pacjenta/edukacja": {
    title: "Edukacja przed wizytą | Jak przygotować się do wizyty",
    description:
      "Przygotowanie merytoryczne skraca konsultację i podnosi jakość leczenia. Zobacz, co warto wiedzieć przed wizytą u proktologa lub flebologa w CML Warszawa.",
  },
  "/dla-pacjenta/proktolog-faq": {
    title: "Wizyta u proktologa | Najczęstsze pytania | CML",
    description:
      "Jak wygląda badanie proktologiczne, czy boli, jak się przygotować i jakie są metody leczenia hemoroidów. Odpowiedzi specjalistów CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/ebm-hemoroidy": {
    title: "Hemoroidy w świetle badań (EBM) | Ryzyko i profilaktyka",
    description:
      "Sześć czynników ryzyka i sześć filarów profilaktyki hemoroidów z odnośnikami do PubMed, ASCRS, ESCP i Cochrane. Kompendium Evidence-Based Medicine CML.",
  },
  "/dla-pacjenta/quiz-hemoroidy": {
    title: "Test ryzyka hemoroidów | Quiz 9 pytań online | CML",
    description:
      "Sprawdź ryzyko hemoroidów w 2 minuty: 9 pytań o styl życia, trzy poziomy ryzyka i zalecenia oparte na badaniach. Bez konta, dane zostają w przeglądarce.",
  },
  "/dla-pacjenta/dziennik-hemoroidy": {
    title: "Dziennik hemoroidów 14 dni | Śledź trend objawów | CML",
    description:
      "Codzienny quiz, notatki i wykres trendu ryzyka przez 14 dni — zobacz, co realnie poprawia objawy. Bez konta, dane zapisują się lokalnie w przeglądarce.",
  },
  "/wiedza/seks-analny-a-hemoroidy": {
    title: "Seks analny a hemoroidy | Fakty i mity w świetle EBM",
    description:
      "Czy seks analny powoduje hemoroidy? Analiza badań, profilaktyka, lubrykanty i powrót do aktywności po zabiegu. Rzetelny raport specjalistów CML Warszawa.",
  },
  "/dla-pacjenta/przygotowanie-lhp": {
    title: "Przygotowanie do zabiegu LHP | Checklista | CML",
    description:
      "Leki, dieta z błonnikiem, higiena i co zabrać ze sobą — praktyczna checklista przed laserową plastyką hemoroidów LHP. Wskazówki specjalistów CML Warszawa.",
  },
  "/dla-pacjenta/przygotowanie-filac": {
    title: "Przygotowanie do zabiegu FiLaC | Checklista | CML",
    description:
      "Badania, leki, dieta i higiena okolicy przed laserowym zamknięciem przetoki FiLaC — checklista krok po kroku od specjalistów CML w Warszawie Wilanowie.",
  },
  "/dla-pacjenta/przygotowanie-silac": {
    title: "Przygotowanie do zabiegu SiLaC | Checklista | CML",
    description:
      "Nawodnienie, brak golenia okolicy zatoki, luźne ubranie i dokumenty — checklista przed laserowym zamknięciem torbieli pilonidalnej SiLaC w CML Warszawa.",
  },
  "/dla-pacjenta/przygotowanie-evlt": {
    title: "Przygotowanie do zabiegu EVLT | Checklista | CML",
    description:
      "Jak przygotować się do laserowego usuwania żylaków EVLT w znieczuleniu miejscowym: leki, posiłek, ubranie i pończochy. Checklista specjalistów CML Warszawa.",
  },
  "/dla-pacjenta/przygotowanie-skleroterapia": {
    title: "Przygotowanie do skleroterapii żylaków | Checklista CML",
    description:
      "Co zrobić przed skleroterapią żylaków i pajączków: leki, kosmetyki, ubranie i pończochy uciskowe. Krótka checklista od flebologów CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/przygotowanie-clacs": {
    title: "Przygotowanie do zabiegu CLaCS | Checklista | CML",
    description:
      "Opalanie, kosmetyki, leki i ubranie — o czym pamiętać przed hybrydowym usuwaniem pajączków metodą CLaCS. Checklista flebologów CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/przygotowanie-mikroflebektomia": {
    title: "Przygotowanie do mikroflebektomii | Checklista | CML",
    description:
      "Leki, posiłek, higiena nóg i pończochy uciskowe — praktyczna checklista przed mikroflebektomią piankową żylaków. Wskazówki flebologów CML Warszawa.",
  },
  "/dla-pacjenta/przygotowanie-plastyka": {
    title: "Przygotowanie do plastyki odbytu | Checklista | CML",
    description:
      "Dieta, wypróżnienie, higiena okolicy i co zabrać ze sobą przed laserową plastyką okolicy odbytu. Checklista proktologów CML Warszawa Wilanów krok po kroku.",
  },
  "/dla-pacjenta/przygotowanie-ginekomastii": {
    title: "Przygotowanie do zabiegu ginekomastii | Checklista CML",
    description:
      "Badania, leki, stabilna waga i kamizelka uciskowa — checklista przed korekcją ginekomastii (Vaser Lipo HD, gruczołowa, mieszana) w CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/przygotowanie-ginekomastia-gruczolowa": {
    title: "Przygotowanie do wycięcia gruczołu | Ginekomastia | CML",
    description:
      "Badania, odstawienie leków, kamizelka i opieka po zabiegu — checklista przed chirurgicznym wycięciem gruczołu piersiowego w CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/przygotowanie-ginekomastia-tluszczowa": {
    title: "Przygotowanie do Vaser Lipo HD | Ginekomastia | CML",
    description:
      "Stabilna waga, nawodnienie, leki i kamizelka uciskowa — checklista przed liposukcją ultradźwiękową Vaser Lipo HD przy ginekomastii tłuszczowej w CML.",
  },
  "/dla-pacjenta/przygotowanie-ginekomastia-mieszana": {
    title: "Przygotowanie do ginekomastii mieszanej | Checklista CML",
    description:
      "Badania, leki, waga i kamizelka — checklista przed połączeniem Vaser Lipo HD z wycięciem gruczołu w jednej sesji. Wskazówki chirurgów CML Warszawa Wilanów.",
  },
  "/dla-pacjenta/zalecenia-po-lhp": {
    title: "Zalecenia po zabiegu LHP | Rekonwalescencja | CML",
    description:
      "Higiena, dieta, leki przeciwbólowe, aktywność i sygnały alarmowe po laserowym leczeniu hemoroidów LHP. Poradnik rekonwalescencji od specjalistów CML.",
  },
  "/dla-pacjenta/zalecenia-po-filac": {
    title: "Zalecenia po zabiegu FiLaC | Rekonwalescencja | CML",
    description:
      "Higiena rany, kąpiele nasiadowe, dieta, kontrole gojenia i sygnały alarmowe po laserowym leczeniu przetoki FiLaC. Poradnik rekonwalescencji od CML.",
  },
  "/dla-pacjenta/zalecenia-po-silac": {
    title: "Zalecenia po zabiegu SiLaC | Rekonwalescencja | CML",
    description:
      "Pielęgnacja rany, kąpiele, siedzenie, aktywność i sygnały alarmowe po laserowym leczeniu torbieli pilonidalnej SiLaC. Poradnik rekonwalescencji od CML.",
  },
  "/dla-pacjenta/zalecenia-po-evlt": {
    title: "Zalecenia po zabiegu EVLT | Rekonwalescencja | CML",
    description:
      "Kompresja, spacery, praca, kąpiele i sygnały alarmowe po laserowym usuwaniu żylaków EVLT. Praktyczny poradnik rekonwalescencji od flebologów CML Warszawa.",
  },
  "/dla-pacjenta/zalecenia-po-skleroterapii": {
    title: "Zalecenia po skleroterapii | Rekonwalescencja | CML",
    description:
      "Pończochy uciskowe, spacery, higiena, ochrona przed słońcem i sygnały alarmowe po skleroterapii żylaków i pajączków. Poradnik flebologów CML Warszawa.",
  },
  "/dla-pacjenta/zalecenia-po-clacs": {
    title: "Zalecenia po zabiegu CLaCS | Rekonwalescencja | CML",
    description:
      "Kompresja, pielęgnacja skóry, ochrona przeciwsłoneczna i sygnały alarmowe po zabiegu CLaCS na pajączki naczyniowe. Poradnik flebologów CML Warszawa.",
  },
  "/dla-pacjenta/zalecenia-po-mikroflebektomii": {
    title: "Zalecenia po mikroflebektomii | Rekonwalescencja | CML",
    description:
      "Pończochy uciskowe, spacery, pielęgnacja nakłuć, ochrona przed słońcem i sygnały alarmowe po mikroflebektomii piankowej. Poradnik flebologów CML Warszawa.",
  },
  "/dla-pacjenta/zalecenia-po-plastyce": {
    title: "Zalecenia po plastyce odbytu | Rekonwalescencja | CML",
    description:
      "Higiena rany, kąpiele nasiadowe, dieta bogatoresztkowa, aktywność i sygnały alarmowe po laserowej plastyce okolicy odbytu. Poradnik proktologów CML.",
  },
  "/dla-pacjenta/zalecenia-po-ginekomastii": {
    title: "Zalecenia po zabiegu ginekomastii | Rekonwalescencja",
    description:
      "Kamizelka uciskowa, pielęgnacja ran, powrót do treningu i sygnały alarmowe po korekcji ginekomastii metodą Vaser Lipo HD. Poradnik chirurgów CML Warszawa.",
  },
  "/polityka-prywatnosci": {
    title: "Polityka prywatności | CML Centrum Medycyny Laserowej",
    description:
      "Jak CML przetwarza dane osobowe pacjentów zgodnie z RODO: cele, podstawy prawne, okresy przechowywania, pliki cookie i Twoje prawa. Sprawdź szczegóły.",
  },
  "/regulamin": {
    title: "Regulamin usług | CML Centrum Medycyny Laserowej",
    description:
      "Warunki świadczenia usług medycznych w CML: zasady umawiania i odwoływania wizyt, płatności, reklamacje oraz prawa pacjenta. Zapoznaj się przed wizytą.",
  },
};
