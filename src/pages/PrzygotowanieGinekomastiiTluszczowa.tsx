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
  Scale,
} from "lucide-react";
import PreparationPageTemplate, { type PreparationSection } from "@/components/shared/PreparationPageTemplate";

const sections: PreparationSection[] = [
  {
    title: "2–4 tygodnie przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Scale,
        title: "Stabilna waga",
        text: "Przed zabiegiem Vaser Lipo HD warto utrzymać stabilną wagę przez kilka tygodni. Liposukcja modeluje sylwetkę — zabieg da najlepszy efekt, jeśli Twoja waga jest blisko docelowej. Nie odchudzaj się intensywnie tuż przed zabiegiem.",
      },
      {
        icon: Pill,
        title: "Leki przeciwzakrzepowe i NLPZ",
        text: "Po konsultacji z lekarzem prowadzącym odstaw leki rozrzedzające krew (aspiryna, ibuprofen, naproksen) oraz suplementy zwiększające krwawienie (witamina E, omega-3, czosnek, miłorząb). Paracetamol jest bezpieczny.",
      },
      {
        icon: Cigarette,
        title: "Bez papierosów i e-papierosów",
        text: "Nikotyna zwęża naczynia i pogarsza obkurczanie się skóry po liposukcji. Idealnie odstaw 2–4 tygodnie przed i 4 tygodnie po zabiegu — kluczowe dla efektu „skóra przylega do mięśni”.",
      },
      {
        icon: Camera,
        title: "Zdjęcia dokumentacyjne",
        text: "W gabinecie wykonamy zdjęcia klatki piersiowej (z przodu, z boku, w napięciu) — pokażą rozkład tkanki tłuszczowej. Posłużą do precyzyjnego zaplanowania konturów Vaser HD i porównania efektów.",
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
        title: "Lekka kolacja",
        text: "Lekkostrawna, niewielka porcja. Vaser Lipo HD wykonujemy najczęściej w znieczuleniu miejscowym z sedacją — szczegółowe instrukcje co do postu przekaże lekarz.",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij 2,5–3 l wody przez kilka dni przed liposukcją. Dobrze nawodniona tkanka tłuszczowa łatwiej się emulguje pod wpływem ultradźwięków, a obrzęk pozabiegowy mija szybciej.",
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
        text: "Bawełniana koszula rozpinana z przodu, luźne spodnie. Po zabiegu założymy kamizelkę uciskową — wkładanie odzieży przez głowę będzie utrudnione.",
      },
      {
        icon: AlertCircle,
        title: "Bez kremów i dezodorantu",
        text: "Klatka piersiowa, pachy i boki tułowia muszą być czyste, suche, bez balsamów, perfum i dezodorantu. Skóra musi być gotowa do dezynfekcji i mikropunktowych nacięć.",
      },
      {
        icon: Briefcase,
        title: "Co zabrać",
        text: "Dowód osobisty, wyniki badań, listę leków, kamizelkę uciskową — jeśli ustalaliśmy, że przyniesiesz własną. Zaplanuj odbiór z kliniki przez bliską osobę.",
      },
    ],
  },
];

const PrzygotowanieGinekomastiiTluszczowa = () => (
  <PreparationPageTemplate
    procedureName="ginekomastii tłuszczowej"
    procedureHref="/leczenie/ginekomastia-tluszczowa"
    recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
    seoTitle="Przygotowanie do Vaser Lipo HD | Ginekomastia | CML"
    seoDescription="Stabilna waga, nawodnienie, leki i kamizelka uciskowa — checklista przed liposukcją ultradźwiękową Vaser Lipo HD przy ginekomastii tłuszczowej w CML."
    path="/dla-pacjenta/przygotowanie-ginekomastia-tluszczowa"
    intro="Vaser Lipo HD to precyzyjna liposukcja ultradźwiękowa, która rzeźbi kontury klatki piersiowej z minimalnym uszkodzeniem tkanek. Aby uzyskać najlepszy efekt — gładką, dobrze obkurczającą się skórę — warto się świadomie przygotować."
    sections={sections}
  />
);

export default PrzygotowanieGinekomastiiTluszczowa;
