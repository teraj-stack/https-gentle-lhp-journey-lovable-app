import HeroHome from "@/components/home/HeroHome";
import TrustBar from "@/components/home/TrustBar";
import Philosophy from "@/components/home/Philosophy";
import ServiceCards from "@/components/home/ServiceCards";
import DoctorSection from "@/components/home/DoctorSection";
import B2BSection from "@/components/home/B2BSection";
import FAQTeaser from "@/components/home/FAQTeaser";

const Home = () => (
  <div className="min-h-screen">
    <HeroHome />
    <TrustBar />
    <Philosophy />
    <ServiceCards />
    <DoctorSection />
    <B2BSection />
    <FAQTeaser />
  </div>
);

export default Home;
