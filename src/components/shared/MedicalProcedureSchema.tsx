import { useEffect } from "react";

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
  useEffect(() => {
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
      url: `https://mcml.pro${url}`,
      performer: {
        "@type": "Physician",
        name: "lek. med. Jan Bujok",
        medicalSpecialty: "Proctology",
      },
      availableService: {
        "@type": "MedicalClinic",
        name: "CML – Centrum Medycyny Laserowej",
        address: {
          "@type": "PostalAddress",
          streetAddress: "ul. Adama Branickiego 10/U6",
          addressLocality: "Warszawa",
          postalCode: "02-972",
          addressCountry: "PL",
        },
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-procedure-schema", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [name, description, bodyLocation, procedureType, preparation, followup, howPerformed, risks, url]);

  return null;
};

export default MedicalProcedureSchema;
