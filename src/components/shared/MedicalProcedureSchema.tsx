import { Helmet } from "react-helmet-async";

interface MedicalProcedureSchemaProps {
  name: string;
  description: string;
  bodyLocation?: string;
  procedureType?: "Surgical" | "Noninvasive" | "Percutaneous";
  preparation?: string;
  followup?: string;
  howPerformed?: string;
  risks?: string;
  url: string;
}

const MedicalProcedureSchema = ({
  name,
  description,
  bodyLocation,
  procedureType = "Percutaneous",
  preparation,
  followup,
  howPerformed,
  risks,
  url,
}: MedicalProcedureSchemaProps) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name,
    description,
    ...(bodyLocation && { bodyLocation }),
    procedureType: `https://schema.org/${procedureType}Procedure`,
    ...(preparation && { preparation }),
    ...(followup && { followup }),
    ...(howPerformed && { howPerformed }),
    ...(risks && { outcome: risks }),
    url: `https://bujokmedical.pl${url}`,
    performer: {
      "@type": "Physician",
      name: "lek. med. Kamil Bujok",
      medicalSpecialty: "Proctology",
    },
    availableService: {
      "@type": "MedicalClinic",
      name: "Bujok Medical – Centrum Medycyny Laserowej",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Żory",
        addressCountry: "PL",
      },
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default MedicalProcedureSchema;
