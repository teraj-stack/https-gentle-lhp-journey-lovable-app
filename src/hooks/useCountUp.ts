import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface UseCountUpOptions {
  end: number;
  duration?: number;
  delay?: number;
  decimals?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const useCountUp = ({ end, duration = 1.6, delay = 0, decimals = 0 }: UseCountUpOptions) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const timeout = setTimeout(() => {
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        setValue(parseFloat((eased * end).toFixed(decimals)));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setValue(end);
        }
      };

      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [inView, end, duration, delay, decimals]);

  return { ref, value };
};
