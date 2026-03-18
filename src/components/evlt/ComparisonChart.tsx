import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const data = [
  { name: "Ból (1-10)", traditional: 8, modern: 2 },
  { name: "L4 (dni)", traditional: 21, modern: 2 },
  { name: "Blizny (1-10)", traditional: 7, modern: 1 },
  { name: "Narkoza?", traditional: 10, modern: 0 },
];

const ComparisonChart = () => (
  <div className="w-full h-[320px] md:h-[380px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 22%)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(220, 8%, 55%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(220, 10%, 22%)" }}
        />
        <YAxis
          tick={{ fill: "hsl(220, 8%, 55%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(220, 10%, 22%)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(220, 12%, 15%)",
            border: "1px solid hsl(220, 10%, 22%)",
            borderRadius: "8px",
            color: "hsl(40, 14%, 90%)",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "hsl(220, 8%, 55%)" }}
        />
        <Bar dataKey="traditional" name="Chirurgia tradycyjna" fill="hsl(0, 35%, 50%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="modern" name="EVLT / Laser" fill="hsl(155, 28%, 48%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default ComparisonChart;
