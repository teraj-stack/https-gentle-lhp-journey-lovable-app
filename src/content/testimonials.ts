/**
 * Opinie pacjentów — WYŁĄCZNIE realne, publicznie opublikowane recenzje
 * z profilu dr. Jana Bujoka w serwisie ZnanyLekarz.pl.
 *
 * ZASADA (YMYL / medycyna): nie wolno tu dodawać wymyślonych opinii,
 * ani przypisywać recenzji zabiegu, którego autor nie wskazał.
 * Pole `procedure` uzupełniamy tylko wtedy, gdy wynika z treści opinii
 * lub z oznaczenia usługi w serwisie źródłowym.
 *
 * Nazwiska skracamy do inicjału ze względu na prywatność.
 */

export interface Testimonial {
  /** Imię (nazwisko skrócone do inicjału) — tak jak w źródle */
  name: string;
  /** Powód wizyty / zabieg — tylko gdy potwierdzony */
  procedure?: string;
  /** Treść opinii (cytat, bez zmian merytorycznych) */
  text: string;
  rating: number;
  /** Data publikacji ISO — do JSON-LD */
  dateISO: string;
  /** Data w formie czytelnej po polsku */
  date: string;
}

export const TESTIMONIALS_SOURCE = "ZnanyLekarz.pl";
export const TESTIMONIALS_SOURCE_URL =
  "https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa";

/** Ocena zbiorcza publikowana na profilu ZnanyLekarz (stan: sierpień 2026) */
export const CLINIC_AGGREGATE_RATING = {
  ratingValue: 5,
  reviewCount: 325,
  bestRating: 5,
  worstRating: 1,
} as const;

export const testimonials: Testimonial[] = [
  {
    name: "Mateusz",
    text: "Nigdy w życiu nie spotkałem lekarza z tak holistycznym podejściem do leczenia. Pan dr to pasjonat. Bardzo dokładny wywiad, doktor szuka niestandardowych rozwiązań, dokładnie tłumaczy leczenie. Polecam.",
    rating: 5,
    dateISO: "2026-08-07",
    date: "Sierpień 2026",
  },
  {
    name: "Zbigniew G.",
    text: "Świetne rzeczowe podejście do badania. Gorąco polecam!",
    rating: 5,
    dateISO: "2026-08-07",
    date: "Sierpień 2026",
  },
  {
    name: "Jarek H.",
    text: "Kompetentny, bezpośredni i rzetelny. Super kontakt. Polecam.",
    rating: 5,
    dateISO: "2026-08-06",
    date: "Sierpień 2026",
  },
  {
    name: "Krystyna",
    procedure: "Plan leczenia",
    text: "Polecam :) Profesjonalne, ale i empatyczne podejście do pacjenta. Omówiony plan leczenia.",
    rating: 4,
    dateISO: "2026-08-06",
    date: "Sierpień 2026",
  },
  {
    name: "Aneta",
    text: "Absolutnie wszystko idealnie. Bardzo empatyczny, konkretny, komunikatywny i profesjonalny lekarz. Polecam z całego serca.",
    rating: 5,
    dateISO: "2026-08-03",
    date: "Sierpień 2026",
  },
  {
    name: "W.",
    procedure: "Zabieg",
    text: "Lekarz bardzo przyjazny pacjentowi. Sprawnie wykonał zabieg. Objaśnił dalsze leczenie.",
    rating: 5,
    dateISO: "2026-08-03",
    date: "Sierpień 2026",
  },
  {
    name: "Damian",
    text: "Świetny lekarz, dokładnie wyjaśnił, o co chodzi, jakie będą skutki leczenia i rekonwalescencji.",
    rating: 5,
    dateISO: "2026-07-29",
    date: "Lipiec 2026",
  },
  {
    name: "Karol",
    procedure: "Konsultacja",
    text: "Wszystko było w porządku. Zostałem wysłuchany, zbadany i powstał wstępny plan leczenia.",
    rating: 5,
    dateISO: "2026-07-18",
    date: "Lipiec 2026",
  },
  {
    name: "Marcin",
    procedure: "Konsultacja proktologiczna",
    text: "Pan Doktor rzeczowo wyjaśnia schorzenia, z zaangażowaniem. Pacjent może poczuć się zaopiekowany.",
    rating: 5,
    dateISO: "2026-03-15",
    date: "Marzec 2026",
  },
  {
    name: "K. K.",
    procedure: "Konsultacja proktologiczna",
    text: "Dr przeprowadził wywiad i wszystko wyjaśnił. Poświęcił czas pacjentowi bez żadnego pośpiechu. Przedstawił odpowiednie metody leczenia.",
    rating: 5,
    dateISO: "2026-02-20",
    date: "Luty 2026",
  },
  {
    name: "Beata",
    procedure: "Konsultacja proktologiczna",
    text: "Bardzo miły, rzeczowy lekarz, szczegółowo wyjaśnia wszystko, polecam.",
    rating: 5,
    dateISO: "2026-02-10",
    date: "Luty 2026",
  },
  {
    name: "Agata",
    procedure: "Konsultacja proktologiczna",
    text: "Świetny lekarz z zaangażowaniem. Nie pamiętam, kiedy ostatnio u takiego byłam. Szczegółowo wyjaśnia problem, tłumaczy dokładnie leczenie i w razie potrzeby pozostaje z pacjentem w kontakcie po wizycie i modyfikuje leczenie tak, żeby było jak najbardziej skuteczne. W końcu śpię spokojnie, a to wszystko zasługa doktora, dziękuję ;)",
    rating: 5,
    dateISO: "2026-01-12",
    date: "Styczeń 2026",
  },
  {
    name: "Wiktoria",
    procedure: "Konsultacja",
    text: "Polecam pana doktora za ogromne zaangażowanie, szczegółowe wyjaśnienia oraz czas, który poświęcił podczas wizyty.",
    rating: 5,
    dateISO: "2025-09-18",
    date: "Wrzesień 2025",
  },
  {
    name: "Igor S.",
    procedure: "Konsultacja chirurgiczna",
    text: "W bardzo trudnej dla mnie sytuacji – zarówno fizycznie, jak i psychicznie – doktor Bujok pozwolił mi poczuć spokój. Dzięki trafnej diagnozie i wsparciu poczułem, że jest jeszcze światło w tunelu. Z ogromnym zaangażowaniem podjął się mojego leczenia i nie pozwolił, by nawet najmniejsza dolegliwość została przeoczona.",
    rating: 5,
    dateISO: "2025-05-22",
    date: "Maj 2025",
  },
];
