import { motion } from "framer-motion";

interface Props {
  fadeUp: Record<string, unknown>;
}

/**
 * Animated SVG vein with flowing blood particles and valve leaflets.
 * `healthy` = valves closed, blood flows up.
 * `diseased` = valves open/incompetent, blood refluxes down, vein bulges.
 */
const AnimatedVein = ({ healthy }: { healthy: boolean }) => {
  const veinColor = healthy ? "hsl(var(--primary))" : "hsl(var(--destructive))";
  const veinColorFaint = healthy
    ? "hsl(var(--primary) / 0.15)"
    : "hsl(var(--destructive) / 0.15)";
  const veinWidth = healthy ? 40 : 54;
  const cx = 70;
  const left = cx - veinWidth / 2;
  const right = cx + veinWidth / 2;

  /* Valve leaflet angles */
  const leafletClose = healthy ? 20 : -30; // negative = open outward

  return (
    <svg
      viewBox="0 0 140 260"
      className="w-[140px] h-[260px] mx-auto"
      aria-hidden="true"
    >
      <defs>
        {/* Vein wall gradient */}
        <linearGradient id={`wall-${healthy}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={veinColor} stopOpacity={0.7} />
          <stop offset="50%" stopColor={veinColor} stopOpacity={0.15} />
          <stop offset="100%" stopColor={veinColor} stopOpacity={0.7} />
        </linearGradient>

        {/* Blood particle */}
        <radialGradient id={`blood-${healthy}`}>
          <stop offset="0%" stopColor={healthy ? "#c9a84c" : "#ef4444"} stopOpacity={0.9} />
          <stop offset="100%" stopColor={healthy ? "#c9a84c" : "#ef4444"} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Vein body fill */}
      <rect
        x={left}
        y={10}
        width={veinWidth}
        height={240}
        rx={healthy ? 6 : 14}
        fill={veinColorFaint}
      />

      {/* Vein walls */}
      <line x1={left} y1={10} x2={left} y2={250} stroke={veinColor} strokeWidth={3} strokeLinecap="round" />
      <line x1={right} y1={10} x2={right} y2={250} stroke={veinColor} strokeWidth={3} strokeLinecap="round" />

      {/* Bulge on diseased vein */}
      {!healthy && (
        <ellipse
          cx={left - 6}
          cy={160}
          rx={10}
          ry={22}
          fill={veinColorFaint}
          stroke={veinColor}
          strokeWidth={2}
          opacity={0.5}
        />
      )}

      {/* Upper valve leaflets */}
      <g transform={`translate(${cx}, 85)`}>
        <line
          x1={-veinWidth / 2}
          y1={0}
          x2={-4}
          y2={0}
          stroke={veinColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          transform={`rotate(${leafletClose}, ${-veinWidth / 2}, 0)`}
        />
        <line
          x1={veinWidth / 2}
          y1={0}
          x2={4}
          y2={0}
          stroke={veinColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          transform={`rotate(${-leafletClose}, ${veinWidth / 2}, 0)`}
        />
      </g>

      {/* Lower valve leaflets */}
      <g transform={`translate(${cx}, 175)`}>
        <line
          x1={-veinWidth / 2}
          y1={0}
          x2={-4}
          y2={0}
          stroke={veinColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          transform={`rotate(${leafletClose}, ${-veinWidth / 2}, 0)`}
        />
        <line
          x1={veinWidth / 2}
          y1={0}
          x2={4}
          y2={0}
          stroke={veinColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          transform={`rotate(${-leafletClose}, ${veinWidth / 2}, 0)`}
        />
      </g>

      {/* Animated blood particles */}
      {[0, 1, 2, 3, 4].map((i) => {
        const delay = i * 1.2;
        const xOffset = (i % 3 - 1) * 8;
        return (
          <circle key={i} r={4} fill={`url(#blood-${healthy})`}>
            <animateMotion
              dur={healthy ? "3s" : "4s"}
              repeatCount="indefinite"
              begin={`${delay}s`}
              path={
                healthy
                  ? `M${cx + xOffset},240 L${cx + xOffset},10`
                  : `M${cx + xOffset},30 L${cx + xOffset},240`
              }
            />
            <animate
              attributeName="opacity"
              values="0;0.9;0.9;0"
              dur={healthy ? "3s" : "4s"}
              repeatCount="indefinite"
              begin={`${delay}s`}
            />
          </circle>
        );
      })}

      {/* Direction arrows */}
      {healthy ? (
        <>
          <text x={cx} y={30} textAnchor="middle" fill={veinColor} fontSize="18" fontWeight="bold">↑</text>
          <text x={cx} y={245} textAnchor="middle" fill={veinColor} fontSize="18" fontWeight="bold">↑</text>
        </>
      ) : (
        <>
          <text x={cx - 10} y={30} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="16" fontWeight="bold">↓</text>
          <text x={cx + 10} y={30} textAnchor="middle" fill={veinColor} fontSize="16" fontWeight="bold">↑</text>
          <text x={cx} y={245} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="18" fontWeight="bold">↓</text>
        </>
      )}
    </svg>
  );
};

const EVLTValves = ({ fadeUp }: Props) => (
  <motion.section {...fadeUp}>
    <h2 className="section-title mb-3 text-center">Mechanizm powstawania: Zastawki</h2>
    <p className="section-subtitle mb-10 text-center max-w-2xl mx-auto">
      Wyobraź sobie, że w Twoich żyłach znajdują się małe, jednokierunkowe zawory. Przepuszczają krew do serca, walcząc z grawitacją. Gdy słabną, krew cofa się, tworząc wypukłe zmiany.
    </p>

    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
      {/* Zdrowa żyła */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <AnimatedVein healthy />
        <h4 className="font-bold text-foreground text-sm mt-3">Zdrowa żyła</h4>
        <p className="text-xs text-muted-foreground max-w-[180px] mx-auto mt-1">
          Zastawki szczelnie się zamykają. Krew płynie sprawnie w kierunku serca.
        </p>
      </motion.div>

      <span className="text-3xl text-muted-foreground hidden md:block">➞</span>
      <span className="text-3xl text-muted-foreground md:hidden rotate-90">➞</span>

      {/* Chora żyła */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <AnimatedVein healthy={false} />
        <h4 className="font-bold text-foreground text-sm mt-3">Chora żyła (Żylak)</h4>
        <p className="text-xs text-muted-foreground max-w-[180px] mx-auto mt-1">
          Zastawki są niewydolne. Krew opada w dół, rozpychając ściany naczyń.
        </p>
      </motion.div>
    </div>
  </motion.section>
);

export default EVLTValves;
