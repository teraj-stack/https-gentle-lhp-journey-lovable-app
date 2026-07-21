import { motion } from "framer-motion";
import ceapSkala from "@/assets/ceap-skala.webp";

const stages = [
  { stage: "C1", label: "Pajączki naczyniowe", desc: "Drobne, rozszerzone naczynka widoczne tuż pod skórą. Zwykle problem estetyczny, ale mogą sygnalizować początek niewydolności żylnej." },
  { stage: "C2", label: "Żylaki", desc: "Wypukłe, kręte żyły o średnicy powyżej 3 mm. Często towarzyszą im ból, uczucie ciężkości i obrzęki nóg." },
  { stage: "C3", label: "Obrzęki żylne", desc: "Przewlekłe opuchnięcie kostek i podudzi spowodowane zastojem krwi. Nasila się pod koniec dnia i po dłuższym staniu." },
  { stage: "C4", label: "Zmiany troficzne", desc: "Przebarwienia skóry, egzema żylna, stwardnienie tkanki podskórnej. Skóra staje się cienka, sucha i podatna na uszkodzenia." },
  { stage: "C5", label: "Wygojone owrzodzenie", desc: "Blizna po przebytym owrzodzeniu żylnym. Bez leczenia przyczyny istnieje wysokie ryzyko nawrotu." },
  { stage: "C6", label: "Aktywne owrzodzenie", desc: "Otwarta, trudno gojąca się rana na podudziu. Najcięższe stadium wymagające pilnej interwencji flebologicznej." },
];

interface Props {
  fadeUp: Record<string, unknown>;
}

const CEAPSection = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Stopnie zaawansowania niewydolności żylnej w skali CEAP</h2>
    <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
      Klasyfikacja CEAP to międzynarodowy standard oceny zaawansowania przewlekłej choroby żylnej. Pozwala lekarzowi precyzyjnie określić stadium choroby i dobrać optymalne leczenie.
    </p>
    <div className="glass-card rounded-2xl p-6 md:p-10 max-w-3xl mx-auto">
      <img
        src={ceapSkala}
        alt="Skala CEAP — ocena kliniczna niewydolności żylnej od C1 (pajączki naczyniowe) do C6 (aktywne owrzodzenie)"
        width={1200}
        height={600}
        className="w-full rounded-xl mb-8"
        loading="lazy"
        decoding="async"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {stages.map((item, i) => (
          <motion.div
            key={item.stage}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex items-start gap-3"
          >
            <span className="shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">{item.stage}</span>
            <div>
              <h4 className="font-bold text-foreground text-sm">{item.label}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.section>
);

export default CEAPSection;
