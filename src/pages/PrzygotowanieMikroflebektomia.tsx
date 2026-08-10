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
        text: "Jeśli przyjmujesz leki wpływające na krzepliwość krwi, koniecznie nas powiadom. Lekarz indywidualnie ustali, czy odstawić je przed mikroflebektomią.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij 2–2,5 l wody dziennie. Lepsze ukrwienie i widoczność żył podczas USG = precyzyjniejsze nakłucia.",
      },
      {
        icon: Scissors,
        title: "Nie golić nóg",
        text: "Nie goluj nóg w przeddzień zabiegu. Mikrouszkodzenia skóry zwiększają ryzyko infekcji w miejscach mikronakłuć.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: Clock,
    items: [
      {
        icon: Coffee,
        title: "Bez alkoholu",
        text: "Alkohol rozszerza naczynia i utrudnia kontrolę krwawienia z mikronakłuć.",
      },
      {
        icon: SprayCan,
        title: "Czysta, odtłuszczona skóra",
        text: "Wieczorem nie nakładaj balsamów, kremów ani samoopalaczy. Skóra musi być idealnie czysta — to klucz do sterylności.",
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
        text: "Obowiązkowo weź ze sobą pończochę uciskową — założysz ją bezpośrednio po zabiegu i będziesz nosić zgodnie z zaleceniami przez kilka tygodni.",
      },
      {
        icon: AlertCircle,
        title: "Luźne, wygodne ubranie",
        text: "Spodnie, które łatwo założysz na pończochę. Wygodne buty bez obcasa.",
      },
      {
        icon: Coffee,
        title: "Lekki posiłek",
        text: "Zjedz coś lekkostrawnego 1–2 godziny przed zabiegiem. Nie musisz być na czczo (zabieg w znieczuleniu miejscowym tumescencyjnym).",
      },
    ],
  },
];

const PrzygotowanieMikroflebektomia = () => (
  <PreparationPageTemplate
    procedureName="mikroflebektomii"
    procedureHref="/leczenie/mikroflebektomia"
    recoveryHref="/dla-pacjenta/zalecenia-po-mikroflebektomii"
    seoTitle="Przygotowanie do mikroflebektomii | Checklista | CML"
    seoDescription="Leki, posiłek, higiena nóg i pończochy uciskowe — praktyczna checklista przed mikroflebektomią piankową żylaków. Wskazówki flebologów CML Warszawa."
    path="/dla-pacjenta/przygotowanie-mikroflebektomia"
    intro="Mikroflebektomia piankowa to małoinwazyjne usunięcie żylaków przez mikronakłucia. Te proste kroki przed zabiegiem zapewnią sterylność, precyzję i komfort regeneracji."
    sections={sections}
  />
);

export default PrzygotowanieMikroflebektomia;
