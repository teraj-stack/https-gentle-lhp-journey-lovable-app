import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Klasyczna\nOperacja", days: 21, label: "~21 dni" },
  { name: "LHP\n(Laser)", days: 5, label: "~5 dni" },
];

const COLORS = ["hsl(215, 16%, 47%)", "hsl(173, 85%, 32%)"];

const ComparisonChart = () => (
  <div className="w-full max-w-[700px] mx-auto h-[300px] md:h-[350px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 13, fill: "hsl(222, 84%, 5%)" }}
          tickLine={false}
        />
        <YAxis
          label={{ value: "Dni na L4", angle: -90, position: "insideLeft", style: { fontSize: 13 } }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(214, 32%, 91%)" }}
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
