import { forwardRef, useCallback, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
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
      ...buttonProps
    },
    ref
  ) => {
    const treatAsExternal = external ?? isExternalHref(href);
    const resolvedHref = treatAsExternal ? appendUtmParams(href, campaign) : href;

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
        onClick?.(event);
      },
      [trackingId, trackingLabel, trackingSource, resolvedHref, campaign, onClick, children]
    );

    if (treatAsExternal) {
      return (
        <Button {...buttonProps} asChild ref={ref}>
          <a
            href={resolvedHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
          >
            {children}
            <span className="sr-only"> {newTabSrLabel}</span>
          </a>
        </Button>
      );
    }

    return (
      <Button {...buttonProps} asChild ref={ref}>
        <Link to={resolvedHref} onClick={handleClick}>
          {children}
        </Link>
      </Button>
    );
  }
);

CtaButton.displayName = "CtaButton";

export default CtaButton;
