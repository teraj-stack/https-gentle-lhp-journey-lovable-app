import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Klasyczna\nOperacja", days: 21, label: "~21 dni" },
  { name: "LHP\n(Laser)", days: 5, label: "~5 dni" },
];

const COLORS = ["hsl(210, 10%, 58%)", "hsl(178, 42%, 36%)"];

const ComparisonChart = () => (
  <div className="w-full max-w-[700px] mx-auto h-[300px] md:h-[350px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 12%, 86%)" />
        <XAxis dataKey="name" tick={{ fontSize: 13, fill: "hsl(210, 18%, 18%)" }} tickLine={false} />
        <YAxis
          label={{ value: "Dni na L4", angle: -90, position: "insideLeft", style: { fontSize: 13, fill: "hsl(210, 18%, 18%)" } }}
          tick={{ fontSize: 12, fill: "hsl(210, 18%, 18%)" }}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(210, 12%, 86%)", background: "#fff", color: "hsl(210, 18%, 18%)" }}
          formatter={(value: number) => [`${value} dni`, "Czas L4"]}
        />
        <Bar dataKey="days" radius={[8, 8, 0, 0]} barSize={80}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <div className="flex justify-center gap-6 text-sm mt-2">
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm bg-muted-foreground inline-block" />
        🔪 Klasyczna Operacja: Ryzyko, ból, długie L4
      </span>
      <span className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
        ✨ LHP (Laser): Ochrona zwieraczy, szybki powrót
      </span>
    </div>
  </div>
);

export default ComparisonChart;
