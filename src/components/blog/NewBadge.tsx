import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns true if `publishedAt` is within the last 7 days.
 * Used to flag fresh blog posts as "Nowy".
 */
export const isNew = (publishedAt: string | null | undefined): boolean =>
  !!publishedAt && Date.now() - new Date(publishedAt).getTime() <= SEVEN_DAYS_MS;

interface NewBadgeProps {
  className?: string;
}

/**
 * "Nowy" badge with sparkles icon — visual marker for recently published posts.
 * Pair with `isNew()` to control visibility.
 */
const NewBadge = ({ className }: NewBadgeProps) => (
  <Badge
    className={cn(
      "bg-primary text-primary-foreground gap-1 shrink-0",
      className,
    )}
  >
    <Sparkles className="w-3 h-3" />
    Nowy
  </Badge>
);

export default NewBadge;
