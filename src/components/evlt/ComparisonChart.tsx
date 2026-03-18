import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 16%, 24%)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(222, 16%, 24%)" }}
        />
        <YAxis
          tick={{ fill: "hsl(215, 12%, 55%)", fontSize: 12 }}
          axisLine={{ stroke: "hsl(222, 16%, 24%)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(222, 26%, 14%)",
            border: "1px solid hsl(222, 16%, 24%)",
            borderRadius: "8px",
            color: "hsl(40, 18%, 88%)",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "hsl(215, 12%, 55%)" }}
        />
        <Bar dataKey="traditional" name="Chirurgia tradycyjna" fill="hsl(0, 55%, 48%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="modern" name="EVLT / Laser" fill="hsl(43, 58%, 52%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default ComparisonChart;
