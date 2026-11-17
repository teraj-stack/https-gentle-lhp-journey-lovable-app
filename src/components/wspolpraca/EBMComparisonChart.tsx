import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

const data = [
  { name: "Skrócenie czasu\nkonsultacji podstawowej", silosowa: 98, cml: 38 },
  { name: "Szacunkowy poziom\nstresu na pierwszej wizycie", silosowa: 85, cml: 24 },
  { name: "Gotowość do współpracy\n(Compliance)", silosowa: 44, cml: 89 },
];

const COLORS = {
  silosowa: "hsl(var(--muted-foreground))",
  cml: "hsl(var(--primary))",
};

const CustomTick = ({ x, y, payload }: any) => {
  const lines = payload.value.split("\n");
  return (
    <text x={x} y={y + 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">
      {lines.map((line: string, i: number) => (
        <tspan x={x} dy={i === 0 ? 0 : 14} key={i}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

const EBMComparisonChart = () => (
  <div className="glass-card rounded-2xl p-6 md:p-8">
    <div className="border-l-4 border-l-primary bg-primary/5 rounded-r-xl p-5 mb-8">
      <p className="font-semibold text-foreground text-sm mb-1">Wniosek zarządczy:</p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Preedukacja zewnętrzna obniża stres, co ułatwia przeprowadzenie wywiadu i przyspiesza harmonogramy lekarskie.
      </p>
    </div>

    <div className="w-full h-[320px] md:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tick={<CustomTick />}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            interval={0}
            height={70}
          />
          <YAxis
            label={{
              value: "Znormalizowany Wskaźnik Wpływu",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11 },
              className: "fill-muted-foreground",
            }}
            tick={{ fontSize: 11, className: "fill-muted-foreground" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number, name: string) => [
              `${value}`,
              name === "silosowa" ? "Opieka Silosowa" : "Standard CML",
            ]}
          />
          <Legend
            formatter={(value) =>
              value === "silosowa"
                ? "Opieka silosowa (bez edukacji wstępnej)"
                : "Standard CML (z edukacją wstępną)"
            }
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <Bar dataKey="silosowa" radius={[4, 4, 0, 0]} barSize={50} fill="hsl(var(--muted-foreground))" animationDuration={1200} animationBegin={200} animationEasing="ease-out" />
          <Bar dataKey="cml" radius={[4, 4, 0, 0]} barSize={50} fill="hsl(var(--primary))" animationDuration={1200} animationBegin={600} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default EBMComparisonChart;
