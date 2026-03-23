import HeroHome from "@/components/home/HeroHome";
import TrustBar from "@/components/home/TrustBar";
import Philosophy from "@/components/home/Philosophy";
import ServiceCards from "@/components/home/ServiceCards";
import DoctorSection from "@/components/home/DoctorSection";
import Testimonials from "@/components/home/Testimonials";
import B2BSection from "@/components/home/B2BSection";
import FAQTeaser from "@/components/home/FAQTeaser";
import SeoHead from "@/components/shared/SeoHead";

const Home = () => (
  <div className="min-h-screen">
    <SeoHead
      title="CML – Centrum Medycyny Laserowej"
      description="Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w klinikach premium. Warszawa Wilanów i Siedlce. Umów konsultację."
      path="/"
      type="website"
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
