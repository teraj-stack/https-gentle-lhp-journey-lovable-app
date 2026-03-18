import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const data = [
  { name: "Genetyka", value: 40 },
  { name: "Praca siedząca/stojąca", value: 25 },
  { name: "Ciąża i hormony", value: 20 },
  { name: "Styl życia", value: 15 },
];

const COLORS = [
  "hsl(43, 58%, 52%)",
  "hsl(43, 40%, 38%)",
  "hsl(222, 20%, 40%)",
  "hsl(222, 16%, 28%)",
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
          labelLine={{ stroke: "hsl(215, 12%, 55%)" }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(222, 26%, 14%)",
            border: "1px solid hsl(222, 16%, 24%)",
            borderRadius: "8px",
            color: "hsl(40, 18%, 88%)",
          }}
          formatter={(value: number) => `${value}%`}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default RiskFactorsChart;
