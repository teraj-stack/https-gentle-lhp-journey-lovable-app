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
  Stethoscope,
} from "lucide-react";
import PreparationPageTemplate, { type PreparationSection } from "@/components/shared/PreparationPageTemplate";

const sections: PreparationSection[] = [
  {
    title: "2 tygodnie przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Stethoscope,
        title: "Badania wstępne",
        text: "Wykonaj zlecone badania krwi: morfologia, układ krzepnięcia (APTT, INR, fibrynogen), grupa krwi, glukoza. Mężczyźni 40+: dodatkowo EKG i konsultacja kardiologiczna jeśli jest wskazana.",
      },
      {
        icon: Pill,
        title: "Leki przeciwzakrzepowe i NLPZ",
        text: "Po konsultacji z lekarzem prowadzącym odstaw leki rozrzedzające krew (aspiryna, ibuprofen, naproksen) oraz suplementy zwiększające krwawienie (witamina E, omega-3, czosnek, miłorząb). Paracetamol jest bezpieczny.",
      },
      {
        icon: Cigarette,
        title: "Bez papierosów i e-papierosów",
        text: "Wycięcie gruczołu wymaga gojenia rany — nikotyna znacząco je pogarsza. Odstaw 2–4 tygodnie przed i 4 tygodnie po zabiegu. To największy modyfikowalny czynnik ryzyka.",
      },
      {
        icon: Camera,
        title: "Zdjęcia dokumentacyjne",
        text: "W gabinecie wykonamy standardowe zdjęcia klatki piersiowej (z przodu, z boku, w napięciu mięśni piersiowych). Pokażą wyraźnie wyczuwalny gruczoł pod brodawką i posłużą do oceny efektów.",
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
        text: "Alkohol zwiększa krwawienie i siniaki. Ostatni kieliszek minimum 24 godziny przed zabiegiem.",
      },
      {
        icon: Coffee,
        title: "Lekka kolacja i post",
        text: "Lekkostrawna kolacja do godziny 20:00. Jeśli planowane znieczulenie ogólne — 6 godzin postu przed zabiegiem (dokładne instrukcje przekaże anestezjolog).",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij 2–2,5 l wody przez kilka dni przed zabiegiem. Dobrze nawodnione tkanki łatwiej się goją, a regeneracja przebiega szybciej.",
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
        text: "Bawełniana koszula rozpinana z przodu, luźne spodnie. Po zabiegu będziesz miał szwy oraz kamizelkę uciskową — odzież przez głowę będzie utrudniona.",
      },
      {
        icon: AlertCircle,
        title: "Bez kremów i dezodorantu",
        text: "Klatka piersiowa, pachy i okolica brodawek muszą być czyste, suche, bez balsamów, perfum i dezodorantu. Skóra musi być gotowa do dezynfekcji i nacięć.",
      },
      {
        icon: Briefcase,
        title: "Co zabrać",
        text: "Dowód osobisty, wyniki badań krwi i EKG, listę leków, kamizelkę uciskową — jeśli ustalaliśmy, że przyniesiesz własną. Zaplanuj odbiór z kliniki przez bliską osobę (nie prowadź samochodu po znieczuleniu).",
      },
    ],
  },
];

const PrzygotowanieGinekomastiiGruczolowa = () => (
  <PreparationPageTemplate
    procedureName="ginekomastii gruczołowej"
    procedureHref="/leczenie/ginekomastia-gruczolowa"
    recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
    seoTitle="Przygotowanie do wycięcia gruczołu | Ginekomastia | CML"
    seoDescription="Badania, odstawienie leków, kamizelka i opieka po zabiegu — checklista przed chirurgicznym wycięciem gruczołu piersiowego w CML Warszawa Wilanów. Zapraszamy."
    path="/dla-pacjenta/przygotowanie-ginekomastia-gruczolowa"
    intro="Zabieg wycięcia gruczołu piersiowego (ginekomastia gruczołowa, prawdziwa) wymaga małego nacięcia w okolicy brodawki. Poniższe kroki przygotują Twój organizm i zminimalizują ryzyko powikłań — przeczytanie zajmie 5 minut, a może oszczędzić tygodnia rekonwalescencji."
    sections={sections}
  />
);

export default PrzygotowanieGinekomastiiGruczolowa;
