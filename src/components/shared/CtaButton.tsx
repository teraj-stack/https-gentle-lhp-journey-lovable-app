import { forwardRef, useCallback, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  appendUtmParams,
  trackCtaClick,
  type CtaCampaign,
} from "@/lib/ctaAnalytics";

export interface CtaButtonProps extends Omit<ButtonProps, "asChild" | "onClick"> {
  /** Internal route ("/...", "#hash") lub URL zewnętrzny (http(s)/mailto/tel). */
  href: string;
  children: ReactNode;
  /** Wymuszone otwarcie w nowej karcie. Domyślnie auto: zewnętrzne → nowa karta. */
  external?: boolean;
  /** Tekst dla czytników ekranu informujący o otwarciu w nowej karcie. */
  newTabSrLabel?: string;

  // ───── Analytics ─────
  /** Stabilne id CTA (np. "home_hero_book_consultation"). Wymagane do trackingu. */
  trackingId?: string;
  /** Etykieta dla analityki (domyślnie wyciągana z children jeśli to string). */
  trackingLabel?: string;
  /** Skąd kliknięto (np. "DoctorSection"). */
  trackingSource?: string;
  /** Parametry kampanii UTM dodawane do zewnętrznych URL-i + raportowane do GA. */
  campaign?: CtaCampaign;

  /** Hook na kliknięcie (np. dodatkowa analityka). Tracking i tak idzie pierwszy. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;

  // ───── Feedback po kliknięciu ─────
  /** Pokaż toast + spinner po kliknięciu (domyślnie: true dla zewnętrznych linków). */
  showClickFeedback?: boolean;
  /** Treść toastu (domyślnie zależy od typu linku). */
  feedbackMessage?: string;
}

const EXTERNAL_PROTOCOL = /^(https?:|mailto:|tel:)/i;
const isExternalHref = (href: string) => EXTERNAL_PROTOCOL.test(href);

const childrenToLabel = (children: ReactNode): string => {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.filter((c) => typeof c === "string").join(" ").trim();
  }
  return "";
};

/**
 * Ujednolicony CTA: jeden kontrakt API (`href`), spójna obsługa
 * wewnętrznych tras (react-router `<Link>`) i zewnętrznych linków (`<a>`).
 *
 * A11y:
 * - zewnętrzne linki dostają `target="_blank"` + `rel="noopener noreferrer"`
 * - dodatkowo sr-only komunikat "(otwiera się w nowej karcie)" (WCAG 3.2.5).
 *
 * Analytics:
 * - jeśli podasz `trackingId`, klik zostanie wysłany do `trackCtaClick`
 *   (GA4/GTM dataLayer + CustomEvent + lokalny log).
 * - jeśli podasz `campaign`, do zewnętrznych URL-i doklejone zostaną
 *   parametry utm_* (bez nadpisywania istniejących).
 */
const CtaButton = forwardRef<HTMLButtonElement, CtaButtonProps>(
  (
    {
      href,
      children,
      external,
      newTabSrLabel = "(otwiera się w nowej karcie)",
      trackingId,
      trackingLabel,
      trackingSource = "unknown",
      campaign,
      onClick,
      showClickFeedback,
      feedbackMessage,
      className,
      ...buttonProps
    },
    ref
  ) => {
    const treatAsExternal = external ?? isExternalHref(href);
    const resolvedHref = treatAsExternal ? appendUtmParams(href, campaign) : href;
    const feedbackEnabled = showClickFeedback ?? treatAsExternal;

    const [isPending, setIsPending] = useState(false);

    const handleClick = useCallback(
      (event: MouseEvent<HTMLElement>) => {
        if (trackingId) {
          trackCtaClick({
            id: trackingId,
            label: trackingLabel ?? childrenToLabel(children) ?? trackingId,
            source: trackingSource,
            url: resolvedHref,
            campaign,
          });
        }

        if (feedbackEnabled) {
          setIsPending(true);
          const defaultMsg = treatAsExternal
            ? "Otwieramy stronę rezerwacji w nowej karcie…"
            : "Przekierowujemy…";
          toast.success(feedbackMessage ?? defaultMsg, { duration: 2500 });
          // Spinner gaśnie po chwili – nawigacja zewnętrzna otwiera nową kartę,
          // więc bieżąca strona zostaje aktywna.
          window.setTimeout(() => setIsPending(false), 2000);
        }

        onClick?.(event);
      },
      [
        trackingId,
        trackingLabel,
        trackingSource,
        resolvedHref,
        campaign,
        onClick,
        children,
        feedbackEnabled,
        feedbackMessage,
        treatAsExternal,
      ]
    );

    const content = (
      <>
        {isPending && (
          <Loader2
            className="w-4 h-4 animate-spin"
            aria-hidden="true"
            data-testid="cta-spinner"
          />
        )}
        {children}
        {isPending && <span className="sr-only">Trwa przekierowanie…</span>}
      </>
    );

    const mergedClassName = cn(isPending && "cursor-progress", className);

    if (treatAsExternal) {
      return (
        <Button
          {...buttonProps}
          className={mergedClassName}
          asChild
          ref={ref}
          aria-busy={isPending || undefined}
        >
          <a
            href={resolvedHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
          >
            {content}
            <span className="sr-only"> {newTabSrLabel}</span>
          </a>
        </Button>
      );
    }

    return (
      <Button
        {...buttonProps}
        className={mergedClassName}
        asChild
        ref={ref}
        aria-busy={isPending || undefined}
      >
        <Link to={resolvedHref} onClick={handleClick}>
          {content}
        </Link>
      </Button>
    );
  }
);

CtaButton.displayName = "CtaButton";

export default CtaButton;
