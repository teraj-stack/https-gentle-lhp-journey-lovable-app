import {
  CalendarDays,
  Droplets,
  Pill,
  SprayCan,
  Shirt,
  Coffee,
  AlertCircle,
  Clock,
  Scissors,
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
        text: "Jeśli przyjmujesz leki przeciwzakrzepowe, koniecznie nas o tym poinformuj. Lekarz indywidualnie ustali, czy i jak modyfikować dawkowanie przed zabiegiem SiLaC.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Wypijaj 2–2,5 l wody dziennie. Lepiej widoczne tkanki, łatwiejsza praca lasera, sprawniejsza regeneracja.",
      },
      {
        icon: AlertCircle,
        title: "Bez golenia okolicy zatoki",
        text: "Nie goluj okolicy zatoki włosowej w tygodniu poprzedzającym zabieg — przygotujemy obszar profesjonalnie tuż przed procedurą, aby zminimalizować ryzyko podrażnień i infekcji.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: Clock,
    items: [
      {
        icon: Coffee,
        title: "Lekka kolacja",
        text: "Jedz normalnie, ale lekkostrawnie. Unikaj alkoholu — wpływa na krzepliwość i regenerację.",
      },
      {
        icon: SprayCan,
        title: "Wieczorna kąpiel",
        text: "Dokładnie umyj okolicę kości krzyżowej i zatoki. Nie nakładaj balsamów, oliwek ani pudrów.",
      },
    ],
  },
  {
    title: "W dniu zabiegu",
    icon: Shirt,
    items: [
      {
        icon: Shirt,
        title: "Luźne, oddychające ubranie",
        text: "Wybierz spodnie, które nie uciskają okolicy krzyżowej. Bieliznę najlepiej bawełnianą.",
      },
      {
        icon: Scissors,
        title: "Czysta, sucha skóra",
        text: "Rano weź prysznic, wytrzyj okolicę zatoki delikatnym ręcznikiem. Bez kosmetyków, dezodorantów ani kremów na operowanym obszarze.",
      },
      {
        icon: AlertCircle,
        title: "Co zabrać",
        text: "Dowód osobisty, listę leków oraz wyniki ostatnich badań laboratoryjnych (jeśli były wykonywane).",
      },
    ],
  },
];

const PrzygotowanieSilac = () => (
  <PreparationPageTemplate
    procedureName="SiLaC"
    procedureHref="/leczenie/silac"
    recoveryHref="/dla-pacjenta/zalecenia-po-silac"
    seoTitle="Przygotowanie do zabiegu SiLaC | Checklista | CML"
    seoDescription="Nawodnienie, brak golenia okolicy zatoki, luźne ubranie i dokumenty — checklista przed laserowym zamknięciem torbieli pilonidalnej SiLaC w CML Warszawa."
    path="/dla-pacjenta/przygotowanie-silac"
    intro="SiLaC trwa około 30 minut, a Twoje przygotowanie jest minimalistyczne. Te kilka kroków sprawi, że zabieg pójdzie sprawnie, a regeneracja zatoki włosowej będzie szybsza."
    sections={sections}
  />
);

export default PrzygotowanieSilac;
