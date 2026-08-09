/**
 * Dane uzupełniające do JSON-LD stron zabiegowych:
 * cena (Offer / PriceSpecification), czas trwania, przeciwwskazania
 * (MedicalContraindication) i czynniki ryzyka (MedicalRiskFactor).
 *
 * Klucz = slug z URL-a strony (np. "/leczenie/evlt" -> "evlt").
 * Ceny muszą pozostać zgodne z /cennik.
 */

export interface ProcedureSchemaEntry {
  /** Cena minimalna w PLN */
  priceFrom: number;
  /** Cena maksymalna w PLN (gdy widełki); brak = cena stała */
  priceTo?: number;
  /** Czas trwania zabiegu w formacie ISO 8601, np. "PT45M" */
  duration?: string;
  /** Czy zabieg jest inwazyjny (mapowane na procedureType/opis) */
  contraindications: string[];
  riskFactors: string[];
}

/** Ocena kliniki z profilu ZnanyLekarz dr. Jana Bujoka */
export const CLINIC_RATING = {
  ratingValue: 5,
  reviewCount: 312,
  bestRating: 5,
  worstRating: 1,
} as const;

export const procedureSchemaData: Record<string, ProcedureSchemaEntry> = {
  evlt: {
    priceFrom: 5500,
    duration: "PT60M",
    contraindications: [
      "Ciąża i okres karmienia piersią",
      "Aktywna zakrzepica żył głębokich lub przebyta zatorowość płucna w trakcie leczenia",
      "Ciężkie niedokrwienie kończyny dolnej",
      "Aktywne zakażenie skóry w okolicy planowanego wkłucia",
      "Nieleczone zaburzenia krzepnięcia",
    ],
    riskFactors: [
      "Przejściowy ból i uczucie ciągnięcia wzdłuż leczonej żyły",
      "Zasinienia i krwiaki podskórne",
      "Przebarwienia skóry wzdłuż przebiegu żyły",
      "Rzadko: zapalenie żył powierzchownych, parestezje, zakrzepica żył głębokich",
    ],
  },
  mikroflebektomia: {
    priceFrom: 3500,
    duration: "PT60M",
    contraindications: [
      "Ciąża",
      "Aktywna zakrzepica żył głębokich",
      "Aktywne zakażenie skóry w polu zabiegowym",
      "Nieleczone zaburzenia krzepnięcia",
    ],
    riskFactors: [
      "Zasinienia i obrzęk kończyny przez kilka dni",
      "Drobne blizny w miejscach nakłuć",
      "Przejściowe zaburzenia czucia w okolicy usuniętych żylaków",
      "Rzadko: zakażenie rany, nawrót żylaków",
    ],
  },
  skleroterapia: {
    priceFrom: 600,
    duration: "PT30M",
    contraindications: [
      "Ciąża i karmienie piersią",
      "Alergia na środek obliterujący",
      "Aktywna zakrzepica żył głębokich",
      "Przetrwały otwór owalny (PFO) — w przypadku skleroterapii piankowej",
      "Unieruchomienie i wysokie ryzyko zakrzepowo-zatorowe",
    ],
    riskFactors: [
      "Przebarwienia skóry wzdłuż leczonych naczyń (zwykle przemijające)",
      "Matting — siateczka drobnych naczynek",
      "Przejściowy świąd i pieczenie",
      "Bardzo rzadko: owrzodzenie skóry, reakcja alergiczna",
    ],
  },
  clacs: {
    priceFrom: 500,
    duration: "PT45M",
    contraindications: [
      "Ciąża i karmienie piersią",
      "Świeża opalenizna lub fototyp skóry z wysokim ryzykiem przebarwień",
      "Aktywne infekcje skóry w miejscu zabiegu",
      "Fotodermatozy i przyjmowanie leków fotouczulających",
    ],
    riskFactors: [
      "Zaczerwienienie i obrzęk skóry przez 24–48 godzin",
      "Przejściowe przebarwienia pozapalne",
      "Strupki w miejscu naświetlania laserem",
      "Rzadko: nawrót pajączków wymagający kolejnej sesji",
    ],
  },
  lhp: {
    priceFrom: 4500,
    duration: "PT45M",
    contraindications: [
      "Aktywny stan zapalny lub ropień okolicy odbytu",
      "Nieleczona choroba zapalna jelit w fazie zaostrzenia",
      "Nieleczone zaburzenia krzepnięcia",
      "Ciąża",
    ],
    riskFactors: [
      "Ból i uczucie parcia przez kilka dni po zabiegu",
      "Niewielkie krwawienie przy wypróżnieniu",
      "Przejściowy obrzęk brzegów odbytu",
      "Rzadko: zatrzymanie moczu, zakażenie, nawrót choroby hemoroidalnej",
    ],
  },
  filac: {
    priceFrom: 4300,
    duration: "PT45M",
    contraindications: [
      "Aktywny ropień okolicy odbytu wymagający wcześniejszego drenażu",
      "Zaostrzenie choroby Leśniowskiego-Crohna",
      "Nieleczone zaburzenia krzepnięcia",
    ],
    riskFactors: [
      "Ból i sączenie z ujścia przetoki w pierwszych dniach",
      "Konieczność powtórzenia zabiegu przy złożonych przetokach",
      "Rzadko: zakażenie, nawrót przetoki",
      "Bardzo rzadko: zaburzenia trzymania gazów",
    ],
  },
  silac: {
    priceFrom: 8000,
    duration: "PT45M",
    contraindications: [
      "Aktywny ropień zatoki włosowej wymagający wcześniejszego nacięcia i drenażu",
      "Rozległe, wielokanałowe zmiany z martwicą tkanek",
      "Nieleczone zaburzenia krzepnięcia",
    ],
    riskFactors: [
      "Sączenie z kanału zatoki przez kilka dni",
      "Przejściowy ból okolicy krzyżowo-guzicznej",
      "Nawrót zatoki wymagający kolejnego zabiegu",
      "Rzadko: zakażenie rany",
    ],
  },
  szczelina: {
    priceFrom: 400,
    duration: "PT30M",
    contraindications: [
      "Aktywny ropień lub przetoka odbytu wymagająca innego leczenia",
      "Zaostrzenie nieswoistej choroby zapalnej jelit",
      "Nieleczone zaburzenia krzepnięcia",
    ],
    riskFactors: [
      "Ból przy wypróżnieniu w pierwszych dobach",
      "Niewielkie plamienie krwią",
      "Nawrót szczeliny przy utrzymujących się zaparciach",
    ],
  },
  anusitis: {
    priceFrom: 400,
    duration: "PT30M",
    contraindications: [
      "Aktywne zakażenie bakteryjne lub grzybicze wymagające wcześniejszego leczenia",
      "Zaostrzenie choroby zapalnej jelit",
    ],
    riskFactors: [
      "Przejściowe pieczenie i świąd po naświetlaniu",
      "Nawrót dolegliwości przy błędach dietetycznych",
    ],
  },
  plastyka: {
    priceFrom: 2500,
    duration: "PT45M",
    contraindications: [
      "Aktywny stan zapalny lub ropień okolicy odbytu",
      "Zaostrzenie choroby zapalnej jelit",
      "Nieleczone zaburzenia krzepnięcia",
      "Skłonność do bliznowców",
    ],
    riskFactors: [
      "Obrzęk i tkliwość okolicy odbytu przez kilka dni",
      "Sączenie z rany gojącej się przez ziarninowanie",
      "Rzadko: zakażenie rany, nierówne gojenie brzegów",
    ],
  },
  "spazm-lonowoodbytniczy": {
    priceFrom: 400,
    duration: "PT30M",
    contraindications: [
      "Aktywny stan zapalny okolicy odbytu",
      "Nierozpoznany ból miednicy wymagający wcześniejszej diagnostyki",
    ],
    riskFactors: [
      "Przejściowe nasilenie bólu po pierwszych sesjach terapii",
      "Konieczność długoterminowej rehabilitacji dna miednicy",
    ],
  },
};

export const getProcedureSchemaEntry = (
  url: string,
): ProcedureSchemaEntry | undefined => {
  const slug = url.split("/").filter(Boolean).pop();
  return slug ? procedureSchemaData[slug] : undefined;
};
