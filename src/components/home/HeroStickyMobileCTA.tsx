import CtaButton from "@/components/shared/CtaButton";
import { Calendar, Phone } from "lucide-react";

const ZNANY_LEKARZ_URL =
  "https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa";

/**
 * Sticky CTA bar przyklejony do dołu ekranu na mobile.
 * - widoczny tylko na <md (md:hidden)
 * - respektuje safe-area (iOS notch / home indicator)
 * - tap targets >= 48px (WCAG / Apple HIG)
 * - analytics + UTM współdzielone z hero (campaign=home_sticky_booking)
 */
const HeroStickyMobileCTA = () => (
  <div
    className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-6px_20px_-8px_rgba(0,0,0,0.5)]"
    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    role="region"
    aria-label="Szybkie akcje – umów konsultację"
  >
    <div className="flex items-stretch gap-2 px-3 py-2">
      <CtaButton
        href={ZNANY_LEKARZ_URL}
        variant="hero"
        className="flex-1 min-h-12 px-3 text-sm justify-center"
        trackingId="home_sticky_book_consultation"
        trackingLabel="Umów konsultację (sticky)"
        trackingSource="HeroStickyMobileCTA"
        campaign={{
          source: "cml_site",
          medium: "cta_sticky_mobile",
          campaign: "home_sticky_booking",
          content: "umow_konsultacje",
        }}
      >
        <Phone className="w-4 h-4" aria-hidden="true" />
        Umów konsultację
      </CtaButton>
      <CtaButton
        href={`${ZNANY_LEKARZ_URL}#calendar`}
        variant="outline"
        className="flex-1 min-h-12 px-3 text-sm justify-center"
        trackingId="home_sticky_check_slots"
        trackingLabel="Sprawdź terminy (sticky)"
        trackingSource="HeroStickyMobileCTA"
        campaign={{
          source: "cml_site",
          medium: "cta_sticky_mobile",
          campaign: "home_sticky_booking",
          content: "sprawdz_terminy",
        }}
      >
        <Calendar className="w-4 h-4" aria-hidden="true" />
        Sprawdź terminy
      </CtaButton>
    </div>
  </div>
);

export default HeroStickyMobileCTA;
