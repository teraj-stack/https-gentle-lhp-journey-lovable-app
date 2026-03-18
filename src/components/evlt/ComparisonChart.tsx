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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 16%, 82%)" />
        <XAxis dataKey="name" tick={{ fill: "hsl(25, 10%, 48%)", fontSize: 12 }} axisLine={{ stroke: "hsl(30, 16%, 82%)" }} />
        <YAxis tick={{ fill: "hsl(25, 10%, 48%)", fontSize: 12 }} axisLine={{ stroke: "hsl(30, 16%, 82%)" }} />
        <Tooltip contentStyle={{ backgroundColor: "hsl(36, 30%, 97%)", border: "1px solid hsl(30, 16%, 82%)", borderRadius: "8px", color: "hsl(25, 20%, 18%)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "hsl(25, 10%, 48%)" }} />
        <Bar dataKey="traditional" name="Chirurgia tradycyjna" fill="hsl(0, 35%, 55%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="modern" name="EVLT / Laser" fill="hsl(28, 45%, 38%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default ComparisonChart;
