import { lazy, Suspense } from "react";
import DoctorSection from "@/components/home/DoctorSection";
import HeroFAQ from "@/components/home/HeroFAQ";
import HeroStickyMobileCTA from "@/components/home/HeroStickyMobileCTA";
import TrustBar from "@/components/home/TrustBar";
import Philosophy from "@/components/home/Philosophy";
import SeoHead from "@/components/shared/SeoHead";

const ServiceCards = lazy(() => import("@/components/home/ServiceCards"));
const Testimonials = lazy(() => import("@/components/home/Testimonials"));
const B2BSection = lazy(() => import("@/components/home/B2BSection"));
const FAQTeaser = lazy(() => import("@/components/home/FAQTeaser"));

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "CML – Centrum Medycyny Laserowej",
  "description": "Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok. Proktologia i flebologia laserowa w klinikach premium.",
  "url": "https://bestcml.io",
  "logo": "https://bestcml.io/logo.png",
  "telephone": "+48 572 001 200",
  "email": "Ginekologia@branickiego10.pl",
  "priceRange": "$$",
  "medicalSpecialty": ["Proctology", "Phlebology"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ul. Adama Branickiego 10/U6",
    "addressLocality": "Warszawa",
    "postalCode": "02-972",
    "addressCountry": "PL"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 52.1657,
    "longitude": 21.0647
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "18:00"
    }
  ],
  "founder": {
    "@type": "Person",
    "name": "lek. med. Jan Bujok",
    "jobTitle": "Specjalista proktolog"
  },
  "location": [
    {
      "@type": "MedicalClinic",
      "name": "CML Warszawa Wilanów",
      "telephone": "+48 572 001 200",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "ul. Adama Branickiego 10/U6",
        "addressLocality": "Warszawa",
        "postalCode": "02-972",
        "addressCountry": "PL"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 52.1657,
        "longitude": 21.0647
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      }
    }
  ],
  "sameAs": []
};

const Home = () => (
  // pb = sticky CTA (~5rem) + safe-area-inset-bottom (notch / home indicator)
  <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
    <SeoHead
      title="CML – Centrum Medycyny Laserowej"
      description="Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w klinikach premium. Warszawa Wilanów. Umów konsultację."
      path="/"
      type="website"
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
    />
    <DoctorSection />
    <HeroFAQ />
    <TrustBar />
    <Philosophy />
    <Suspense fallback={null}>
      <ServiceCards />
      <Testimonials />
      <B2BSection />
      <FAQTeaser />
    </Suspense>
    <HeroStickyMobileCTA />
  </div>
);

export default Home;
