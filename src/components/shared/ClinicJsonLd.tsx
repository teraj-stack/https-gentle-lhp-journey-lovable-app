/**
 * ClinicJsonLd — jedyne źródło prawdy dla Schema.org
 * MedicalOrganization / MedicalClinic / LocalBusiness dla CML.
 *
 * Jedyna aktywna lokalizacja: Warszawa Wilanów, ul. Adama Branickiego 10/U6.
 *
 * Emit na stronach z lokalizacją: Home, O nas, Kontakt, Współpraca, huby
 * zabiegowe. Nie duplikuj — jedna instancja na stronę wystarczy.
 */

const SITE_URL = "https://mcml.pro";

export const CLINIC_ADDRESS = {
  "@type": "PostalAddress" as const,
  streetAddress: "ul. Adama Branickiego 10/U6",
  addressLocality: "Warszawa",
  addressRegion: "mazowieckie",
  postalCode: "02-972",
  addressCountry: "PL",
};

export const CLINIC_GEO = {
  "@type": "GeoCoordinates" as const,
  latitude: 52.1657,
  longitude: 21.0647,
};

export const CLINIC_OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "12:00",
    closes: "20:00",
  },
];

/**
 * Kanoniczny obiekt organizacji — używany zarówno jako main entity strony,
 * jak i jako `publisher` / `worksFor` / `provider` w innych schematach.
 * `MedicalClinic` extends `MedicalOrganization` AND `MedicalBusiness` (→ LocalBusiness),
 * więc pojedynczy typ pokrywa wszystkie trzy hierarchie w rich results.
 * Zostawiamy `LocalBusiness` obok dla starszych parserów, które nie znają subklasy.
 */
export const CLINIC_ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": ["MedicalClinic", "LocalBusiness"],
  "@id": `${SITE_URL}/#clinic`,
  name: "CML – Centrum Medycyny Laserowej",
  alternateName: "CML Warszawa Wilanów",
  description:
    "Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok. Proktologia i flebologia laserowa w Warszawie Wilanów.",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-image.jpg`,
  telephone: "+48 510 432 361",
  email: "warszawa@cml.pl",
  priceRange: "$$",
  currenciesAccepted: "PLN",
  paymentAccepted: "Cash, Credit Card, Debit Card, BLIK",
  medicalSpecialty: ["Proctology", "Phlebology"],
  address: CLINIC_ADDRESS,
  geo: CLINIC_GEO,
  hasMap: "https://maps.google.com/?q=Adama+Branickiego+10,+02-972+Warszawa",
  openingHoursSpecification: CLINIC_OPENING_HOURS,
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Warszawa i Mazowsze",
  },
  founder: {
    "@type": "Person",
    name: "lek. med. Jan Bujok",
    jobTitle: "Specjalista proktolog, flebolog",
  },
  sameAs: [] as string[],
};

interface ClinicJsonLdProps {
  /**
   * When true, wraps the clinic schema in a `MedicalClinic` `location` array
   * on top of a parent `MedicalBusiness`. Default false — the flat schema
   * already includes `MedicalClinic` in its `@type`.
   */
  variant?: "default";
}

/**
 * Renders the canonical JSON-LD blob for the clinic. Safe to include on any
 * page that displays location, contact info, or acts as an entry point.
 */
const ClinicJsonLd: React.FC<ClinicJsonLdProps> = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(CLINIC_ORGANIZATION) }}
  />
);

export default ClinicJsonLd;
