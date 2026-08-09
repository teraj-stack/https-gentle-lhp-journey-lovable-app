import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import CtaButton from "@/components/shared/CtaButton";
import ResponsiveImage from "@/components/shared/ResponsiveImage";
import drBujokPicture from "@/assets/dr-bujok.webp?w=360;540;720;1080&format=avif;webp&as=picture";

const ZNANY_LEKARZ_URL = "https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa";

const stagger = (delay = 0) => ({
  initial: { opacity: 0, y: 28, filter: "blur(5px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const DoctorSection = () => (
  <section className="py-20 md:py-28 bg-card">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-start">
        <motion.div {...stagger(0.15)} className="flex justify-center md:order-2">
          <div className="relative">
            <ResponsiveImage
              picture={drBujokPicture}
              alt="Dr Jan Bujok – chirurg, proktolog, flebolog"
              sizes="(min-width: 768px) 320px, 288px"
              imgClassName="w-72 md:w-80 aspect-[3/4] rounded-2xl object-cover shadow-2xl"
              priority
            />
            <div className="absolute -bottom-4 -right-4 w-72 md:w-80 aspect-[3/4] rounded-2xl bg-primary/20 -z-10" />
          </div>
        </motion.div>

        <motion.div {...stagger(0)}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">
            TWÓRCA CML - CENTRUM MEDYCYNY LASEROWEJ
          </p>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-6 leading-tight">
            Dr Jan Bujok
          </h1>

          <div className="premium-divider !mx-0 mb-8" />
          <p className="text-muted-foreground leading-relaxed mb-4">
            Specjalista chirurgii ogólnej, którego zawodową pasją są nowoczesne technologie stosowane w medycynie. Twórca Centrum Medycyny Laserowej — połączył wieloletnie doświadczenie chirurgiczne z głębokim zrozumieniem potrzeb pacjenta, budując nowy model opieki proktologicznej i flebologicznej w Polsce.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Dr Bujok nie tylko operuje — prowadzi autorskie szkolenia dla chirurgów i personelu medycznego z całego kraju. Jego filozofia opiera się na przekonaniu, że najlepsza technologia jest bezwartościowa bez empatii i partnerskiej relacji z pacjentem.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { num: "15+", label: "lat doświadczenia" },
              { num: "3000+", label: "zabiegów laserowych" },
              { num: "100+", label: "przeszkolonych lekarzy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-accent/50">
                <p className="text-2xl font-bold text-primary font-serif">{stat.num}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <CtaButton
              href={ZNANY_LEKARZ_URL}
              variant="hero"
              size="lg"
              className="w-full sm:w-auto min-h-12 px-5 sm:px-8 py-4 sm:py-6 text-sm sm:text-base justify-center"
              trackingId="home_hero_book_consultation"
              trackingLabel="Umów konsultację"
              trackingSource="DoctorSection"
              campaign={{
                source: "cml_site",
                medium: "cta_hero",
                campaign: "home_hero_booking",
                content: "umow_konsultacje",
              }}
            >
              Umów konsultację
              <ArrowRight className="w-4 h-4 ml-2" />
            </CtaButton>
            <CtaButton
              href={`${ZNANY_LEKARZ_URL}#calendar`}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-h-12 px-5 sm:px-8 py-4 sm:py-6 text-sm sm:text-base justify-center"
              trackingId="home_hero_check_slots"
              trackingLabel="Sprawdź dostępne terminy"
              trackingSource="DoctorSection"
              campaign={{
                source: "cml_site",
                medium: "cta_hero",
                campaign: "home_hero_booking",
                content: "sprawdz_terminy",
              }}
            >
              Sprawdź dostępne terminy
              <ArrowRight className="w-4 h-4 ml-2" />
            </CtaButton>
            <CtaButton
              href="/o-nas"
              variant="ghost"
              trackingId="home_hero_about_team"
              trackingSource="DoctorSection"
              className="w-full sm:w-auto min-h-11 justify-center sm:justify-start text-sm"
            >
              Poznaj cały zespół
              <ArrowRight className="w-4 h-4 ml-2" />
            </CtaButton>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default DoctorSection;
