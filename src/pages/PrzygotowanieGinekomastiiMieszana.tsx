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
  Scale,
} from "lucide-react";
import PreparationPageTemplate, { type PreparationSection } from "@/components/shared/PreparationPageTemplate";

const sections: PreparationSection[] = [
  {
    title: "2–4 tygodnie przed zabiegiem",
    icon: CalendarDays,
    items: [
      {
        icon: Stethoscope,
        title: "Badania wstępne",
        text: "Wykonaj zlecone badania krwi: morfologia, układ krzepnięcia (APTT, INR, fibrynogen), grupa krwi, glukoza. Mężczyźni 40+: dodatkowo EKG i konsultacja kardiologiczna jeśli wskazana.",
      },
      {
        icon: Scale,
        title: "Stabilna waga",
        text: "Liposukcja Vaser HD modeluje sylwetkę. Najlepszy efekt uzyskasz, jeśli Twoja waga jest blisko docelowej i utrzymuje się stabilnie przez kilka tygodni przed zabiegiem.",
      },
      {
        icon: Pill,
        title: "Leki przeciwzakrzepowe i NLPZ",
        text: "Po konsultacji odstaw leki rozrzedzające krew (aspiryna, ibuprofen, naproksen) oraz suplementy zwiększające krwawienie (witamina E, omega-3, czosnek, miłorząb). Paracetamol jest bezpieczny.",
      },
      {
        icon: Cigarette,
        title: "Bez papierosów i e-papierosów",
        text: "Mieszany zabieg = liposukcja + nacięcie do wycięcia gruczołu. Nikotyna pogarsza zarówno gojenie rany, jak i obkurczanie się skóry. Odstaw 2–4 tygodnie przed i 4 tygodnie po.",
      },
      {
        icon: Camera,
        title: "Zdjęcia dokumentacyjne",
        text: "W gabinecie wykonamy zdjęcia klatki piersiowej (z przodu, z boku, w napięciu) — pokażą zarówno rozkład tłuszczu, jak i wyczuwalny gruczoł pod brodawką.",
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
        text: "Lekkostrawna kolacja do godziny 20:00. Jeśli planowane znieczulenie ogólne — 6 godzin postu (dokładne instrukcje przekaże anestezjolog).",
      },
      {
        icon: Droplets,
        title: "Nawodnienie",
        text: "Pij 2,5–3 l wody przez kilka dni przed zabiegiem. Dobrze nawodnione tkanki łatwiej się modelują, gojenie i obkurczanie skóry przebiegają sprawniej.",
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
        text: "Bawełniana koszula rozpinana z przodu, luźne spodnie. Po zabiegu będziesz miał szwy w okolicy brodawki + kamizelkę uciskową — wkładanie odzieży przez głowę będzie niemożliwe.",
      },
      {
        icon: AlertCircle,
        title: "Bez kremów i dezodorantu",
        text: "Klatka piersiowa, pachy i boki tułowia muszą być czyste, suche, bez balsamów, perfum i dezodorantu. Skóra musi być gotowa do dezynfekcji i nacięć.",
      },
      {
        icon: Briefcase,
        title: "Co zabrać",
        text: "Dowód osobisty, wyniki badań krwi i EKG, listę leków, kamizelkę uciskową — jeśli ustalaliśmy, że przyniesiesz własną. Zaplanuj odbiór z kliniki przez bliską osobę (nie prowadź samochodu).",
      },
    ],
  },
];

const PrzygotowanieGinekomastiiMieszana = () => (
  <PreparationPageTemplate
    procedureName="ginekomastii mieszanej"
    procedureHref="/leczenie/ginekomastia-mieszana"
    recoveryHref="/dla-pacjenta/zalecenia-po-ginekomastii"
    seoTitle="Przygotowanie do ginekomastii mieszanej | Checklista CML"
    seoDescription="Badania, leki, waga i kamizelka — checklista przed połączeniem Vaser Lipo HD z wycięciem gruczołu w jednej sesji. Wskazówki chirurgów CML Warszawa Wilanów."
    path="/dla-pacjenta/przygotowanie-ginekomastia-mieszana"
    intro="Ginekomastia mieszana — najczęstszy typ — wymaga podwójnego podejścia: liposukcji Vaser HD do tkanki tłuszczowej i mikronacięcia do wycięcia gruczołu. Te przygotowania pomogą Twojemu ciału zoptymalizować gojenie obu komponentów jednocześnie."
    sections={sections}
  />
);

export default PrzygotowanieGinekomastiiMieszana;
