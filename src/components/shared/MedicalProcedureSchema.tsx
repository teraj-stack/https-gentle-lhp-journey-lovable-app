import { useEffect } from "react";
import {
  CLINIC_RATING,
  getProcedureSchemaEntry,
} from "@/content/procedures/procedureSchemaData";

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
  /** Wyłącz AggregateRating dla konkretnej strony */
  showRating?: boolean;
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
  showRating = true,
}: MedicalProcedureSchemaProps) => {
  useEffect(() => {
    const pageUrl = `https://mcml.pro${url}`;
    const entry = getProcedureSchemaEntry(url);

    const clinic = {
      "@type": "MedicalClinic",
      name: "CML – Centrum Medycyny Laserowej",
      url: "https://mcml.pro",
      telephone: "+48 510 432 361",
      address: {
        "@type": "PostalAddress",
        streetAddress: "ul. Adama Branickiego 10/U6",
        addressLocality: "Warszawa",
        postalCode: "02-972",
        addressCountry: "PL",
      },
    };

    const procedure: Record<string, unknown> = {
      "@type": "MedicalProcedure",
      "@id": `${pageUrl}#procedure`,
      name,
      description,
      ...(bodyLocation && { bodyLocation }),
      procedureType: `https://schema.org/${procedureType}Procedure`,
      ...(preparation && { preparation }),
      ...(followup && { followup }),
      ...(howPerformed && { howPerformed }),
      ...(risks && { seriousAdverseOutcome: { "@type": "MedicalEntity", name: risks } }),
      url: pageUrl,
      performer: {
        "@type": "Physician",
        name: "lek. med. Jan Bujok",
        medicalSpecialty: "Proctology",
      },
      availableService: clinic,
    };

    if (entry) {
      if (entry.duration) {
        procedure.duration = entry.duration;
      }
      if (entry.contraindications.length) {
        procedure.contraindication = entry.contraindications.map((item) => ({
          "@type": "MedicalContraindication",
          name: item,
        }));
      }
      if (entry.riskFactors.length) {
        procedure.riskFactor = entry.riskFactors.map((item) => ({
          "@type": "MedicalRiskFactor",
          name: item,
        }));
      }
    }

    const graph: Record<string, unknown>[] = [procedure];

    if (entry) {
      const priceSpecification = entry.priceTo
        ? {
            "@type": "PriceSpecification",
            minPrice: entry.priceFrom,
            maxPrice: entry.priceTo,
            priceCurrency: "PLN",
          }
        : {
            "@type": "PriceSpecification",
            minPrice: entry.priceFrom,
            priceCurrency: "PLN",
          };

      const service: Record<string, unknown> = {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name,
        description,
        serviceType: name,
        url: pageUrl,
        provider: clinic,
        areaServed: { "@type": "City", name: "Warszawa" },
        offers: {
          "@type": "Offer",
          url: pageUrl,
          priceCurrency: "PLN",
          price: entry.priceFrom,
          priceSpecification,
          availability: "https://schema.org/InStock",
          validFrom: "2026-01-01",
        },
        isSimilarTo: { "@id": `${pageUrl}#procedure` },
      };

      if (showRating) {
        service.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: CLINIC_RATING.ratingValue,
          reviewCount: CLINIC_RATING.reviewCount,
          bestRating: CLINIC_RATING.bestRating,
          worstRating: CLINIC_RATING.worstRating,
        };
      }

      graph.push(service);
    }

    const schema = {
      "@context": "https://schema.org",
      "@graph": graph,
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-procedure-schema", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [
    name,
    description,
    bodyLocation,
    procedureType,
    preparation,
    followup,
    howPerformed,
    risks,
    url,
    showRating,
  ]);

  return null;
};

export default MedicalProcedureSchema;
