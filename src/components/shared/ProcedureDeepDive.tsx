import { motion } from "framer-motion";

export interface DeepDiveStep {
  title: string;
  body: string;
}

export interface DeepDiveStat {
  value: string;
  label: string;
  source?: string;
}

export interface DeepDiveComparisonRow {
  method: string;
  effectiveness: string;
  invasiveness: string;
  recovery: string;
  note: string;
}

export interface ProcedureDeepDiveContent {
  /** Krótkie wprowadzenie merytoryczne (2–3 zdania) */
  intro: string;
  steps: DeepDiveStep[];
  recoveryIntro: string;
  recoveryPoints: DeepDiveStep[];
  outcomesIntro: string;
  stats: DeepDiveStat[];
  outcomesNote?: string;
  contraindicationsAbsolute: string[];
  contraindicationsRelative: string[];
  complications: DeepDiveStep[];
  comparisonIntro: string;
  comparison: DeepDiveComparisonRow[];
  comparisonNote?: string;
}

interface Props {
  content: ProcedureDeepDiveContent;
  fadeUp?: Record<string, unknown>;
}

const Section = ({
  title,
  children,
  fadeUp,
}: {
  title: string;
  children: React.ReactNode;
  fadeUp?: Record<string, unknown>;
}) => {
  const Wrapper = fadeUp ? motion.section : "section";
  return (
    <Wrapper {...((fadeUp ?? {}) as any)}>
      <h2 className="section-title mb-6 text-center">{title}</h2>
      {children}
    </Wrapper>
  );
};

const ProcedureDeepDive = ({ content, fadeUp }: Props) => (
  <div className="space-y-24">
    <Section title="Przebieg zabiegu krok po kroku" fadeUp={fadeUp}>
      <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">{content.intro}</p>
      <ol className="space-y-4 max-w-3xl mx-auto list-none">
        {content.steps.map((step, i) => (
          <li key={step.title} className="glass-card rounded-2xl p-5 md:p-6 flex gap-4">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm">
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>

    <Section title="Rekonwalescencja i powrót do normalnego życia" fadeUp={fadeUp}>
      <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">{content.recoveryIntro}</p>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {content.recoveryPoints.map((point) => (
          <div key={point.title} className="glass-card rounded-2xl p-5 md:p-6">
            <h3 className="font-semibold text-foreground mb-1">{point.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{point.body}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section title="Skuteczność i wyniki" fadeUp={fadeUp}>
      <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">{content.outcomesIntro}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {content.stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-6 text-center">
            <p className="font-heading text-3xl text-primary mb-2">{stat.value}</p>
            <p className="text-sm text-foreground font-medium">{stat.label}</p>
            {stat.source && <p className="text-xs text-muted-foreground mt-2">{stat.source}</p>}
          </div>
        ))}
      </div>
      {content.outcomesNote && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mx-auto mt-8 text-center">
          {content.outcomesNote}
        </p>
      )}
    </Section>

    <Section title="Przeciwwskazania i możliwe powikłania" fadeUp={fadeUp}>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-3">Przeciwwskazania bezwzględne</h3>
          <ul className="space-y-2">
            {content.contraindicationsAbsolute.map((item) => (
              <li key={item} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-3">Przeciwwskazania względne</h3>
          <ul className="space-y-2">
            {content.contraindicationsRelative.map((item) => (
              <li key={item} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {content.complications.map((c) => (
          <div key={c.title} className="rounded-2xl p-5 border border-border/60">
            <h4 className="font-medium text-foreground mb-1 text-sm">{c.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section title="Porównanie z innymi metodami" fadeUp={fadeUp}>
      <p className="section-subtitle mb-10 text-center max-w-3xl mx-auto">{content.comparisonIntro}</p>
      <div className="glass-card rounded-2xl overflow-x-auto max-w-4xl mx-auto">
        <table className="w-full text-sm min-w-[640px]">
          <caption className="sr-only">Porównanie metod leczenia</caption>
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider">
              <th scope="col" className="p-4 text-left text-muted-foreground">Metoda</th>
              <th scope="col" className="p-4 text-left text-primary">Skuteczność</th>
              <th scope="col" className="p-4 text-left text-primary">Inwazyjność</th>
              <th scope="col" className="p-4 text-left text-primary">Powrót do aktywności</th>
              <th scope="col" className="p-4 text-left text-primary">Komentarz</th>
            </tr>
          </thead>
          <tbody>
            {content.comparison.map((row, i) => (
              <tr key={row.method} className={i < content.comparison.length - 1 ? "border-b border-border/50" : ""}>
                <th scope="row" className="p-4 text-left font-medium text-foreground">{row.method}</th>
                <td className="p-4 text-muted-foreground">{row.effectiveness}</td>
                <td className="p-4 text-muted-foreground">{row.invasiveness}</td>
                <td className="p-4 text-muted-foreground">{row.recovery}</td>
                <td className="p-4 text-muted-foreground">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {content.comparisonNote && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mx-auto mt-8 text-center">
          {content.comparisonNote}
        </p>
      )}
    </Section>
  </div>
);

export default ProcedureDeepDive;
