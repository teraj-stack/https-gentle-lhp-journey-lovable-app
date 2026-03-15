import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const proktologiaItems = [
  { label: "Hemoroidy – LHP", href: "/leczenie/lhp", desc: "Laserowa plastyka hemoroidów" },
  { label: "Przetoki – FiLaC", href: "/leczenie/filac", desc: "Laserowe zamykanie przetok" },
  { label: "Torbiel pilonidalna – SiLaC", href: "/leczenie/silac", desc: "Laserowe leczenie torbieli" },
  { label: "Szczelina odbytu", href: "/leczenie/szczelina", desc: "Nowoczesne metody leczenia" },
];

const flebologiaItems = [
  { label: "Żylaki – EVLT", href: "/leczenie/evlt", desc: "Ablacja wewnątrzżylna laserem" },
  { label: "Klejenie żył", href: "/leczenie/klejenie-zyl", desc: "Bezinwazyjna metoda zamykania" },
  { label: "Pajączki naczyniowe", href: "/leczenie/skleroterapia", desc: "Skleroterapia precyzyjna" },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const location = useLocation();

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
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold font-serif tracking-tight text-primary">
              MCPL
            </span>
            <span className="hidden sm:block text-xs text-muted-foreground leading-tight">
              Mazowieckie Centrum<br />Proktologii Laserowej
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/o-nas"
              className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
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

            <Link
              to="/dla-pacjenta"
              className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
            >
              Dla Pacjenta
            </Link>

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

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Button variant="hero" size="default" className="hidden sm:inline-flex" asChild>
              <Link to="/kontakt">Umów Konsultację</Link>
            </Button>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-t border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              <Link to="/o-nas" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50">O nas</Link>
              
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proktologia</div>
              {proktologiaItems.map((item) => (
                <Link key={item.href} to={item.href} className="block px-6 py-2.5 rounded-lg text-sm hover:bg-accent/50">
                  {item.label}
                </Link>
              ))}

              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">Flebologia</div>
              {flebologiaItems.map((item) => (
                <Link key={item.href} to={item.href} className="block px-6 py-2.5 rounded-lg text-sm hover:bg-accent/50">
                  {item.label}
                </Link>
              ))}

              <Link to="/dla-pacjenta" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50">Dla Pacjenta</Link>
              <Link to="/wspolpraca" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50">Współpraca</Link>
              <Link to="/kontakt" className="block px-4 py-3 rounded-lg text-sm font-medium hover:bg-accent/50">Kontakt</Link>

              <div className="pt-3">
                <Button variant="hero" className="w-full" asChild>
                  <Link to="/kontakt">Umów Konsultację</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
