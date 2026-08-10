import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";
import AboutHero from "@/components/about/AboutHero";
import AboutDoctor from "@/components/about/AboutDoctor";
import AboutPhilosophy from "@/components/about/AboutPhilosophy";
import AboutModel from "@/components/about/AboutModel";
import AboutAdvantages from "@/components/about/AboutAdvantages";
import AboutCTA from "@/components/about/AboutCTA";
import ScalesCards from "@/components/about/ScalesCards";
import SeoHead from "@/components/shared/SeoHead";
import ClinicJsonLd from "@/components/shared/ClinicJsonLd";

const medicalWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "O nas – CML Centrum Medycyny Laserowej",
  "description": "Poznaj dr. Jana Bujoka, twórcę projektu S.C.A.L.E., i filozofię CML. Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w Warszawie Wilanów.",
  "url": "https://mcml.pro/o-nas",
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
    "worksFor": { "@id": "https://mcml.pro/#clinic" }
  },
  "publisher": { "@id": "https://mcml.pro/#clinic" },
  "specialty": [
    { "@type": "MedicalSpecialty", "name": "Proctology" },
    { "@type": "MedicalSpecialty", "name": "Phlebology" }
  ],
  "mainEntity": { "@id": "https://mcml.pro/#clinic" }
};

const About = () => (
  <div className="min-h-screen pt-20">
    <SeoHead
      title="O nas | Dr Jan Bujok, chirurg proktolog i flebolog | CML"
      description="Poznaj dr. Jana Bujoka i filozofię S.C.A.L.E.: bezpieczeństwo, laser, empatia i pacjent jako świadomy partner. Umów konsultację w CML Warszawa Wilanów."
      path="/o-nas"
    />
    <ClinicJsonLd />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageSchema) }}
    />
    <AboutHero />
    <div className="max-w-5xl mx-auto px-4 pt-8">
      <Breadcrumbs items={BREADCRUMBS_MAP["/o-nas"]} />
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
