interface MedicalWebPageSchemaProps {
  name: string;
  description: string;
  path: string;
  specialty?: "Proctology" | "Phlebology" | string;
  audienceType?: "Patient" | "Clinician";
}

const MedicalWebPageSchema = ({
  name,
  description,
  path,
  specialty = "Proctology",
  audienceType = "Patient",
}: MedicalWebPageSchemaProps) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name,
    description,
    url: `https://mcml.pro${path}`,
    inLanguage: "pl-PL",
    lastReviewed: "2026-03-25",
    specialty: {
      "@type": "MedicalSpecialty",
      name: specialty,
    },
    medicalAudience: {
      "@type": "MedicalAudience",
      audienceType,
    },
    author: {
      "@type": "Person",
      name: "lek. med. Jan Bujok",
      jobTitle: "Chirurg ogólny, proktolog, flebolog",
      description:
        "Twórca projektu S.C.A.L.E. (Safety, Clinical Trust, Aesthetic, Lasers, Empathy).",
    },
    publisher: {
      "@type": "MedicalBusiness",
      name: "CML – Centrum Medycyny Laserowej",
      telephone: "+48 572 001 200",
      address: {
        "@type": "PostalAddress",
        streetAddress: "ul. Adama Branickiego 10/U6",
        addressLocality: "Warszawa",
        postalCode: "02-972",
        addressCountry: "PL",
      },
    },
    mainEntity: {
      "@type": "MedicalBusiness",
      name: "CML – Centrum Medycyny Laserowej",
      telephone: "+48 572 001 200",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default MedicalWebPageSchema;
