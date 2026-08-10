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
    title: "Tydzień przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Sun,
        title: "Bez opalania i samoopalaczy",
        text: "Skóra nie może być opalona ani pokryta samoopalaczem. Pigment absorbuje światło lasera i może doprowadzić do przebarwień. Unikaj solarium minimum 4 tygodnie wcześniej.",
      },
      {
        icon: Pill,
        title: "Leki rozrzedzające krew",
        text: "Jeśli przyjmujesz aspirynę, ibuprofen lub inne leki przeciwzakrzepowe, poinformuj nas wcześniej. Niektóre wymagają odstawienia 5–7 dni przed zabiegiem (po konsultacji z lekarzem prowadzącym).",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij 2–2,5 l wody dziennie. Lepsze ukrwienie skóry to czystsze efekty fototermolizy w zabiegu CLaCS.",
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
        text: "Alkohol rozszerza naczynia i pogarsza krzepliwość — zwiększa ryzyko zasinień po zabiegu.",
      },
      {
        icon: SprayCan,
        title: "Czysta skóra nóg",
        text: "Wieczorem nie nakładaj balsamów, kremów ani olejków na nogi. Skóra musi być idealnie czysta i sucha.",
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
        text: "Załóż luźną sukienkę, długą spódnicę lub luźne spodnie, które łatwo zdejmiesz i które nie będą uciskać nóg po zabiegu. Weź ze sobą pończochy uciskowe (klasa II), jeśli masz.",
      },
      {
        icon: Sun,
        title: "Bez kremów i kosmetyków na nogach",
        text: "Skóra nóg ma być czysta, bez balsamu, samoopalacza, perfum i pudrów.",
      },
      {
        icon: AlertCircle,
        title: "Lekki posiłek",
        text: "Zjedz coś lekkostrawnego 1–2 godziny przed zabiegiem. Nie musisz być na czczo. Unikaj kawy w nadmiarze.",
      },
    ],
  },
];

const PrzygotowanieClacs = () => (
  <PreparationPageTemplate
    procedureName="CLaCS"
    procedureHref="/leczenie/clacs"
    recoveryHref="/dla-pacjenta/zalecenia-po-clacs"
    seoTitle="Przygotowanie do zabiegu CLaCS | Checklista | CML Wilanów"
    seoDescription="Opalanie, kosmetyki, leki i ubranie — o czym pamiętać przed hybrydowym usuwaniem pajączków metodą CLaCS. Checklista flebologów CML Warszawa Wilanów. Zapraszamy."
    path="/dla-pacjenta/przygotowanie-clacs"
    intro="CLaCS to hybrydowa metoda usuwania pajączków łącząca laser przezskórny, krioterapię powietrzną i mikroskleroterapię. Te kilka kroków pomoże nam uzyskać najczystsze efekty."
    sections={sections}
  />
);

export default PrzygotowanieClacs;
