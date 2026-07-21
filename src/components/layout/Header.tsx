import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoCml from "@/assets/logo-cml.webp";

// =============================================================================
// NAV STRUCTURE — uproszczona, oparta o rolę pacjenta:
//   Problem (objawy/schorzenia) → Zabieg (technologie) → Wiedza (edukacja+blog).
// "Zalecenia po…" świadomie pominięte — dostępne z każdej strony zabiegu.
// =============================================================================

interface NavItem {
  label: string;
  href: string;
  desc?: string;
  /**
   * Featured = link "zobacz wszystko" do huba sekcji. Wyróżniony wizualnie
   * (ikona ArrowRight, separator, akcent), żeby pacjent szybko trafił na
   * pełną listę gdy w skróconym dropdownie nie znalazł swojego zabiegu.
   * Nie używaj `→` w `label` — strzałka pochodzi z ikony, treść zostaje czysta.
   */
  featured?: boolean;
}

interface MegaColumn {
  title: string;
  items: NavItem[];
}

// =============================================================================
// Nowy podział: dziedziny medyczne (Proktologia, Flebologia, Ginekomastia)
// + Wiedza + Klinika. Mniej popularne pozycje przeniesione do hubów
// (/leczenie/proktologia, /leczenie/flebologia, /dla-pacjenta).
// =============================================================================

// --- PROKTOLOGIA ---
const proktologiaColumns: MegaColumn[] = [
  {
    title: "Mam problem",
    items: [
      { label: "Hemoroidy", href: "/dla-pacjenta/hemoroidy", desc: "Krwawienie, swędzenie, guzki" },
      { label: "Szczelina odbytu", href: "/leczenie/szczelina", desc: "Ból przy wypróżnieniu" },
      { label: "Przetoka odbytu", href: "/leczenie/filac", desc: "Sączenie, nawracający ropień" },
      { label: "Torbiel pilonidalna", href: "/leczenie/silac", desc: "Guzek przy kości ogonowej" },
    ],
  },
  {
    title: "Zabiegi",
    items: [
      { label: "LHP – laser na hemoroidy", href: "/leczenie/lhp" },
      { label: "FiLaC – laser na przetokę", href: "/leczenie/filac" },
      { label: "SiLaC – laser na torbiel", href: "/leczenie/silac" },
      {
        label: "Zobacz wszystkie zabiegi",
        href: "/leczenie/proktologia",
        desc: "Pełna lista metod i porównanie",
        featured: true,
      },
    ],
  },
];

// --- FLEBOLOGIA ---
const flebologiaColumns: MegaColumn[] = [
  {
    title: "Mam problem",
    items: [
      { label: "Żylaki nóg", href: "/leczenie/evlt", desc: "Ból, obrzęki, widoczne żyły" },
      { label: "Pajączki naczyniowe", href: "/leczenie/clacs", desc: "Czerwone i fioletowe naczynka" },
      { label: "Profilaktyka żylaków", href: "/dla-pacjenta/profilaktyka-zylakow", desc: "Jak zapobiegać" },
    ],
  },
  {
    title: "Zabiegi",
    items: [
      { label: "EVLT – laser na żylaki", href: "/leczenie/evlt" },
      { label: "CLaCS – metoda hybrydowa", href: "/leczenie/clacs" },
      {
        label: "Zobacz wszystkie zabiegi",
        href: "/leczenie/flebologia",
        desc: "Pełna lista metod i porównanie",
        featured: true,
      },
    ],
  },
];

// --- GINEKOMASTIA (single-column, krótka lista) ---
const ginekomastiaItems: NavItem[] = [
  { label: "O zabiegu", href: "/leczenie/ginekomastia", desc: "Powiększenie piersi u mężczyzn" },
  { label: "Typ gruczołowy", href: "/leczenie/ginekomastia-gruczolowa" },
  { label: "Typ tłuszczowy", href: "/leczenie/ginekomastia-tluszczowa" },
  { label: "Typ mieszany", href: "/leczenie/ginekomastia-mieszana" },
];

// --- WIEDZA (skrócona; resztę w hubie /dla-pacjenta) ---
const wiedzaColumns: MegaColumn[] = [
  {
    title: "Edukacja",
    items: [
      { label: "Test ryzyka hemoroidów", href: "/dla-pacjenta/quiz-hemoroidy", desc: "Quiz · 9 pytań · 2 min" },
      { label: "Hemoroidy A–Z", href: "/dla-pacjenta/hemoroidy" },
      { label: "Pajączki naczyniowe", href: "/dla-pacjenta/pajaczki" },
      { label: "Pielęgnacja nóg", href: "/dla-pacjenta/pielegnacja-nog" },
    ],
  },
  {
    title: "Materiały",
    items: [
      { label: "Blog", href: "/blog" },
      { label: "Przygotowanie do EVLT", href: "/dla-pacjenta/przygotowanie-evlt" },
      { label: "Przygotowanie do LHP", href: "/dla-pacjenta/przygotowanie-lhp" },
      {
        label: "Strefa pacjenta",
        href: "/dla-pacjenta",
        desc: "Quizy, e-book, FAQ i przygotowanie",
        featured: true,
      },
    ],
  },
];

// --- KLINIKA (single dropdown, top-level housekeeping) ---
const klinikaItems: NavItem[] = [
  { label: "O nas", href: "/o-nas", desc: "Zespół, misja, dr Jan Bujok" },
  { label: "Lokalizacje", href: "/kontakt", desc: "Warszawa Wilanów" },
  { label: "Współpraca (B2B)", href: "/wspolpraca", desc: "Dla lekarzy i partnerów" },
];

// Spłaszczone listy do isSectionActive
const flatten = (cols: MegaColumn[]): NavItem[] => cols.flatMap((c) => c.items);
const allProktologiaItems = flatten(proktologiaColumns);
const allFlebologiaItems = flatten(flebologiaColumns);
const allWiedzaItems = flatten(wiedzaColumns);

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [navKey, setNavKey] = useState(0);
  const megaLockedUntil = useRef(0);
  const megaCloseTimer = useRef<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerRootRef = useRef<HTMLElement>(null);
  // Focus management: refs to each dropdown trigger button + panel container.
  // When a dropdown opens we move focus into the panel; when it closes we
  // return focus to its trigger (only if the close was caused by user action,
  // not by route navigation).
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousMegaOpen = useRef<string | null>(null);
  const shouldRestoreFocus = useRef(false);
  const location = useLocation();
  const pathname = location.pathname;

  // CSS var --header-height (single source of truth)
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const setVar = (h: number) =>
      document.documentElement.style.setProperty("--header-height", `${Math.round(h)}px`);
    setVar(el.getBoundingClientRect().height);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setVar(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Delay closing mega-menu after mouse leave so users have time to move
  // cursor onto the dropdown content (typical mega-menu hover intent pattern).
  // For touch devices (no hover) we skip this delay entirely — taps must close
  // immediately when the user taps outside the menu.
  const MEGA_CLOSE_DELAY_MS = 600;

  // Detect coarse pointer / no-hover (touch devices). Reactive to changes
  // (e.g. plugging in a mouse on tablets).
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setIsTouchDevice(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  const clearMegaCloseTimer = useCallback(() => {
    if (megaCloseTimer.current !== null) {
      window.clearTimeout(megaCloseTimer.current);
      megaCloseTimer.current = null;
    }
  }, []);

  const handleMegaEnter = useCallback(
    (key: string) => {
      // Hover events are unreliable / synthetic on touch — ignore them.
      if (isTouchDevice) return;
      clearMegaCloseTimer();
      if (Date.now() < megaLockedUntil.current) return;
      setMegaOpen(key);
    },
    [clearMegaCloseTimer, isTouchDevice],
  );
  const handleMegaLeave = useCallback(() => {
    if (isTouchDevice) return;
    clearMegaCloseTimer();
    megaCloseTimer.current = window.setTimeout(() => {
      // Mouse-out close: don't yank focus back to the trigger — the user
      // moved their pointer away, they didn't request a focus change.
      shouldRestoreFocus.current = false;
      setMegaOpen(null);
      megaCloseTimer.current = null;
    }, MEGA_CLOSE_DELAY_MS);
  }, [clearMegaCloseTimer, isTouchDevice]);

  // Click on the dropdown trigger.
  // - Touch: toggles the menu (no hover available).
  // - Keyboard (Enter/Space dispatches a click with detail === 0): toggles too,
  //   so users navigating without a mouse can open the panel and have focus
  //   moved into it by the open/close effect below.
  // - Mouse on desktop: hover already opened it, so a click only toggles it
  //   closed (and returns focus to the trigger).
  const handleMegaTriggerClick = useCallback(
    (key: string, event: React.MouseEvent<HTMLButtonElement>) => {
      const isKeyboardActivation = event.detail === 0;
      if (!isTouchDevice && !isKeyboardActivation) {
        if (megaOpen === key) {
          event.preventDefault();
          event.stopPropagation();
          clearMegaCloseTimer();
          shouldRestoreFocus.current = true;
          setMegaOpen(null);
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearMegaCloseTimer();
      setMegaOpen((current) => {
        if (current === key) {
          shouldRestoreFocus.current = true;
          return null;
        }
        return key;
      });
    },
    [clearMegaCloseTimer, isTouchDevice, megaOpen],
  );

  const handleMegaLinkClick = useCallback(() => {
    clearMegaCloseTimer();
    // Navigating to a new page — do NOT restore focus to the trigger;
    // the destination page's focus order should take over.
    shouldRestoreFocus.current = false;
    setMegaOpen(null);
    megaLockedUntil.current = Date.now() + 2000;
    setNavKey((k) => k + 1);
  }, [clearMegaCloseTimer]);

  // Touch backup: pointerup on a menu link guarantees the dropdown closes
  // even in edge cases where React Router's <Link> click handler is delayed
  // or suppressed (e.g. same-route navigation, native long-press menus).
  const handleMegaLinkPointerUp = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      clearMegaCloseTimer();
      shouldRestoreFocus.current = false;
      setMegaOpen(null);
    },
    [clearMegaCloseTimer],
  );

  useEffect(() => () => clearMegaCloseTimer(), [clearMegaCloseTimer]);

  // Tap-outside dismissal for touch devices: if a touch lands outside the
  // header (and outside any open dropdown rendered inside it), close immediately.
  useEffect(() => {
    if (!isTouchDevice || megaOpen === null) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      const target = event.target as Node | null;
      if (!target) return;
      if (headerRootRef.current && headerRootRef.current.contains(target)) return;
      clearMegaCloseTimer();
      // Tap outside is a deliberate dismiss — focus should not jump back into
      // the header.
      shouldRestoreFocus.current = false;
      setMegaOpen(null);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isTouchDevice, megaOpen, clearMegaCloseTimer]);

  // Escape closes the open dropdown (restoring focus to trigger).
  // Tab / Shift+Tab cycles focus inside the dropdown — focus trap so users
  // can't accidentally tab out into the rest of the page while the menu
  // is meant to be the active interaction context.
  useEffect(() => {
    if (megaOpen === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        clearMegaCloseTimer();
        shouldRestoreFocus.current = true;
        setMegaOpen(null);
        return;
      }
      if (event.key !== "Tab") return;
      const trigger = triggerRefs.current[megaOpen];
      const panel = panelRefs.current[megaOpen];
      if (!trigger || !panel) return;
      // Build the focus loop: trigger first, then every focusable inside the panel.
      const panelFocusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      const loop: HTMLElement[] = [trigger, ...panelFocusables];
      if (loop.length < 2) return;
      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? loop.indexOf(active) : -1;
      // If focus is somehow outside the loop, pull it back to the panel.
      if (currentIndex === -1) {
        event.preventDefault();
        loop[1].focus();
        return;
      }
      const delta = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + delta + loop.length) % loop.length;
      event.preventDefault();
      loop[nextIndex].focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [megaOpen, clearMegaCloseTimer]);

  // Focus shift on open/close transitions.
  // Open  → move focus to first interactive element in the dropdown panel.
  // Close → return focus to the triggering button (only when explicitly requested).
  useEffect(() => {
    const previous = previousMegaOpen.current;
    if (megaOpen && megaOpen !== previous) {
      // Defer until AnimatePresence has mounted the panel.
      const id = window.requestAnimationFrame(() => {
        const panel = panelRefs.current[megaOpen];
        const firstFocusable = panel?.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      });
      previousMegaOpen.current = megaOpen;
      return () => window.cancelAnimationFrame(id);
    }
    if (!megaOpen && previous) {
      if (shouldRestoreFocus.current) {
        triggerRefs.current[previous]?.focus();
      }
      shouldRestoreFocus.current = false;
      previousMegaOpen.current = null;
    }
  }, [megaOpen]);

  const isActive = (href: string) => pathname === href;

  /**
   * Mapa prefiksów per sekcja nawigacji. Sekcja jest aktywna gdy `pathname`
   * zaczyna się od któregokolwiek prefixu LUB jest dokładnym matchem href'a
   * któregoś itemu (fallback dla sekcji-singletons typu Klinika gdzie itemy
   * prowadzą do różnych top-level routes: /o-nas, /kontakt, /wspolpraca).
   *
   * Dlaczego prefix-based:
   * - Hub `/leczenie/proktologia` ma podstrony `/leczenie/lhp`, `/leczenie/szczelina`,
   *   `/leczenie/plastyka`, `/leczenie/anusitis`, `/leczenie/spazm-lonowoodbytniczy`.
   *   Bez prefixów (strict equality) wejście na podstronę nie podświetlało
   *   dropdownu „Proktologia" w nav.
   * - Flebologia analogicznie: hub + dzieci `/leczenie/{evlt,filac,silac,clacs,
   *   skleroterapia,mikroflebektomia,fototerapia}` (wspólne z proktologią pod
   *   `/leczenie/`, ale dyskryminowane przez explicit listę zabiegów flebo).
   * - Ginekomastia: hub `/leczenie/ginekomastia` + warianty `-gruczolowa/-tluszczowa/-mieszana`.
   * - Wiedza: cały subtree `/dla-pacjenta/*` + edukacyjne `/wiedza/*` + `/blog`.
   *
   * UWAGA: kolejność dopasowania ma znaczenie tylko wizualnie (wiele dropdownów
   * NIE może być jednocześnie zapodświetlonych) — radzimy to przez dyskryminację
   * konkretnymi prefiksami zabiegów, nie generycznym `/leczenie/`.
   */
  const SECTION_PREFIXES: Record<string, string[]> = {
    proktologia: [
      "/leczenie/proktologia",
      "/leczenie/lhp",
      "/leczenie/szczelina",
      "/leczenie/plastyka",
      "/leczenie/anusitis",
      "/leczenie/spazm-lonowoodbytniczy",
      "/dla-pacjenta/hemoroidy",
      "/dla-pacjenta/faldy-odbytu",
      "/dla-pacjenta/proktolog-faq",
      "/dla-pacjenta/przygotowanie-lhp",
      "/dla-pacjenta/przygotowanie-filac",
      "/dla-pacjenta/przygotowanie-plastyka",
      "/dla-pacjenta/zalecenia-po-lhp",
      "/dla-pacjenta/zalecenia-po-filac",
      "/dla-pacjenta/zalecenia-po-plastyce",
    ],
    flebologia: [
      "/leczenie/flebologia",
      "/leczenie/evlt",
      "/leczenie/filac",
      "/leczenie/silac",
      "/leczenie/clacs",
      "/leczenie/skleroterapia",
      "/leczenie/mikroflebektomia",
      "/leczenie/fototerapia",
      "/dla-pacjenta/pajaczki",
      "/dla-pacjenta/pielegnacja-nog",
      "/dla-pacjenta/profilaktyka-zylakow",
      "/dla-pacjenta/ebook-pajaczki",
      "/dla-pacjenta/przygotowanie-evlt",
      "/dla-pacjenta/przygotowanie-clacs",
      "/dla-pacjenta/przygotowanie-silac",
      "/dla-pacjenta/przygotowanie-skleroterapia",
      "/dla-pacjenta/przygotowanie-mikroflebektomia",
      "/dla-pacjenta/zalecenia-po-evlt",
      "/dla-pacjenta/zalecenia-po-clacs",
      "/dla-pacjenta/zalecenia-po-silac",
      "/dla-pacjenta/zalecenia-po-skleroterapii",
      "/dla-pacjenta/zalecenia-po-mikroflebektomii",
    ],
    ginekomastia: [
      "/leczenie/ginekomastia",
      "/dla-pacjenta/przygotowanie-ginekomastii",
      "/dla-pacjenta/przygotowanie-ginekomastia",
      "/dla-pacjenta/zalecenia-po-ginekomastii",
    ],
    wiedza: [
      "/dla-pacjenta",
      "/wiedza",
      "/blog",
    ],
    klinika: [
      "/o-nas",
      "/wspolpraca",
      // /kontakt świadomie wykluczony — Kontakt jest osobnym top-level linkiem,
      // nie powinien podświetlać dropdownu „Klinika".
    ],
  };

  /**
   * Sekcja aktywna gdy:
   *  1) pathname === jednego z item.href (zachowanie starego API), LUB
   *  2) pathname zaczyna się od któregoś prefixu sekcji (`startsWith` z guardem
   *     na granicę segmentu, żeby `/leczenie/lhp` nie matchowało `/leczenie/lhp-foo`).
   */
  const isSectionActive = (keyName: string, items: NavItem[]): boolean => {
    if (items.some((i) => pathname === i.href)) return true;
    const prefixes = SECTION_PREFIXES[keyName];
    if (!prefixes) return false;
    return prefixes.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(null);
    megaLockedUntil.current = Date.now() + 1500;
  }, [location]);

  // ---------- Reusable single-column dropdown ----------
  const SingleDropdown = ({
    keyName,
    label,
    items,
    align = "left",
  }: {
    keyName: string;
    label: string;
    items: NavItem[];
    align?: "left" | "right";
  }) => {
    const panelId = `mega-panel-${keyName}`;
    const triggerId = `mega-trigger-${keyName}`;
    const isOpen = megaOpen === keyName;
    return (
      <div
        key={`${keyName}-${navKey}`}
        className="relative"
        onMouseEnter={() => handleMegaEnter(keyName)}
        onMouseLeave={handleMegaLeave}
      >
        <button
          id={triggerId}
          ref={(el) => {
            triggerRefs.current[keyName] = el;
          }}
          type="button"
          onClick={(e) => handleMegaTriggerClick(keyName, e)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={panelId}
          aria-label={`Menu sekcji ${label}`}
          className={`flex items-center gap-0.5 xl:gap-1 px-2.5 xl:px-4 py-2 text-[13px] xl:text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isSectionActive(keyName, items)
              ? "text-primary bg-accent/50"
              : "text-foreground/80 hover:text-primary"
          }`}
        >
          {label}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={panelId}
              ref={(el) => {
                panelRefs.current[keyName] = el;
              }}
              role="menu"
              aria-label={`${label} — lista odnośników`}
              aria-labelledby={triggerId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-1 w-80 bg-card rounded-xl shadow-lg border border-border p-2`}
            >
            {items.map((item) => {
              const featured = item.featured;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  role="menuitem"
                  onClick={handleMegaLinkClick}
                  onPointerUp={handleMegaLinkPointerUp}
                  aria-label={
                    featured && item.desc ? `${item.label} — ${item.desc}` : undefined
                  }
                  className={`group/featured block px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-accent/50 ${
                    isActive(item.href)
                      ? "bg-accent/50"
                      : featured
                        ? "bg-accent/25 mt-1 border-t border-border/60 rounded-t-none"
                        : ""
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-primary"
                        : featured
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {featured && (
                      <ArrowRight
                        className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/featured:translate-x-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {item.desc && (
                    <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  // ---------- Multi-column mega dropdown ----------
  const MegaDropdown = ({
    keyName,
    label,
    columns,
  }: {
    keyName: string;
    label: string;
    columns: MegaColumn[];
  }) => {
    const allItems = flatten(columns);
    const panelId = `mega-panel-${keyName}`;
    const triggerId = `mega-trigger-${keyName}`;
    const isOpen = megaOpen === keyName;
    return (
      <div
        key={`${keyName}-${navKey}`}
        className="relative"
        onMouseEnter={() => handleMegaEnter(keyName)}
        onMouseLeave={handleMegaLeave}
      >
        <button
          id={triggerId}
          ref={(el) => {
            triggerRefs.current[keyName] = el;
          }}
          type="button"
          onClick={(e) => handleMegaTriggerClick(keyName, e)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={panelId}
          aria-label={`Menu sekcji ${label}`}
          className={`flex items-center gap-0.5 xl:gap-1 px-2.5 xl:px-4 py-2 text-[13px] xl:text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isSectionActive(keyName, allItems)
              ? "text-primary bg-accent/50"
              : "text-foreground/80 hover:text-primary"
          }`}
        >
          {label}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={panelId}
              ref={(el) => {
                panelRefs.current[keyName] = el;
              }}
              role="menu"
              aria-label={`${label} — lista odnośników`}
              aria-labelledby={triggerId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-card rounded-xl shadow-lg border border-border p-5 grid gap-6"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(180px, 220px))`,
              }}
            >
              {columns.map((col) => (
                <div key={col.title}>
                  <div className="px-2 pb-2 mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary border-b border-primary/20">
                    {col.title}
                  </div>
                  <ul className="space-y-0.5">
                    {col.items.map((item) => {
                      const featured = item.featured;
                      return (
                        <li
                          key={item.href}
                          className={featured ? "mt-1.5 pt-1.5 border-t border-border/60" : undefined}
                        >
                          <Link
                            to={item.href}
                            role="menuitem"
                            onClick={handleMegaLinkClick}
                            onPointerUp={handleMegaLinkPointerUp}
                            aria-label={
                              featured && item.desc ? `${item.label} — ${item.desc}` : undefined
                            }
                            className={`group/featured block px-2 py-1.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-accent/50 ${
                              isActive(item.href)
                                ? "text-primary bg-accent/50 font-medium"
                                : featured
                                  ? "text-primary/95 bg-accent/25 hover:bg-accent/50 hover:text-primary font-medium"
                                  : "text-foreground/80 hover:text-primary hover:bg-accent/40"
                            }`}
                          >
                            {featured ? (
                              <>
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate">{item.label}</span>
                                  <ArrowRight
                                    className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/featured:translate-x-0.5"
                                    aria-hidden="true"
                                  />
                                </span>
                                {item.desc && (
                                  <span className="block text-[11px] text-muted-foreground mt-0.5 font-normal">
                                    {item.desc}
                                  </span>
                                )}
                              </>
                            ) : (
                              item.label
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <header
      ref={headerRootRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      {/* HEADER wrapper — single source of truth for --header-height (stable height incl. contact bar). */}
      <div ref={headerRef}>

        <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-2 lg:gap-3 xl:gap-4 h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0">
            <img
              src={logoCml}
              alt="CML – Centrum Medycyny Laserowej"
              width={200}
              height={80}
              className="h-10 sm:h-10 md:h-11 lg:h-10 xl:h-12 w-auto"
            />
          </Link>

          {/* Desktop nav — podział wg dziedziny medycznej + Wiedza/Klinika */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-0 xl:gap-0.5 2xl:gap-1 min-w-0">
            <MegaDropdown keyName="proktologia" label="Proktologia" columns={proktologiaColumns} />
            <MegaDropdown keyName="flebologia" label="Flebologia" columns={flebologiaColumns} />
            <SingleDropdown keyName="ginekomastia" label="Ginekomastia" items={ginekomastiaItems} />
            <MegaDropdown keyName="wiedza" label="Wiedza" columns={wiedzaColumns} />
            <SingleDropdown keyName="klinika" label="Klinika" items={klinikaItems} />

            <Link
              to="/cennik"
              className={`px-2.5 xl:px-4 py-2 text-[13px] xl:text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 whitespace-nowrap ${
                isActive("/cennik")
                  ? "text-primary bg-accent/50"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              Cennik
            </Link>

            <Link
              to="/kontakt"
              className={`px-2.5 xl:px-4 py-2 text-[13px] xl:text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 whitespace-nowrap ${
                isActive("/kontakt")
                  ? "text-primary bg-accent/50"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              Kontakt
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Button
              variant="hero"
              size="sm"
              className="hidden sm:inline-flex lg:h-9 lg:px-3 lg:text-[13px] xl:h-10 xl:px-6 xl:text-sm whitespace-nowrap"
              asChild
            >
              <a
                href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* Krótka etykieta poniżej xl, pełna od xl w górę */}
                <span className="xl:hidden">Konsultacja</span>
                <span className="hidden xl:inline">Umów Konsultację</span>
              </a>
            </Button>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-accent/50 transition-colors text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                  >
                    <X className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                  >
                    <Menu className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed inset-0 top-16 bg-background/60 backdrop-blur-sm z-[-1]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden bg-card border-t border-border overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain"
            >
              <div className="px-3 sm:px-4 py-4 space-y-1">
                {[
                  <div
                    key="mobile-contact-bar"
                    className="grid grid-cols-2 gap-2 mb-3"
                  >
                    <a
                      href="tel:+48665666728"
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
                      aria-label="Zadzwoń: +48 665 666 728"
                    >
                      <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Zadzwoń</span>
                    </a>
                    <a
                      href="mailto:warszawa@cml.pl"
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-accent/40 border border-border text-sm font-medium text-foreground hover:bg-accent/60 transition-colors"
                      aria-label="Wyślij e-mail: warszawa@cml.pl"
                    >
                      <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Napisz</span>
                    </a>
                  </div>,
                  ...([
                    { key: "proktologia", label: "Proktologia", columns: proktologiaColumns },
                    { key: "flebologia", label: "Flebologia", columns: flebologiaColumns },
                  ].flatMap((section) => [
                    <div
                      key={`${section.key}-label`}
                      className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                    >
                      {section.label}
                    </div>,
                    ...section.columns.flatMap((col, i) => [
                      <div
                        key={`${section.key}-sub-${i}`}
                        className="px-5 pt-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        {col.title}
                      </div>,
                      ...col.items.map((item) => {
                        const featured = item.featured;
                        return (
                          <Link
                            key={`${section.key}-${item.href}-${item.label}`}
                            to={item.href}
                            title={item.label}
                            aria-label={
                              featured && item.desc ? `${item.label} — ${item.desc}` : undefined
                            }
                            className={`group/featured flex flex-col justify-center min-h-[44px] px-5 py-2 rounded-lg hover:bg-accent/50 ${
                              isActive(item.href)
                                ? "bg-accent/50"
                                : featured
                                  ? "bg-accent/25 border-l-2 border-primary"
                                  : ""
                            }`}
                          >
                            <span
                              className={`flex items-center gap-1.5 text-[14px] leading-tight ${
                                isActive(item.href)
                                  ? "text-primary font-medium"
                                  : featured
                                    ? "text-primary font-medium"
                                    : "text-foreground/85"
                              }`}
                            >
                              <span className="truncate">{item.label}</span>
                              {featured && (
                                <ArrowRight
                                  className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/featured:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                            {item.desc && (
                              <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                                {item.desc}
                              </span>
                            )}
                          </Link>
                        );
                      }),
                    ]),
                  ])),

                  <div
                    key="ginekomastia-label"
                    className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                  >
                    Ginekomastia
                  </div>,
                  ...ginekomastiaItems.map((item) => (
                    <Link
                      key={`ginekomastia-${item.href}`}
                      to={item.href}
                      title={item.label}
                      className={`flex items-center min-h-[44px] px-5 py-2 rounded-lg text-[14px] hover:bg-accent/50 truncate ${
                        isActive(item.href)
                          ? "text-primary bg-accent/50 font-medium"
                          : "text-foreground/85"
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )),

                  ...wiedzaColumns.flatMap((col, i) => [
                    <div
                      key={`wiedza-label-${i}`}
                      className="px-4 py-2 text-[11px] font-semibold text-primary uppercase tracking-wider mt-2 truncate"
                    >
                      Wiedza · {col.title}
                    </div>,
                    ...col.items.map((item) => {
                      const featured = item.featured;
                      return (
                        <Link
                          key={`wiedza-${item.href}`}
                          to={item.href}
                          title={item.label}
                          aria-label={
                            featured && item.desc ? `${item.label} — ${item.desc}` : undefined
                          }
                          className={`group/featured flex flex-col justify-center min-h-[44px] px-5 py-2 rounded-lg hover:bg-accent/50 ${
                            isActive(item.href)
                              ? "bg-accent/50"
                              : featured
                                ? "bg-accent/25 border-l-2 border-primary"
                                : ""
                          }`}
                        >
                          <span
                            className={`flex items-center gap-1.5 text-[14px] leading-tight ${
                              isActive(item.href)
                                ? "text-primary font-medium"
                                : featured
                                  ? "text-primary font-medium"
                                  : "text-foreground/85"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {featured && (
                              <ArrowRight
                                className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/featured:translate-x-0.5"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          {item.desc && (
                            <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                              {item.desc}
                            </span>
                          )}
                        </Link>
                      );
                    }),
                  ]),

                  <div
                    key="klinika-label"
                    className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                  >
                    Klinika
                  </div>,
                  ...klinikaItems.map((item) => (
                    <Link
                      key={`klinika-${item.href}-${item.label}`}
                      to={item.href}
                      title={item.label}
                      className={`flex flex-col justify-center min-h-[44px] px-5 py-2 rounded-lg hover:bg-accent/50 ${
                        isActive(item.href) ? "bg-accent/50" : ""
                      }`}
                    >
                      <span
                        className={`block truncate text-[14px] leading-tight ${
                          isActive(item.href)
                            ? "text-primary font-medium"
                            : "text-foreground/85"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.desc && (
                        <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                          {item.desc}
                        </span>
                      )}
                    </Link>
                  )),

                  <Link
                    key="cennik"
                    to="/cennik"
                    title="Cennik"
                    className={`flex items-center min-h-[44px] px-4 py-3 rounded-lg text-[15px] font-medium hover:bg-accent/50 mt-2 truncate ${
                      isActive("/cennik")
                        ? "text-primary bg-accent/50"
                        : "text-foreground"
                    }`}
                  >
                    Cennik
                  </Link>,
                  <Link
                    key="kontakt"
                    to="/kontakt"
                    title="Kontakt"
                    className={`flex items-center min-h-[44px] px-4 py-3 rounded-lg text-[15px] font-medium hover:bg-accent/50 truncate ${
                      isActive("/kontakt")
                        ? "text-primary bg-accent/50"
                        : "text-foreground"
                    }`}
                  >
                    Kontakt
                  </Link>,
                ].map((child, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: 0.02 * i,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {child}
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="pt-3"
                >
                  <Button variant="hero" className="w-full" asChild>
                    <a
                      href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Umów Konsultację
                    </a>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
