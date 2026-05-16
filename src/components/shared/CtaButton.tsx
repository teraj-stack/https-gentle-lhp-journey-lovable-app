import { forwardRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface CtaButtonProps extends Omit<ButtonProps, "asChild"> {
  /** Internal route ("/...", "#hash") lub URL zewnętrzny (http(s)/mailto/tel). */
  href: string;
  children: ReactNode;
  /** Wymuszone otwarcie w nowej karcie. Domyślnie auto: zewnętrzne → nowa karta. */
  external?: boolean;
  /** Tekst dla czytników ekranu informujący o otwarciu w nowej karcie. */
  newTabSrLabel?: string;
}

const EXTERNAL_PROTOCOL = /^(https?:|mailto:|tel:)/i;

const isExternalHref = (href: string) => EXTERNAL_PROTOCOL.test(href);

/**
 * Ujednolicony CTA: jeden kontrakt API (`href`), spójna obsługa
 * wewnętrznych tras (react-router `<Link>`) i zewnętrznych linków (`<a>`).
 *
 * A11y:
 * - zewnętrzne linki dostają `target="_blank"` + `rel="noopener noreferrer"`
 * - dodatkowo sr-only komunikat "(otwiera się w nowej karcie)", żeby użytkownicy
 *   czytników ekranu wiedzieli o zmianie kontekstu (WCAG 3.2.5).
 */
const CtaButton = forwardRef<HTMLButtonElement, CtaButtonProps>(
  ({ href, children, external, newTabSrLabel = "(otwiera się w nowej karcie)", ...buttonProps }, ref) => {
    const treatAsExternal = external ?? isExternalHref(href);

    if (treatAsExternal) {
      return (
        <Button {...buttonProps} asChild ref={ref}>
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
            <span className="sr-only"> {newTabSrLabel}</span>
          </a>
        </Button>
      );
    }

    return (
      <Button {...buttonProps} asChild ref={ref}>
        <Link to={href}>{children}</Link>
      </Button>
    );
  }
);

CtaButton.displayName = "CtaButton";

export default CtaButton;
