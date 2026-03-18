import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const data = [
  { name: "Genetyka", value: 40 },
  { name: "Praca siedząca/stojąca", value: 25 },
  { name: "Ciąża i hormony", value: 20 },
  { name: "Styl życia", value: 15 },
];

const COLORS = [
  "hsl(185, 55%, 42%)",
  "hsl(185, 40%, 52%)",
  "hsl(210, 14%, 52%)",
  "hsl(210, 10%, 72%)",
];

const RiskFactorsChart = () => (
  <div className="w-full h-[300px] md:h-[340px]">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: "hsl(210, 8%, 48%)" }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid hsl(210, 12%, 86%)", borderRadius: "8px", color: "hsl(210, 18%, 18%)" }}
          formatter={(value: number) => `${value}%`}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default RiskFactorsChart;
