import {
  CalendarDays,
  Clock,
  Pill,
  Cigarette,
  Wine,
  Camera,
  Shirt,
  Coffee,
  AlertCircle,
  Droplets,
  Briefcase,
} from "lucide-react";
import PreparationPageTemplate, { type PreparationSection } from "@/components/shared/PreparationPageTemplate";

const sections: PreparationSection[] = [
  {
    title: "2 tygodnie przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Pill,
        title: "Leki przeciwzakrzepowe i NLPZ",
        text: "Po konsultacji z lekarzem prowadzącym odstaw leki rozrzedzające krew (aspiryna, ibuprofen, naproksen) oraz suplementy zwiększające krwawienie (witamina E, omega-3, czosnek, miłorząb, dziurawiec). Paracetamol jest bezpieczny.",
      },
      {
        icon: Cigarette,
        title: "Bez papierosów i e-papierosów",
        text: "Nikotyna zwęża naczynia krwionośne i znacząco pogarsza gojenie tkanek. Idealnie odstaw 2–4 tygodnie przed i 4 tygodnie po zabiegu. To największy modyfikowalny czynnik ryzyka powikłań.",
      },
      {
        icon: Camera,
        title: "Zdjęcia przed zabiegiem",
        text: "W gabinecie wykonamy standardowe zdjęcia dokumentacyjne klatki piersiowej (z przodu, z boku, w napięciu mięśni). Posłużą do oceny efektów. Mile widziane Twoje własne — w dobrym świetle, bez filtrów.",
      },
    ],
  },
  {
    title: "Dzień przed zabiegiem",
    icon: Clock,
    items: [
      {
        icon: Wine,
        title: "Bez alkoholu",
        text: "Alkohol rozrzedza krew i zwiększa ryzyko siniaków oraz krwawienia. Ostatni kieliszek minimum 24 godziny przed zabiegiem.",
      },
      {
        icon: Coffee,
        title: "Lekka kolacja",
        text: "Lekkostrawna, niewielka porcja. Jeśli planowane znieczulenie ogólne — 6 godzin postu przed zabiegiem (dokładne instrukcje przekaże anestezjolog).",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij 2–2,5 l wody przez kilka dni przed zabiegiem. Dobrze nawodnione tkanki łatwiej się modelują, a regeneracja przebiega szybciej.",
      },
    ],
  },
  {
    title: "W dniu zabiegu",
    icon: Shirt,
    items: [
      {
        icon: Shirt,
        title: "Wygodne, rozpinane ubranie",
        text: "Bawełniana koszula rozpinana z przodu, luźne spodnie. Po zabiegu założymy kamizelkę uciskową i zakładanie odzieży przez głowę będzie utrudnione.",
      },
      {
        icon: AlertCircle,
        title: "Bez kremów i dezodorantu",
        text: "Klatka piersiowa, pachy i okolica brodawek muszą być czyste, suche, bez balsamów, perfum i dezodorantu. Skóra musi być gotowa do dezynfekcji.",
      },
      {
        icon: Briefcase,
        title: "Co zabrać",
        text: "Dowód osobisty, listę przyjmowanych leków, wyniki badań (morfologia, układ krzepnięcia, EKG jeśli były zlecone), kamizelkę uciskową — jeśli ustalaliśmy, że przyniesiesz własną.",
      },
    ],
  },
];

const PrzygotowanieGinekomastii = () => (
  <PreparationPageTemplate
    procedureName="ginekomastii"
    procedureHref="/leczenie/ginekomastia"
    recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
    seoTitle="Przygotowanie do zabiegu ginekomastii | Checklista CML"
    seoDescription="Badania, leki, stabilna waga i kamizelka uciskowa — checklista przed korekcją ginekomastii (Vaser Lipo HD, gruczołowa, mieszana) w CML Warszawa Wilanów."
    path="/dla-pacjenta/przygotowanie-ginekomastii"
    intro="Korekcja ginekomastii to zabieg, który wymaga spokojnego, przemyślanego przygotowania. Te kilka kroków zminimalizują ryzyko powikłań, przyspieszą gojenie i zapewnią Ci komfort w dniu zabiegu — niezależnie od wariantu (Vaser Lipo HD, wycięcie gruczołu lub kombinacja)."
    sections={sections}
  />
);

export default PrzygotowanieGinekomastii;
