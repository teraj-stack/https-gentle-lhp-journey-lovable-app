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
        text: "Jeśli przyjmujesz leki przeciwzakrzepowe — koniecznie nas o tym poinformuj. Lekarz zdecyduje o ewentualnej modyfikacji w porozumieniu z Twoim lekarzem prowadzącym.",
      },
      {
        icon: Droplets,
        title: "Miękki stolec",
        text: "Pij 2–2,5 l wody dziennie i wprowadź dietę bogatą w błonnik (warzywa, owoce, pełne ziarna). Plastyka okolicy odbytu wymaga komfortu wypróżnień przez pierwsze dni po zabiegu.",
      },
      {
        icon: AlertCircle,
        title: "Bez golenia okolicy",
        text: "Nie goluj okolicy odbytu w przeddzień zabiegu. Skóra musi być nienaruszona, aby zminimalizować ryzyko infekcji.",
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
        text: "Lekkostrawna, niewielka porcja. Bez alkoholu. Jeśli planowane znieczulenie ogólne — lekarz osobno przekaże instrukcje dotyczące postu.",
      },
      {
        icon: SprayCan,
        title: "Higiena",
        text: "Spokojny prysznic. Okolicę krocza umyj wyłącznie wodą i delikatnym mydłem. Bez kremów, balsamów, perfum.",
      },
    ],
  },
  {
    title: "W dniu zabiegu",
    icon: Shirt,
    items: [
      {
        icon: Shirt,
        title: "Wygodne, luźne ubranie",
        text: "Bawełniana bielizna, luźne spodnie, które nie będą uciskać operowanej okolicy. Po zabiegu założymy delikatny opatrunek.",
      },
      {
        icon: Scissors,
        title: "Czysta, sucha skóra",
        text: "Rano umyj okolicę odbytu wodą i delikatnym mydłem. Bez pudrów, dezodorantów, kremów na operowanej okolicy.",
      },
      {
        icon: AlertCircle,
        title: "Co zabrać",
        text: "Dowód osobisty, listę leków, wyniki ostatnich badań (morfologia, układ krzepnięcia — jeśli były wykonywane).",
      },
    ],
  },
];

const PrzygotowaniePlastyka = () => (
  <PreparationPageTemplate
    procedureName="plastyki okolicy odbytu"
    procedureHref="/leczenie/plastyka"
    recoveryHref="/dla-pacjenta/zalecenia-po-plastyce"
    seoTitle="Przygotowanie do plastyki odbytu | Checklista | CML"
    seoDescription="Dieta, wypróżnienie, higiena okolicy i co zabrać ze sobą przed laserową plastyką okolicy odbytu. Checklista proktologów CML Warszawa Wilanów krok po kroku."
    path="/dla-pacjenta/przygotowanie-plastyka"
    intro="Plastyka okolicy odbytu wykonywana jest laserowo, bez szwów. Te proste kroki przygotują Twój organizm i okolicę zabiegową do bezpiecznego, komfortowego zabiegu."
    sections={sections}
  />
);

export default PrzygotowaniePlastyka;
