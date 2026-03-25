import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AboutHero from "@/components/about/AboutHero";
import AboutDoctor from "@/components/about/AboutDoctor";
import AboutPhilosophy from "@/components/about/AboutPhilosophy";
import AboutModel from "@/components/about/AboutModel";
import AboutAdvantages from "@/components/about/AboutAdvantages";
import AboutCTA from "@/components/about/AboutCTA";
import ScalesCards from "@/components/about/ScalesCards";
import SeoHead from "@/components/shared/SeoHead";

const medicalWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "O nas – CML Centrum Medycyny Laserowej",
  "description": "Poznaj dr. Jana Bujoka, twórcę projektu S.C.A.L.E., i filozofię CML. Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok.",
  "url": "https://cml.pl/o-nas",
  "inLanguage": "pl-PL",
  "medicalAudience": {
    "@type": "MedicalAudience",
    "audienceType": "Patient"
  },
  "lastReviewed": "2026-03-25",
  "author": {
    "@type": "Person",
    "name": "lek. med. Jan Bujok",
    "jobTitle": "Chirurg ogólny, proktolog, flebolog",
    "description": "Twórca projektu S.C.A.L.E. (Safety, Clinical Trust, Aesthetic, Lasers, Empathy). Pionier proktologii estetycznej w Polsce.",
    "worksFor": {
      "@type": "MedicalBusiness",
      "name": "CML – Centrum Medycyny Laserowej"
    }
  },
  "publisher": {
    "@type": "MedicalBusiness",
    "name": "CML – Centrum Medycyny Laserowej",
    "telephone": "+48 572 001 200",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ul. Adama Branickiego 10/U6",
      "addressLocality": "Warszawa",
      "postalCode": "02-972",
      "addressCountry": "PL"
    }
  },
  "specialty": [
    { "@type": "MedicalSpecialty", "name": "Proctology" },
    { "@type": "MedicalSpecialty", "name": "Phlebology" }
  ],
  "mainEntity": {
    "@type": "MedicalBusiness",
    "name": "CML – Centrum Medycyny Laserowej",
    "telephone": "+48 572 001 200",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ul. Adama Branickiego 10/U6",
      "addressLocality": "Warszawa",
      "postalCode": "02-972",
      "addressCountry": "PL"
    }
  }
};

const About = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="O nas – dr Jan Bujok | CML Centrum Medycyny Laserowej"
      description="Poznaj dr. Jana Bujoka, twórcę projektu S.C.A.L.E., i filozofię CML. Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w Warszawie i Siedlcach."
      path="/o-nas"
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageSchema) }}
    />
    <AboutHero />
    <div className="max-w-5xl mx-auto px-4 pt-8">
      <Breadcrumbs items={[{ label: "O nas" }]} />
    </div>
    <AboutDoctor />
    <ScalesCards />
    <AboutPhilosophy />
    <AboutModel />
    <AboutAdvantages />
    <AboutCTA />
  </div>
);

export default About;
