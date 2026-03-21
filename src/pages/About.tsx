import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AboutHero from "@/components/about/AboutHero";
import AboutDoctor from "@/components/about/AboutDoctor";
import AboutPhilosophy from "@/components/about/AboutPhilosophy";
import AboutModel from "@/components/about/AboutModel";
import AboutAdvantages from "@/components/about/AboutAdvantages";
import AboutCTA from "@/components/about/AboutCTA";

const About = () => (
  <div className="min-h-screen pt-20">
    <AboutHero />
    <div className="max-w-5xl mx-auto px-4 pt-8">
      <Breadcrumbs items={[{ label: "O nas" }]} />
    </div>
    <AboutDoctor />
    <AboutPhilosophy />
    <AboutModel />
    <AboutAdvantages />
    <AboutCTA />
  </div>
);

export default About;
