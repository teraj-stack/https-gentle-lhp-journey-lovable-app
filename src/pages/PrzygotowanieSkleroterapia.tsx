import {
  CalendarDays,
  Droplets,
  Pill,
  Sun,
  Shirt,
  Coffee,
  AlertCircle,
  Clock,
  SprayCan,
} from "lucide-react";
import PreparationPageTemplate, { type PreparationSection } from "@/components/shared/PreparationPageTemplate";

const sections: PreparationSection[] = [
  {
    title: "Na kilka dni przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Pill,
        title: "Leki na krzepliwość",
        text: "Poinformuj nas, jeśli przyjmujesz leki przeciwzakrzepowe lub przeciwzapalne (np. aspirynę). Nie odstawiaj ich samodzielnie — lekarz indywidualnie zdecyduje o ewentualnej modyfikacji.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "2–2,5 l wody dziennie. Dobrze nawodnione żyły są lepiej widoczne na USG, co przyspiesza i poprawia precyzję skleroterapii.",
      },
      {
        icon: Sun,
        title: "Bez intensywnego opalania",
        text: "Unikaj solarium i intensywnej ekspozycji nóg na słońce na 2 tygodnie przed zabiegiem.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: Clock,
    items: [
      {
        icon: Coffee,
        title: "Lekkostrawna kolacja",
        text: "Jedz normalnie, unikaj alkoholu. Alkohol rozszerza naczynia i może utrudnić ocenę reakcji żył na sklerozant.",
      },
      {
        icon: SprayCan,
        title: "Bez balsamów na nogach",
        text: "Wieczorem dokładnie umyj nogi, ale nie nakładaj kremów, balsamów ani olejków. Czysta, odtłuszczona skóra to lepsza dezynfekcja i przyleganie opatrunków.",
      },
    ],
  },
  {
    title: "W dniu zabiegu",
    icon: Shirt,
    items: [
      {
        icon: Shirt,
        title: "Pończocha uciskowa II klasy",
        text: "Zabierz ze sobą pończochę uciskową — założysz ją od razu po zabiegu. Jeśli nie masz, kup ją wcześniej w sklepie medycznym lub poproś nas o pomoc w doborze.",
      },
      {
        icon: AlertCircle,
        title: "Wygodne, luźne ubranie",
        text: "Spodnie, które łatwo zdejmiesz i z powrotem założysz na pończochę uciskową. Buty bez obcasa.",
      },
      {
        icon: Coffee,
        title: "Lekki posiłek",
        text: "Zjedz coś 1–2 godziny przed zabiegiem. Nie musisz być na czczo.",
      },
    ],
  },
];

const PrzygotowanieSkleroterapia = () => (
  <PreparationPageTemplate
    procedureName="skleroterapii"
    procedureHref="/leczenie/skleroterapia"
    recoveryHref="/dla-pacjenta/zalecenia-po-skleroterapii"
    seoTitle="Przygotowanie do skleroterapii żylaków | Checklista CML"
    seoDescription="Co zrobić przed skleroterapią żylaków i pajączków: leki, kosmetyki, ubranie i pończochy uciskowe. Krótka checklista od flebologów CML Warszawa Wilanów."
    path="/dla-pacjenta/przygotowanie-skleroterapia"
    intro="Skleroterapia jest mało inwazyjna, ale kilka prostych kroków sprawi, że zabieg będzie efektywniejszy, a powrót do aktywności — szybszy."
    sections={sections}
  />
);

export default PrzygotowanieSkleroterapia;
