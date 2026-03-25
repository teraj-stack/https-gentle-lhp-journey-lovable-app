import HeroHome from "@/components/home/HeroHome";
import TrustBar from "@/components/home/TrustBar";
import Philosophy from "@/components/home/Philosophy";
import ServiceCards from "@/components/home/ServiceCards";
import DoctorSection from "@/components/home/DoctorSection";
import Testimonials from "@/components/home/Testimonials";
import B2BSection from "@/components/home/B2BSection";
import FAQTeaser from "@/components/home/FAQTeaser";
import SeoHead from "@/components/shared/SeoHead";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "CML – Centrum Medycyny Laserowej",
  "description": "Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok. Proktologia i flebologia laserowa w klinikach premium.",
  "url": "https://gentle-lhp-journey.lovable.app",
  "logo": "https://gentle-lhp-journey.lovable.app/logo.png",
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
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "ul. Adama Branickiego 10/U6",
        "addressLocality": "Warszawa",
        "postalCode": "02-972",
        "addressCountry": "PL"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      }
    },
    {
      "@type": "MedicalClinic",
      "name": "CML Siedlce – Beauty & Mind",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "ul. Brzeska 125",
        "addressLocality": "Siedlce",
        "postalCode": "08-110",
        "addressCountry": "PL"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "20:00"
      }
    }
  ],
  "sameAs": []
};

const Home = () => (
  <div className="min-h-screen">
    <SeoHead
      title="CML – Centrum Medycyny Laserowej"
      description="Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w klinikach premium. Warszawa Wilanów i Siedlce. Umów konsultację."
      path="/"
      type="website"
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
    />
    <HeroHome />
    <TrustBar />
    <Philosophy />
    <ServiceCards />
    <DoctorSection />
    <Testimonials />
    <B2BSection />
    <FAQTeaser />
  </div>
);

export default Home;
