import {
  CalendarDays,
  Droplets,
  Pill,
  Scissors,
  SprayCan,
  Shirt,
  Coffee,
  AlertCircle,
  Clock,
} from "lucide-react";
import PreparationPageTemplate, { type PreparationSection } from "@/components/shared/PreparationPageTemplate";

const sections: PreparationSection[] = [
  {
    title: "Na kilka dni przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Pill,
        title: "Leki przeciwzakrzepowe",
        text: "Jeżeli przyjmujesz na stałe leki wpływające na krzepliwość krwi (acenokumarol, warfarynę, NOAC, klopidogrel), poinformuj nas o tym z wyprzedzeniem. Lekarz zdecyduje o ewentualnej modyfikacji dawki — nigdy nie odstawiaj leków samodzielnie.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie i miękki stolec",
        text: "Pij więcej wody (2–2,5 l dziennie) i wprowadź dietę bogatą w błonnik. Unikniemy zaparć, które są największym wrogiem komfortu po zabiegu na przetoce.",
      },
      {
        icon: AlertCircle,
        title: "Higiena okolicy",
        text: "W okolicy operowanej nie stosuj kremów, maści ani depilacji w przeddzień zabiegu. Skóra musi być nienaruszona, aby zminimalizować ryzyko infekcji.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: Clock,
    items: [
      {
        icon: Coffee,
        title: "Kolacja i lekki posiłek",
        text: "W dniu poprzedzającym zabieg zjedz lekkostrawną kolację. Nie musisz być na czczo — chyba że lekarz zalecił inaczej w ramach znieczulenia ogólnego.",
      },
      {
        icon: SprayCan,
        title: "Higiena wieczorna",
        text: "Weź spokojną kąpiel lub prysznic. Okolicę krocza umyj wyłącznie wodą i delikatnym, neutralnym mydłem.",
      },
    ],
  },
  {
    title: "W dniu zabiegu",
    icon: Shirt,
    items: [
      {
        icon: Shirt,
        title: "Wygodne ubranie",
        text: "Załóż luźne, nieuciskające spodnie i bieliznę z naturalnych tkanin. Po zabiegu założymy delikatny opatrunek — nie chcemy, by cokolwiek na niego naciskało.",
      },
      {
        icon: Scissors,
        title: "Bez kosmetyków na okolicy",
        text: "Rano ostatecznie umyj okolicę odbytu wodą i nie nakładaj na nią żadnych pudrów, kremów ani perfum.",
      },
      {
        icon: AlertCircle,
        title: "Zabierz dokumenty",
        text: "Dowód osobisty, ostatnie wyniki badań (jeśli posiadasz: morfologia, układ krzepnięcia, USG endorektalne, RM miednicy) oraz listę przyjmowanych leków.",
      },
    ],
  },
];

const PrzygotowanieFilac = () => (
  <PreparationPageTemplate
    procedureName="FiLaC"
    procedureHref="/leczenie/filac"
    recoveryHref="/dla-pacjenta/zalecenia-po-filac"
    seoTitle="Przygotowanie do zabiegu FiLaC | Checklista | CML Wilanów"
    seoDescription="Badania, leki, dieta i higiena okolicy przed laserowym zamknięciem przetoki FiLaC — checklista krok po kroku od specjalistów CML w Warszawie Wilanowie."
    path="/dla-pacjenta/przygotowanie-filac"
    intro="Krótka, jasna lista kroków, które zapewnią bezpieczny i komfortowy zabieg laserowego zamknięcia przetoki (FiLaC). Wszystko, co warto zrobić w tygodniu, dniu i poranku przed zabiegiem."
    sections={sections}
  />
);

export default PrzygotowanieFilac;
