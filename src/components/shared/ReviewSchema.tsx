import { useEffect } from "react";
import {
  testimonials as allTestimonials,
  CLINIC_AGGREGATE_RATING,
  TESTIMONIALS_SOURCE,
  TESTIMONIALS_SOURCE_URL,
  type Testimonial,
} from "@/content/testimonials";

interface ReviewSchemaProps {
  /** Podzbiór opinii do oznaczenia (domyślnie wszystkie) */
  items?: Testimonial[];
  /** Dołącz AggregateRating (tylko raz na stronę) */
  includeAggregate?: boolean;
}

/**
 * JSON-LD Review + AggregateRating dla profilu lekarza.
 * Wszystkie recenzje pochodzą z publicznego profilu ZnanyLekarz —
 * publisher wskazany jawnie (brak "self-serving reviews").
 */
const ReviewSchema = ({ items, includeAggregate = true }: ReviewSchemaProps) => {
  useEffect(() => {
    const list = items ?? allTestimonials;

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Physician",
      "@id": "https://mcml.pro/#physician",
      name: "Dr Jan Bujok — CML Centrum Medycyny Laserowej",
      url: "https://mcml.pro/",
      telephone: "+48 510 432 361",
      medicalSpecialty: ["Phlebology", "Surgical"],
      address: {
        "@type": "PostalAddress",
        streetAddress: "ul. Adama Branickiego 10/U6",
        addressLocality: "Warszawa",
        postalCode: "02-972",
        addressCountry: "PL",
      },
      review: list.map((t) => ({
        "@type": "Review",
        author: { "@type": "Person", name: t.name },
        datePublished: t.dateISO,
        reviewBody: t.text,
        reviewRating: {
          "@type": "Rating",
          ratingValue: t.rating,
          bestRating: 5,
          worstRating: 1,
        },
        publisher: {
          "@type": "Organization",
          name: TESTIMONIALS_SOURCE,
          url: TESTIMONIALS_SOURCE_URL,
        },
      })),
    };

    if (includeAggregate) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: CLINIC_AGGREGATE_RATING.ratingValue,
        reviewCount: CLINIC_AGGREGATE_RATING.reviewCount,
        bestRating: CLINIC_AGGREGATE_RATING.bestRating,
        worstRating: CLINIC_AGGREGATE_RATING.worstRating,
      };
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-review-schema", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items, includeAggregate]);

  return null;
};

export default ReviewSchema;
