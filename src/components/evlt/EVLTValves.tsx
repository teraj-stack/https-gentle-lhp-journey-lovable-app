import { motion } from "framer-motion";

interface Props {
  fadeUp: Record<string, unknown>;
}

const labelStyle = {
  fontSize: "10px",
  fontFamily: "Inter, sans-serif",
  letterSpacing: "0.03em",
} as const;

/**
 * Animated SVG vein with flowing blood particles, valve leaflets,
 * and anatomical labels with leader lines.
 */
const AnimatedVein = ({ healthy }: { healthy: boolean }) => {
  const veinColor = healthy ? "hsl(var(--primary))" : "hsl(var(--destructive))";
  const veinColorFaint = healthy
    ? "hsl(var(--primary) / 0.15)"
    : "hsl(var(--destructive) / 0.15)";
  const labelColor = "hsl(var(--muted-foreground))";
  const veinWidth = healthy ? 40 : 54;
  const cx = 130;
  const left = cx - veinWidth / 2;
  const right = cx + veinWidth / 2;

  const leafletClose = healthy ? 20 : -30;

  return (
    <svg
      viewBox="0 0 260 280"
      className="w-[220px] sm:w-[260px] h-auto mx-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`wall-${healthy}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={veinColor} stopOpacity={0.7} />
          <stop offset="50%" stopColor={veinColor} stopOpacity={0.15} />
          <stop offset="100%" stopColor={veinColor} stopOpacity={0.7} />
        </linearGradient>
        <radialGradient id={`blood-${healthy}`}>
          <stop offset="0%" stopColor={healthy ? "#c9a84c" : "#ef4444"} stopOpacity={0.9} />
          <stop offset="100%" stopColor={healthy ? "#c9a84c" : "#ef4444"} stopOpacity={0} />
        </radialGradient>
        {!healthy && (
          <filter id="valve-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Vein body fill */}
      <rect
        x={left}
        y={20}
        width={veinWidth}
        height={240}
        rx={healthy ? 6 : 14}
        fill={veinColorFaint}
      />

      {/* Vein walls */}
      <line x1={left} y1={20} x2={left} y2={260} stroke={veinColor} strokeWidth={3} strokeLinecap="round" />
      <line x1={right} y1={20} x2={right} y2={260} stroke={veinColor} strokeWidth={3} strokeLinecap="round" />

      {/* Bulge on diseased vein */}
      {!healthy && (
        <ellipse
          cx={left - 6}
          cy={170}
          rx={10}
          ry={22}
          fill={veinColorFaint}
          stroke={veinColor}
          strokeWidth={2}
          opacity={0.5}
        />
      )}

      {/* Upper valve leaflets */}
      <g transform={`translate(${cx}, 95)`} filter={!healthy ? "url(#valve-glow)" : undefined}>
        <line
          x1={-veinWidth / 2} y1={0} x2={-4} y2={0}
          stroke={veinColor} strokeWidth={2.5} strokeLinecap="round"
          transform={`rotate(${leafletClose}, ${-veinWidth / 2}, 0)`}
        />
        <line
          x1={veinWidth / 2} y1={0} x2={4} y2={0}
          stroke={veinColor} strokeWidth={2.5} strokeLinecap="round"
          transform={`rotate(${-leafletClose}, ${veinWidth / 2}, 0)`}
        />
      </g>

      {/* Lower valve leaflets */}
      <g transform={`translate(${cx}, 185)`} filter={!healthy ? "url(#valve-glow)" : undefined}>
        <line
          x1={-veinWidth / 2} y1={0} x2={-4} y2={0}
          stroke={veinColor} strokeWidth={2.5} strokeLinecap="round"
          transform={`rotate(${leafletClose}, ${-veinWidth / 2}, 0)`}
        />
        <line
          x1={veinWidth / 2} y1={0} x2={4} y2={0}
          stroke={veinColor} strokeWidth={2.5} strokeLinecap="round"
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
                  ? `M${cx + xOffset},250 L${cx + xOffset},20`
                  : `M${cx + xOffset},40 L${cx + xOffset},250`
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
          <text x={cx} y={40} textAnchor="middle" fill={veinColor} fontSize="18" fontWeight="bold">↑</text>
          <text x={cx} y={255} textAnchor="middle" fill={veinColor} fontSize="18" fontWeight="bold">↑</text>
        </>
      ) : (
        <>
          <text x={cx - 10} y={40} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="16" fontWeight="bold">↓</text>
          <text x={cx + 10} y={40} textAnchor="middle" fill={veinColor} fontSize="16" fontWeight="bold">↑</text>
          <text x={cx} y={255} textAnchor="middle" fill="hsl(var(--destructive))" fontSize="18" fontWeight="bold">↓</text>
        </>
      )}

      {/* ──── ANATOMICAL LABELS ──── */}

      {/* Label: Ściana żyły (Vein wall) — right side, pointing to right wall */}
      <line x1={right + 4} y1={55} x2={right + 22} y2={48} stroke={labelColor} strokeWidth={0.7} strokeDasharray="2 2" />
      <circle cx={right + 4} cy={55} r={1.5} fill={labelColor}>
        <animate attributeName="r" values="1.5;3;1.5" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="3s" repeatCount="indefinite" />
      </circle>
      <text x={right + 25} y={51} fill={labelColor} textAnchor="start" {...labelStyle}>
        {healthy ? "Ściana żyły" : "Rozciągnięta"}
      </text>
      {!healthy && (
        <text x={right + 25} y={61} fill={labelColor} textAnchor="start" {...labelStyle}>
          ściana żyły
        </text>
      )}

      {/* Label: Zastawka (Valve) — left side, pointing to upper valve */}
      <line x1={left - 4} y1={95} x2={left - 28} y2={88} stroke={labelColor} strokeWidth={0.7} strokeDasharray="2 2" />
      <circle cx={left - 4} cy={95} r={1.5} fill={labelColor}>
        <animate attributeName="r" values="1.5;3;1.5" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <text x={left - 30} y={91} fill={labelColor} textAnchor="end" {...labelStyle}>
        {healthy ? "Zastawka" : "Niewydolna"}
      </text>
      {!healthy && (
        <text x={left - 30} y={101} fill={labelColor} textAnchor="end" {...labelStyle}>
          zastawka
        </text>
      )}

      {/* Label: Przepływ krwi / Refluks — right side, mid-vein */}
      <line x1={right + 4} y1={140} x2={right + 22} y2={133} stroke={labelColor} strokeWidth={0.7} strokeDasharray="2 2" />
      <circle cx={right + 4} cy={140} r={1.5} fill={labelColor}>
        <animate attributeName="r" values="1.5;3;1.5" dur="3s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="3s" begin="1s" repeatCount="indefinite" />
      </circle>
      <text x={right + 25} y={136} fill={labelColor} textAnchor="start" {...labelStyle}>
        {healthy ? "Prawidłowy" : "Refluks"}
      </text>
      <text x={right + 25} y={146} fill={labelColor} textAnchor="start" {...labelStyle}>
        {healthy ? "przepływ ↑" : "żylny ↓"}
      </text>

      {/* Label: Żylak / Wybrzuszenie — left side on diseased vein bulge */}
      {!healthy && (
        <>
          <line x1={left - 16} y1={170} x2={left - 34} y2={163} stroke={labelColor} strokeWidth={0.7} strokeDasharray="2 2" />
          <circle cx={left - 16} cy={170} r={1.5} fill={labelColor}>
            <animate attributeName="r" values="1.5;3;1.5" dur="3s" begin="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="3s" begin="1.5s" repeatCount="indefinite" />
          </circle>
          <text x={left - 36} y={160} fill={labelColor} textAnchor="end" {...labelStyle}>
            Żylak
          </text>
          <text x={left - 36} y={170} fill={labelColor} textAnchor="end" {...labelStyle}>
            (wybrzuszenie)
          </text>
        </>
      )}

      {/* Label: Kierunek do serca — top */}
      {healthy && (
        <text x={cx} y={14} textAnchor="middle" fill={labelColor} {...labelStyle}>
          Do serca ♥
        </text>
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
        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-1">
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
        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-1">
          Zastawki są niewydolne. Krew opada w dół, rozpychając ściany naczyń.
        </p>
      </motion.div>
    </div>
  </motion.section>
);

export default EVLTValves;
