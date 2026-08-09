import { lazy, Suspense } from "react";
import DoctorSection from "@/components/home/DoctorSection";
import HeroFAQ from "@/components/home/HeroFAQ";
import HeroStickyMobileCTA from "@/components/home/HeroStickyMobileCTA";
import TrustBar from "@/components/home/TrustBar";
import Philosophy from "@/components/home/Philosophy";
import SeoHead from "@/components/shared/SeoHead";
import ClinicJsonLd from "@/components/shared/ClinicJsonLd";

const ServiceCards = lazy(() => import("@/components/home/ServiceCards"));
const Testimonials = lazy(() => import("@/components/home/Testimonials"));
const B2BSection = lazy(() => import("@/components/home/B2BSection"));
const FAQTeaser = lazy(() => import("@/components/home/FAQTeaser"));
const HomePreparationSection = lazy(() => import("@/components/home/HomePreparationSection"));

const Home = () => (
  // pb = sticky CTA (~5rem) + safe-area-inset-bottom (notch / home indicator)
  <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
    <SeoHead
      title="CML – Centrum Medycyny Laserowej"
      description="Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w Warszawie Wilanów (ul. Branickiego 10/U6). Umów konsultację."
      path="/"
      type="website"
    />
    <ClinicJsonLd />
    <DoctorSection />
    <HeroFAQ />
    <TrustBar />
    <Philosophy />
    <Suspense fallback={null}>
      <ServiceCards />
      <Testimonials />
      <HomePreparationSection />
      <B2BSection />
      <FAQTeaser />
    </Suspense>
    <HeroStickyMobileCTA />
  </div>
);

export default Home;
