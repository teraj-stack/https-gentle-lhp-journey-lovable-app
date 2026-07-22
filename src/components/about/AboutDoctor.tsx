import { motion } from "framer-motion";
import ResponsiveImage from "@/components/shared/ResponsiveImage";
import drBujokPicture from "@/assets/dr-bujok.webp?w=360;540;720;1080&format=avif;webp&as=picture";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const AboutDoctor = () => (
  <section className="py-20 md:py-28">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-start">
        <motion.div {...fadeUp} className="flex justify-center lg:sticky lg:top-28">
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

        <motion.div {...fadeUp}>
          <p className="text-sm font-sans uppercase tracking-[0.15em] text-primary mb-4">Twórca projektu Centrum Medycyny Laserowej</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
            Dr Jan Bujok
          </h2>
          <p className="text-lg text-muted-foreground mb-6 font-serif italic">
            Chirurg ogólny · Proktolog · Flebolog
          </p>
          <div className="premium-divider !mx-0 mb-8" />

          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              Pionier w swojej dziedzinie – jako <strong className="text-foreground">pierwszy lekarz w Polsce</strong> zaczął wykonywać zabiegi z zakresu proktologii estetycznej, przełamując tabu i&nbsp;wprowadzając nowe standardy dbałości o intymny komfort pacjentów.
            </p>
            <p>
              Twórca projektu <strong className="text-foreground">Centrum Medycyny Laserowej</strong> — <span className="text-xs tracking-wide">(Safety, Clinical Trust, Aesthetic, Lasers, Empathy)</span> — inicjatywy rozwijanej w&nbsp;partnerstwie m.in. z&nbsp;Kliniką Ginekologii w&nbsp;Wilanowie. Łączy najnowocześniejsze technologie — laseroterapię, radiofrekwencję, CLaCS — z&nbsp;precyzyjną diagnostyką, osiągając spektakularne efekty lecznicze przy zachowaniu doskonałych rezultatów estetycznych.
            </p>
            <p>
              Specjalizuje się w małoinwazyjnym leczeniu żylaków (również zaawansowanych problemów żylnych), pajączków, naczynek, teleangiectazji, hemoroidów, szczelin i przetok.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 my-8">
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
        </motion.div>
      </div>
    </div>
  </section>
);

export default AboutDoctor;
