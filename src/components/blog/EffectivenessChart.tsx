import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Skuteczność\nzamknięcia (%)", laser: 50, sklero: 60, clacs: 90 },
  { name: "Sesje do\nefektu", laser: 4, sklero: 3, clacs: 1.5 },
  { name: "Nawroty\npo roku (skala)", laser: 8, sklero: 5, clacs: 1 },
  { name: "Komfort\npacjenta (1-10)", laser: 5, sklero: 3, clacs: 9 },
];

const COLORS = {
  laser: "hsl(210, 10%, 50%)",
  sklero: "hsl(35, 45%, 55%)",
  clacs: "hsl(185, 55%, 42%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1.5 whitespace-pre-line">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

const EffectivenessChart = () => (
  <div className="my-8 rounded-2xl border border-border bg-card/50 p-4 md:p-6">
    <h3 className="text-lg font-bold text-foreground mb-1 text-center">
      Porównanie skuteczności metod
    </h3>
    <p className="text-xs text-muted-foreground text-center mb-6">
      Laser (sam) vs Skleroterapia (sama) vs CLaCS (hybryda)
    </p>
    <div className="w-full h-[300px] md:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 12%, 25%)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(210, 8%, 60%)" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(210, 12%, 30%)" }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(210, 8%, 60%)" }}
            axisLine={{ stroke: "hsl(210, 12%, 30%)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(210, 10%, 15%)", opacity: 0.3 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="square"
          />
          <Bar dataKey="laser" name="Laser (sam)" fill={COLORS.laser} radius={[4, 4, 0, 0]} />
          <Bar dataKey="sklero" name="Skleroterapia (sama)" fill={COLORS.sklero} radius={[4, 4, 0, 0]} />
          <Bar dataKey="clacs" name="CLaCS (hybryda)" fill={COLORS.clacs} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <p className="text-[10px] text-muted-foreground/60 text-center mt-3 italic">
      * Dane orientacyjne na podstawie literatury medycznej i doświadczeń klinicznych
    </p>
  </div>
);

export default EffectivenessChart;
