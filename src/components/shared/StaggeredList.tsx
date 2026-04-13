import { motion } from "framer-motion";
import { ReactNode } from "react";

const itemVariants = {
  hidden: { opacity: 0, x: -12, filter: "blur(3px)" },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

interface StaggeredListItemProps {
  index: number;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const StaggeredListItem = ({
  index,
  icon,
  children,
  className = "flex items-start gap-3 text-sm text-foreground",
}: StaggeredListItemProps) => (
  <motion.li
    custom={index}
    variants={itemVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    className={className}
  >
    {icon}
    {children}
  </motion.li>
);

export default StaggeredListItem;
