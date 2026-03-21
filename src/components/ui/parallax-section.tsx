import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  /** How much the content shifts (in px). Default 40. */
  offset?: number;
}

const ParallaxSection = ({ children, className, offset = 40 }: ParallaxSectionProps) => {
  const ref = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const effectiveOffset = isMobile ? 0 : offset;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, effectiveOffset]);

  return (
    <section ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      {isMobile ? (
        <div>{children}</div>
      ) : (
        <motion.div style={{ y }}>{children}</motion.div>
      )}
    </section>
  );
};

export default ParallaxSection;
