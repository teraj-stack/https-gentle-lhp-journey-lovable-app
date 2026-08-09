export interface PreparationChecklistGroup {
  /** Nagłówek grupy, np. "Tydzień przed zabiegiem" */
  title: string;
  /** Konkretne, wykonalne instrukcje dla pacjenta */
  items: string[];
}

export interface PreparationChecklist {
  /** Nazwa zabiegu w dopełniaczu, np. "EVLT" / "mikroflebektomii" */
  procedureName: string;
  /** Krótkie wprowadzenie nad akordeonem */
  intro: string;
  /** Link do pełnej strony przygotowania */
  fullGuideHref: string;
  groups: PreparationChecklistGroup[];
}

export const preparationChecklists: Record<string, PreparationChecklist> = {
  evlt: {
    procedureName: "EVLT",
    intro:
      "Laserowe zamknięcie żyły (EVLT) wykonujemy w znieczuleniu miejscowym tumescencyjnym — nie musisz być na czczo i tego samego dnia wracasz do domu. Poniżej konkretne instrukcje na tydzień, dzień i poranek przed zabiegiem.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-evlt",
    groups: [
      {
        title: "Tydzień przed zabiegiem",
        items: [
          "Poinformuj nas, jeśli przyjmujesz leki przeciwzakrzepowe (acenokumarol, NOAC, klopidogrel) lub aspirynę — nigdy nie odstawiaj ich samodzielnie.",
          "Pij 2–2,5 l wody dziennie — dobrze nawodnione żyły są lepiej widoczne w USG.",
          "Kup pończochę uciskową II klasy ucisku (lub poproś nas o dobór rozmiaru).",
          "Unikaj solarium i intensywnego opalania nóg.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Nie pij alkoholu — rozszerza naczynia i zwiększa ryzyko zasinień.",
          "Nie gol nóg i nie stosuj depilacji — mikrouszkodzenia skóry to ryzyko infekcji.",
          "Wieczorem umyj nogi, ale nie nakładaj balsamów, olejków ani samoopalacza.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Zjedz lekki posiłek 1–2 godziny przed wizytą — nie musisz być na czczo.",
          "Załóż luźne spodnie lub spódnicę, które łatwo założysz na pończochę, i buty bez obcasa.",
          "Zabierz pończochę uciskową, dowód osobisty, listę leków i wynik USG Doppler.",
          "Zaplanuj po zabiegu 30–60 minut spaceru — to element leczenia, nie dodatek.",
        ],
      },
    ],
  },

  clacs: {
    procedureName: "CLaCS",
    intro:
      "CLaCS łączy laser przezskórny, kriochłodzenie i mikroskleroterapię. Efekt zależy w dużej mierze od stanu skóry — dlatego przygotowanie skupia się na braku opalenizny i czystych nogach.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-clacs",
    groups: [
      {
        title: "2–4 tygodnie przed zabiegiem",
        items: [
          "Nie korzystaj z solarium i unikaj intensywnego opalania nóg — pigment pochłania światło lasera i grozi przebarwieniami.",
          "Odstaw samoopalacze i balsamy brązujące.",
          "Zgłoś przyjmowanie leków rozrzedzających krew — decyzję o modyfikacji podejmuje lekarz.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Nie pij alkoholu — pogarsza krzepliwość i zwiększa ryzyko siniaków.",
          "Wieczorem umyj nogi wodą z delikatnym mydłem; bez kremów, olejków i perfum.",
          "Pij 2–2,5 l wody — lepsze ukrwienie to czystszy efekt fototermolizy.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Skóra nóg ma być całkowicie czysta i sucha — bez balsamu, pudru i dezodorantu.",
          "Załóż luźną sukienkę, spódnicę lub luźne spodnie — nic, co uciska nogi.",
          "Zjedz lekki posiłek, ogranicz kawę; nie musisz być na czczo.",
          "Weź pończochę uciskową i filtr SPF 50+ na kolejne tygodnie.",
        ],
      },
    ],
  },

  skleroterapia: {
    procedureName: "skleroterapii",
    intro:
      "Skleroterapia jest mało inwazyjna i trwa kilkanaście minut, ale kilka prostych zasad wyraźnie poprawia efekt i skraca czas gojenia.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-skleroterapia",
    groups: [
      {
        title: "Kilka dni przed zabiegiem",
        items: [
          "Zgłoś przyjmowanie aspiryny, NLPZ i leków przeciwzakrzepowych — nie odstawiaj ich bez konsultacji.",
          "Pij 2–2,5 l wody dziennie — lepsza widoczność żył w USG.",
          "Unikaj solarium i intensywnej ekspozycji nóg na słońce przez 2 tygodnie.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Nie pij alkoholu — rozszerza naczynia i utrudnia ocenę reakcji żyły na sklerozant.",
          "Umyj nogi, ale nie nakładaj kremów, balsamów ani olejków — czysta, odtłuszczona skóra to lepsza dezynfekcja i przyleganie opatrunków.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Zabierz pończochę uciskową II klasy — założysz ją bezpośrednio po zabiegu.",
          "Ubierz się luźno, wybierz buty bez obcasa.",
          "Zjedz lekki posiłek 1–2 godziny przed wizytą; nie musisz być na czczo.",
        ],
      },
    ],
  },

  mikroflebektomia: {
    procedureName: "mikroflebektomii",
    intro:
      "Mikroflebektomia piankowa to usunięcie żylaków przez nakłucia wielkości 1–2 mm. Sterylność i czysta skóra są tu kluczowe.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-mikroflebektomia",
    groups: [
      {
        title: "Kilka dni przed zabiegiem",
        items: [
          "Poinformuj nas o lekach wpływających na krzepliwość krwi.",
          "Pij 2–2,5 l wody dziennie — lepsza widoczność żył w USG oznacza precyzyjniejsze nakłucia.",
          "Nie gol nóg — mikrouszkodzenia skóry zwiększają ryzyko infekcji.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Bez alkoholu — utrudnia kontrolę krwawienia z mikronakłuć.",
          "Umyj nogi i nie nakładaj balsamów, kremów ani samoopalaczy.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Obowiązkowo zabierz pończochę uciskową II klasy ucisku.",
          "Ubierz spodnie, które łatwo założysz na pończochę, i wygodne buty bez obcasa.",
          "Zjedz lekkostrawny posiłek 1–2 godziny wcześniej — zabieg w znieczuleniu miejscowym, bez postu.",
        ],
      },
    ],
  },

  lhp: {
    procedureName: "LHP",
    intro:
      "Laserowe leczenie hemoroidów (LHP) trwa 20–60 minut i kończy się powrotem do domu tego samego dnia. Najważniejsze przygotowanie to miękki stolec i wolna okolica zabiegowa.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-lhp",
    groups: [
      {
        title: "Kilka dni przed zabiegiem",
        items: [
          "Wprowadź dietę bogatą w błonnik (warzywa, owoce, pełne ziarna) i pij 2–2,5 l wody — zaparcie to największy wróg komfortu po LHP.",
          "Zgłoś przyjmowanie leków przeciwzakrzepowych; lekarz zdecyduje o ewentualnej modyfikacji.",
          "Nie gol okolicy odbytu — skóra musi być nienaruszona.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Zjedz lekkostrawną kolację i nie pij alkoholu.",
          "Weź spokojny prysznic; okolicę krocza umyj wyłącznie wodą i neutralnym mydłem.",
          "Jeśli planowane jest znieczulenie ogólne — zastosuj się do instrukcji postu przekazanych przez anestezjologa.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Załóż luźne, nieuciskające spodnie i bawełnianą bieliznę — po zabiegu zakładamy delikatny opatrunek.",
          "Bez kremów, pudrów i dezodorantu na okolicy zabiegowej.",
          "Zabierz dowód osobisty, listę leków i wyniki ostatnich badań.",
          "Zaplanuj powrót do domu z osobą towarzyszącą, jeśli miałeś znieczulenie dożylne.",
        ],
      },
    ],
  },

  filac: {
    procedureName: "FiLaC",
    intro:
      "Laserowe zamknięcie przetoki okołoodbytniczej (FiLaC) nie narusza zwieraczy. Dobre przygotowanie jelit i higiena okolicy zwiększają szansę na wygojenie za pierwszym razem.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-filac",
    groups: [
      {
        title: "Kilka dni przed zabiegiem",
        items: [
          "Zgłoś leki wpływające na krzepliwość (acenokumarol, warfaryna, NOAC, klopidogrel) — nigdy nie odstawiaj ich sam.",
          "Dieta z błonnikiem i 2–2,5 l wody dziennie — miękki stolec to mniejszy ból po zabiegu.",
          "Nie stosuj kremów, maści ani depilacji w okolicy operowanej.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Lekkostrawna kolacja, bez alkoholu; nie musisz być na czczo, chyba że planowane jest znieczulenie ogólne.",
          "Wieczorna kąpiel — okolicę krocza myj wyłącznie wodą i delikatnym mydłem.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Luźne spodnie i bielizna z bawełny — nic nie może uciskać opatrunku.",
          "Rano umyj okolicę wodą; bez pudrów, kremów i perfum.",
          "Zabierz dowód, listę leków i badania obrazowe (USG endorektalne lub MR miednicy), jeśli je posiadasz.",
        ],
      },
    ],
  },

  silac: {
    procedureName: "SiLaC",
    intro:
      "SiLaC (laserowe zamknięcie zatoki włosowej) trwa około 30 minut w znieczuleniu miejscowym. Przygotowanie jest wyjątkowo proste — liczy się czysta i nieogolona okolica.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-silac",
    groups: [
      {
        title: "Kilka dni przed zabiegiem",
        items: [
          "Poinformuj nas o lekach przeciwzakrzepowych — lekarz ustali dawkowanie indywidualnie.",
          "Pij 2–2,5 l wody dziennie.",
          "Nie gol okolicy zatoki w tygodniu przed zabiegiem — obszar przygotujemy profesjonalnie na miejscu.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Jedz normalnie, ale lekkostrawnie; unikaj alkoholu.",
          "Dokładnie umyj okolicę kości krzyżowej — bez balsamów, oliwek i pudrów.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Załóż luźne spodnie, które nie uciskają okolicy krzyżowej, i bawełnianą bieliznę.",
          "Skóra ma być czysta i sucha, bez kosmetyków i dezodorantu.",
          "Zabierz dowód osobisty, listę leków i wyniki badań laboratoryjnych.",
        ],
      },
    ],
  },

  plastyka: {
    procedureName: "plastyki okolicy odbytu",
    intro:
      "Plastykę okolicy odbytu wykonujemy laserowo, bez szwów. Kilka kroków przed zabiegiem zapewnia komfort wypróżnień i szybsze gojenie.",
    fullGuideHref: "/dla-pacjenta/przygotowanie-plastyka",
    groups: [
      {
        title: "Kilka dni przed zabiegiem",
        items: [
          "Zgłoś przyjmowanie leków przeciwzakrzepowych.",
          "Pij 2–2,5 l wody i jedz produkty bogate w błonnik — miękki stolec przez pierwsze dni po zabiegu jest kluczowy.",
          "Nie gol okolicy odbytu.",
        ],
      },
      {
        title: "Dzień przed zabiegiem",
        items: [
          "Lekka, niewielka kolacja; bez alkoholu.",
          "Spokojny prysznic — okolicę krocza umyj wodą i delikatnym mydłem, bez kremów i perfum.",
        ],
      },
      {
        title: "W dniu zabiegu",
        items: [
          "Bawełniana bielizna i luźne spodnie, które nie uciskają operowanej okolicy.",
          "Rano umyj okolicę wodą; bez pudrów, dezodorantów i kremów.",
          "Zabierz dowód osobisty, listę leków i wyniki ostatnich badań (morfologia, układ krzepnięcia).",
        ],
      },
    ],
  },
};
