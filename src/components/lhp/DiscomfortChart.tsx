import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { day: "Dzień 0", value: 7 },
  { day: "Dzień 1", value: 6 },
  { day: "Dzień 2", value: 5 },
  { day: "Dzień 3", value: 4 },
  { day: "Dzień 5", value: 3 },
  { day: "Dzień 7", value: 2 },
  { day: "Tydzień 2", value: 1 },
  { day: "Tydzień 4", value: 0 },
];

const DiscomfortChart = () => (
  <div className="w-full max-w-[700px] mx-auto h-[280px] md:h-[350px]">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
        <defs>
          <linearGradient id="colorDiscomfort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(43, 58%, 52%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(43, 58%, 52%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 16%, 24%)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(40, 18%, 88%)" }} />
        <YAxis
          label={{ value: "Poziom dyskomfortu", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(40, 18%, 88%)" } }}
          domain={[0, 8]}
          tick={{ fontSize: 12, fill: "hsl(40, 18%, 88%)" }}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(222, 16%, 24%)", background: "hsl(222, 26%, 14%)", color: "hsl(40, 18%, 88%)" }}
          formatter={(value: number) => [`${value}/10`, "Dyskomfort"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(43, 58%, 52%)"
          strokeWidth={3}
          fill="url(#colorDiscomfort)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default DiscomfortChart;
