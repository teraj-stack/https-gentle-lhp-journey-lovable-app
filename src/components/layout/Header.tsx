import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/logo-bujok.png";

const proktologiaItems = [
  { label: "Hemoroidy – LHP", href: "/leczenie/lhp", desc: "Laserowa plastyka hemoroidów" },
  { label: "Przetoki – FiLaC", href: "/leczenie/filac", desc: "Laserowe zamykanie przetok" },
  { label: "Torbiel pilonidalna – SiLaC", href: "/leczenie/silac", desc: "Laserowe leczenie torbieli" },
  { label: "Szczelina odbytu", href: "/leczenie/szczelina", desc: "Od diety do lasera" },
  { label: "Plastyka odbytu", href: "/leczenie/plastyka", desc: "Estetyka i komfort" },
  { label: "Zapalenie odbytu", href: "/leczenie/anusitis", desc: "Leczenie farmakologiczne" },
];

const flebologiaItems = [
  { label: "Żylaki – EVLT", href: "/leczenie/evlt", desc: "Ablacja wewnątrzżylna laserem" },
  { label: "Skleroterapia żylaków", href: "/leczenie/skleroterapia", desc: "Zamykanie żylakowatych naczyń" },
  { label: "Pajączki – CLaCS", href: "/leczenie/clacs", desc: "Crio Laser and Crio Sclerotherapy" },
];

const dlaPacjentaItems = [
  { label: "Przygotowanie do wizyty", href: "/dla-pacjenta", desc: "Informacje przed wizytą" },
  { label: "Lekarz odpowiada", href: "/dla-pacjenta/proktolog-faq", desc: "FAQ o hemoroidach i wizycie" },
  { label: "Odzyskaj beztroskę", href: "/dla-pacjenta/ebook-pajaczki", desc: "E-book o pajączkach żylnych" },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (href: string) => pathname === href;
  const isSectionActive = (items: { href: string }[]) => items.some((item) => pathname === item.href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(null);
  }, [location]);

  return (
    <header
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
              src={logoImage}
              alt="Bujok Medical logo"
              className="h-10 md:h-12 w-auto rounded-md"
            />
            <span className="hidden sm:block text-xs text-muted-foreground leading-tight">
              Centrum<br />Medycyny Laserowej
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/o-nas"
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent/50 ${
                isActive("/o-nas") ? "text-primary bg-accent/50" : "text-foreground/80 hover:text-primary"
              }`}
            >
              O nas
            </Link>

            {/* Proktologia Mega */}
            <div
              className="relative"
              onMouseEnter={() => setMegaOpen("prokto")}
              onMouseLeave={() => setMegaOpen(null)}
            >
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50">
                Proktologia
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaOpen === "prokto" ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {megaOpen === "prokto" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-1 w-72 bg-card rounded-xl shadow-lg border border-border p-2"
                  >
                    {proktologiaItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="block px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Flebologia Mega */}
            <div
              className="relative"
              onMouseEnter={() => setMegaOpen("flebo")}
              onMouseLeave={() => setMegaOpen(null)}
            >
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50">
                Flebologia
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaOpen === "flebo" ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {megaOpen === "flebo" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-1 w-72 bg-card rounded-xl shadow-lg border border-border p-2"
                  >
                    {flebologiaItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="block px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dla Pacjenta Mega */}
            <div
              className="relative"
              onMouseEnter={() => setMegaOpen("pacjent")}
              onMouseLeave={() => setMegaOpen(null)}
            >
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50">
                Dla Pacjenta
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaOpen === "pacjent" ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {megaOpen === "pacjent" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-1 w-72 bg-card rounded-xl shadow-lg border border-border p-2"
                  >
                    {dlaPacjentaItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="block px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/wspolpraca"
              className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
            >
              Współpraca
            </Link>

            <Link
              to="/kontakt"
              className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
            >
              Kontakt
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="hero" size="default" className="hidden sm:inline-flex" asChild>
              <Link to="/kontakt">Umów Konsultację</Link>
            </Button>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-accent/50 transition-colors text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden bg-card border-t border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {[
                <Link key="o-nas" to="/o-nas" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent/50">O nas</Link>,
                <div key="prokto-label" className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider">Proktologia</div>,
                ...proktologiaItems.map((item) => (
                  <Link key={item.href} to={item.href} className="block px-6 py-2.5 rounded-lg text-sm text-foreground/80 hover:bg-accent/50">
                    {item.label}
                  </Link>
                )),
                <div key="flebo-label" className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2">Flebologia</div>,
                ...flebologiaItems.map((item) => (
                  <Link key={item.href} to={item.href} className="block px-6 py-2.5 rounded-lg text-sm text-foreground/80 hover:bg-accent/50">
                    {item.label}
                  </Link>
                )),
                <div key="pacjent-label" className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mt-2">Dla Pacjenta</div>,
                ...dlaPacjentaItems.map((item) => (
                  <Link key={item.href} to={item.href} className="block px-6 py-2.5 rounded-lg text-sm text-foreground/80 hover:bg-accent/50">
                    {item.label}
                  </Link>
                )),
                <Link key="wspolpraca" to="/wspolpraca" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent/50">Współpraca</Link>,
                <Link key="kontakt" to="/kontakt" className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent/50">Kontakt</Link>,
              ].map((child, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
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
                  <Link to="/kontakt">Umów Konsultację</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
