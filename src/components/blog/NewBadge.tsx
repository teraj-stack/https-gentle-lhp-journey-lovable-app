import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
 * Includes a tooltip explaining the 7-day window. Pair with `isNew()` to control visibility.
 *
 * Trigger uses a <span> via `asChild` so the badge can safely live inside an
 * <a>/<Link> (avoids invalid <button> inside <a> nesting).
 */
const NewBadge = ({ className }: NewBadgeProps) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex"
          tabIndex={0}
          aria-label="Nowy wpis — opublikowany w ciągu ostatnich 7 dni"
        >
          <Badge
            className={cn(
              "bg-primary text-primary-foreground gap-1 shrink-0 cursor-help",
              className,
            )}
          >
            <Sparkles className="w-3 h-3" />
            Nowy
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" collisionPadding={12}>
        Wpis opublikowany w ciągu ostatnich 7 dni
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default NewBadge;
