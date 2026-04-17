import { motion } from "framer-motion";

/**
 * Minimalistyczne, animowane piktogramy SVG ćwiczeń profilaktycznych.
 * Stroke = currentColor (gold via text-primary), tło transparentne.
 */

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

export const FootCircleIcon = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full text-primary">
    {/* łydka + stopa */}
    <path d="M30 12 L30 46 Q30 52 36 52 L58 52 Q64 52 64 46 L60 40" {...stroke} />
    {/* okrąg ruchu */}
    <motion.circle
      cx="60"
      cy="46"
      r="10"
      strokeDasharray="4 3"
      {...stroke}
      animate={{ rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "60px 46px" }}
    />
    {/* strzałka kierunku */}
    <motion.path
      d="M68 40 L72 44 L68 48"
      {...stroke}
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </svg>
);

export const ToeRaiseIcon = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full text-primary">
    {/* podłoga */}
    <line x1="10" y1="64" x2="70" y2="64" {...stroke} />
    {/* sylwetka unosząca się na palcach */}
    <motion.g
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="40" cy="20" r="5" {...stroke} />
      <path d="M40 25 L40 46" {...stroke} />
      <path d="M40 32 L30 38 M40 32 L50 38" {...stroke} />
      <path d="M40 46 L34 60 M40 46 L46 60" {...stroke} />
      {/* palce stóp */}
      <path d="M30 60 L36 62 M44 62 L50 60" {...stroke} />
    </motion.g>
  </svg>
);

export const BicycleIcon = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full text-primary">
    {/* tułów leżący */}
    <path d="M8 56 L40 56" {...stroke} />
    <circle cx="14" cy="50" r="4" {...stroke} />
    {/* biodro */}
    <circle cx="42" cy="52" r="3" {...stroke} />
    {/* nogi „rower” — naprzemienne */}
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "56px 44px" }}
    >
      <path d="M42 52 L56 30 L70 30" {...stroke} />
    </motion.g>
    <motion.g
      animate={{ rotate: -360 }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "56px 44px" }}
    >
      <path d="M42 52 L56 58 L70 58" {...stroke} />
    </motion.g>
    {/* środek */}
    <circle cx="56" cy="44" r="2" fill="currentColor" />
  </svg>
);

export const LegLiftIcon = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full text-primary">
    {/* podłoga / mata */}
    <line x1="6" y1="60" x2="74" y2="60" {...stroke} />
    {/* leżąca sylwetka */}
    <circle cx="14" cy="54" r="4" {...stroke} />
    <path d="M18 56 L42 56" {...stroke} />
    {/* unosząca się noga */}
    <motion.path
      d="M42 56 L62 36"
      {...stroke}
      animate={{ rotate: [0, -25, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "42px 56px" }}
    />
    {/* stopa */}
    <motion.path
      d="M62 36 L66 32"
      {...stroke}
      animate={{ rotate: [0, -25, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "42px 56px" }}
    />
  </svg>
);

export const AnkleFlexIcon = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full text-primary">
    {/* łydka */}
    <path d="M40 10 L40 48" {...stroke} />
    {/* staw kostki */}
    <circle cx="40" cy="48" r="2.5" fill="currentColor" />
    {/* stopa zginana w górę / w dół */}
    <motion.path
      d="M40 48 L60 48"
      {...stroke}
      animate={{ rotate: [-25, 25, -25] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "40px 48px" }}
    />
    {/* łuki ruchu */}
    <path d="M52 36 Q58 42 60 48" strokeDasharray="2 3" {...stroke} opacity={0.5} />
    <path d="M52 60 Q58 54 60 48" strokeDasharray="2 3" {...stroke} opacity={0.5} />
  </svg>
);

export const WallSitIcon = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full text-primary">
    {/* ściana */}
    <line x1="14" y1="10" x2="14" y2="68" {...stroke} />
    <line x1="10" y1="68" x2="70" y2="68" {...stroke} />
    {/* sylwetka oparta o ścianę */}
    <circle cx="22" cy="22" r="5" {...stroke} />
    <path d="M22 27 L22 44 L44 44" {...stroke} />
    {/* uda poziomo, golenie pionowo */}
    <path d="M44 44 L44 68" {...stroke} />
    <path d="M22 44 L22 68" {...stroke} opacity={0.6} />
    {/* delikatne drżenie ze statycznego napięcia */}
    <motion.circle
      cx="33"
      cy="44"
      r="2"
      fill="currentColor"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.8, repeat: Infinity }}
    />
  </svg>
);
