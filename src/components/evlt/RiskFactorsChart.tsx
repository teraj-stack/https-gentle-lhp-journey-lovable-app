import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const data = [
  { name: "Genetyka", value: 40 },
  { name: "Praca siedząca/stojąca", value: 25 },
  { name: "Ciąża i hormony", value: 20 },
  { name: "Styl życia", value: 15 },
];

const COLORS = [
  "hsl(155, 28%, 48%)",
  "hsl(155, 22%, 36%)",
  "hsl(220, 14%, 40%)",
  "hsl(220, 10%, 28%)",
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
          labelLine={{ stroke: "hsl(220, 8%, 55%)" }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(220, 12%, 15%)",
            border: "1px solid hsl(220, 10%, 22%)",
            borderRadius: "8px",
            color: "hsl(40, 14%, 90%)",
          }}
          formatter={(value: number) => `${value}%`}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default RiskFactorsChart;
