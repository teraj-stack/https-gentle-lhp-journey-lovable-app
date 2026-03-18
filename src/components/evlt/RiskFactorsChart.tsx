import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const data = [
  { name: "Genetyka", value: 40 },
  { name: "Praca siedząca/stojąca", value: 25 },
  { name: "Ciąża i hormony", value: 20 },
  { name: "Styl życia", value: 15 },
];

const COLORS = [
  "hsl(28, 45%, 38%)",
  "hsl(28, 35%, 50%)",
  "hsl(35, 18%, 58%)",
  "hsl(30, 12%, 72%)",
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
          labelLine={{ stroke: "hsl(25, 10%, 48%)" }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(36, 30%, 97%)", border: "1px solid hsl(30, 16%, 82%)", borderRadius: "8px", color: "hsl(25, 20%, 18%)" }}
          formatter={(value: number) => `${value}%`}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default RiskFactorsChart;
