interface FaqItem {
  q: string;
  a: string;
}

interface FaqSchemaProps {
  faqs: FaqItem[];
  name: string;
  url: string;
}

const FaqSchema = ({ faqs, name, url }: FaqSchemaProps) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name,
    url,
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default FaqSchema;
