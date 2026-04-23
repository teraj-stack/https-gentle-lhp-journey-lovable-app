import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
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
}

interface MegaColumn {
  title: string;
  items: NavItem[];
}

// --- PROBLEM (po objawie) ---
const problemItems: NavItem[] = [
  { label: "Hemoroidy", href: "/dla-pacjenta/hemoroidy", desc: "Krwawienie, swędzenie, guzki" },
  { label: "Żylaki nóg", href: "/leczenie/evlt", desc: "Ból, obrzęki, widoczne żyły" },
  { label: "Pajączki naczyniowe", href: "/leczenie/clacs", desc: "Czerwone i fioletowe naczynka" },
  { label: "Szczelina odbytu", href: "/leczenie/szczelina", desc: "Ból i krwawienie przy wypróżnieniu" },
  { label: "Przetoka odbytu", href: "/leczenie/filac", desc: "Sączenie, ropień, nawracający ból" },
  { label: "Torbiel pilonidalna", href: "/leczenie/silac", desc: "Guzek przy kości ogonowej" },
  { label: "Fałdy okolicy odbytu", href: "/dla-pacjenta/faldy-odbytu", desc: "Wariant anatomiczny czy problem?" },
  { label: "Przewlekły ból odbytu", href: "/leczenie/spazm-lonowoodbytniczy", desc: "Spazm mięśnia łonowo-odbytniczego" },
  { label: "Ginekomastia", href: "/leczenie/ginekomastia", desc: "Powiększenie piersi u mężczyzn" },
];

// --- ZABIEG (3-kolumnowe mega-menu po dziedzinie) ---
const zabiegColumns: MegaColumn[] = [
  {
    title: "Proktologia",
    items: [
      { label: "Wszystkie zabiegi", href: "/leczenie/proktologia" },
      { label: "LHP – hemoroidy", href: "/leczenie/lhp" },
      { label: "FiLaC – przetoka", href: "/leczenie/filac" },
      { label: "SiLaC – torbiel", href: "/leczenie/silac" },
      { label: "Szczelina odbytu", href: "/leczenie/szczelina" },
      { label: "Plastyka odbytu", href: "/leczenie/plastyka" },
      { label: "Anusitis", href: "/leczenie/anusitis" },
      { label: "Spazm łonowo-odbytniczy", href: "/leczenie/spazm-lonowoodbytniczy" },
    ],
  },
  {
    title: "Flebologia",
    items: [
      { label: "Wszystkie zabiegi", href: "/leczenie/flebologia" },
      { label: "EVLT – żylaki", href: "/leczenie/evlt" },
      { label: "CLaCS – pajączki", href: "/leczenie/clacs" },
      { label: "Skleroterapia", href: "/leczenie/skleroterapia" },
      { label: "Mikroflebektomia", href: "/leczenie/mikroflebektomia" },
      { label: "Fototerapia LED", href: "/leczenie/fototerapia" },
    ],
  },
  {
    title: "Ginekomastia",
    items: [
      { label: "Wszystkie typy", href: "/leczenie/ginekomastia" },
      { label: "Gruczołowa", href: "/leczenie/ginekomastia-gruczolowa" },
      { label: "Tłuszczowa", href: "/leczenie/ginekomastia-tluszczowa" },
      { label: "Mieszana", href: "/leczenie/ginekomastia-mieszana" },
    ],
  },
];

// --- WIEDZA (edukacja, przygotowania, blog) ---
const wiedzaColumns: MegaColumn[] = [
  {
    title: "Edukacja",
    items: [
      { label: "Hemoroidy A–Z", href: "/dla-pacjenta/hemoroidy" },
      { label: "Pajączki naczyniowe", href: "/dla-pacjenta/pajaczki" },
      { label: "Profilaktyka żylaków", href: "/dla-pacjenta/profilaktyka-zylakow" },
      { label: "Pielęgnacja nóg", href: "/dla-pacjenta/pielegnacja-nog" },
      { label: "Fałdy okolicy odbytu", href: "/dla-pacjenta/faldy-odbytu" },
      { label: "Świadomy pacjent", href: "/dla-pacjenta/edukacja" },
    ],
  },
  {
    title: "Przed wizytą",
    items: [
      { label: "Przygotowanie do EVLT", href: "/dla-pacjenta/przygotowanie-evlt" },
      { label: "Przygotowanie do LHP", href: "/dla-pacjenta/przygotowanie-lhp" },
      { label: "FAQ proktologiczne", href: "/dla-pacjenta/proktolog-faq" },
      { label: "Strefa pacjenta", href: "/dla-pacjenta" },
    ],
  },
  {
    title: "Materiały",
    items: [
      { label: "Blog", href: "/blog" },
      { label: "E-book: Pajączki", href: "/dla-pacjenta/ebook-pajaczki" },
      { label: "Hemoroidy – infografika", href: "/dla-pacjenta/hemoroidy-infografika" },
    ],
  },
];

// Spłaszczone listy do isSectionActive
const flatten = (cols: MegaColumn[]): NavItem[] => cols.flatMap((c) => c.items);
const allZabiegItems = flatten(zabiegColumns);
const allWiedzaItems = flatten(wiedzaColumns);

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [navKey, setNavKey] = useState(0);
  const megaLockedUntil = useRef(0);
  const megaCloseTimer = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);
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
      if (headerRef.current && headerRef.current.contains(target)) return;
      clearMegaCloseTimer();
      // Tap outside is a deliberate dismiss — focus should not jump back into
      // the header.
      shouldRestoreFocus.current = false;
      setMegaOpen(null);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isTouchDevice, megaOpen, clearMegaCloseTimer]);

  // Escape closes the open dropdown and restores focus to its trigger.
  useEffect(() => {
    if (megaOpen === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      clearMegaCloseTimer();
      shouldRestoreFocus.current = true;
      setMegaOpen(null);
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
  const isSectionActive = (items: NavItem[]) => items.some((i) => pathname === i.href);

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
          className={`flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isSectionActive(items)
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
            {items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                role="menuitem"
                onClick={handleMegaLinkClick}
                onPointerUp={handleMegaLinkPointerUp}
                className={`block px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-accent/50 ${
                  isActive(item.href) ? "bg-accent/50" : ""
                }`}
              >
                <div
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {item.label}
                </div>
                {item.desc && (
                  <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                )}
              </Link>
            ))}
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
          className={`flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isSectionActive(allItems)
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
                    {col.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          role="menuitem"
                          onClick={handleMegaLinkClick}
                          onPointerUp={handleMegaLinkPointerUp}
                          className={`block px-2 py-1.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-accent/50 ${
                            isActive(item.href)
                              ? "text-primary bg-accent/50 font-medium"
                              : "text-foreground/80 hover:text-primary hover:bg-accent/40"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
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
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoCml}
              alt="CML – Centrum Medycyny Laserowej"
              className="h-12 sm:h-10 md:h-12 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/o-nas"
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 ${
                isActive("/o-nas")
                  ? "text-primary bg-accent/50"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              O nas
            </Link>

            <SingleDropdown keyName="problem" label="Problem" items={problemItems} />
            <MegaDropdown keyName="zabieg" label="Zabieg" columns={zabiegColumns} />
            <MegaDropdown keyName="wiedza" label="Wiedza" columns={wiedzaColumns} />

            <Link
              to="/wspolpraca"
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 ${
                isActive("/wspolpraca")
                  ? "text-primary bg-accent/50"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              Współpraca
            </Link>

            <Link
              to="/cennik"
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 ${
                isActive("/cennik")
                  ? "text-primary bg-accent/50"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              Cennik
            </Link>

            <Link
              to="/kontakt"
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 ${
                isActive("/kontakt")
                  ? "text-primary bg-accent/50"
                  : "text-foreground/80 hover:text-primary"
              }`}
            >
              Kontakt
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="hero" size="default" className="hidden sm:inline-flex" asChild>
              <a
                href="https://www.znanylekarz.pl/jan-bujok-2/chirurg-flebolog-proktolog/warszawa"
                target="_blank"
                rel="noopener noreferrer"
              >
                Umów Konsultację
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

      {/* MOBILE MENU */}
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
              className="lg:hidden bg-card border-t border-border overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="px-4 py-4 space-y-1">
                {[
                  <Link
                    key="o-nas"
                    to="/o-nas"
                    className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50 ${
                      isActive("/o-nas")
                        ? "text-primary bg-accent/50"
                        : "text-foreground"
                    }`}
                  >
                    O nas
                  </Link>,
                  <div
                    key="problem-label"
                    className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                  >
                    Problem
                  </div>,
                  ...problemItems.map((item) => (
                    <Link
                      key={`problem-${item.href}`}
                      to={item.href}
                      className={`block px-6 py-2.5 rounded-lg text-sm hover:bg-accent/50 ${
                        isActive(item.href)
                          ? "text-primary bg-accent/50 font-medium"
                          : "text-foreground/80"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )),

                  ...zabiegColumns.flatMap((col, i) => [
                    <div
                      key={`zabieg-label-${i}`}
                      className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                    >
                      Zabieg · {col.title}
                    </div>,
                    ...col.items.map((item) => (
                      <Link
                        key={`zabieg-${item.href}`}
                        to={item.href}
                        className={`block px-6 py-2.5 rounded-lg text-sm hover:bg-accent/50 ${
                          isActive(item.href)
                            ? "text-primary bg-accent/50 font-medium"
                            : "text-foreground/80"
                        }`}
                      >
                        {item.label}
                      </Link>
                    )),
                  ]),

                  ...wiedzaColumns.flatMap((col, i) => [
                    <div
                      key={`wiedza-label-${i}`}
                      className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2"
                    >
                      Wiedza · {col.title}
                    </div>,
                    ...col.items.map((item) => (
                      <Link
                        key={`wiedza-${item.href}`}
                        to={item.href}
                        className={`block px-6 py-2.5 rounded-lg text-sm hover:bg-accent/50 ${
                          isActive(item.href)
                            ? "text-primary bg-accent/50 font-medium"
                            : "text-foreground/80"
                        }`}
                      >
                        {item.label}
                      </Link>
                    )),
                  ]),

                  <Link
                    key="wspolpraca"
                    to="/wspolpraca"
                    className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50 mt-2 ${
                      isActive("/wspolpraca")
                        ? "text-primary bg-accent/50"
                        : "text-foreground"
                    }`}
                  >
                    Współpraca
                  </Link>,
                  <Link
                    key="cennik"
                    to="/cennik"
                    className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50 ${
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
                    className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50 ${
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
