import { Link } from "react-router-dom";
import { MapPin, Phone, Facebook, Instagram } from "lucide-react";

const linkCls = "hover:text-primary transition-colors";

const Footer = () => (
  <footer className="bg-background border-t border-border">
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <span className="text-2xl font-bold font-serif text-primary">CML</span>
          <p className="text-sm mt-3 leading-relaxed text-muted-foreground">
            Centrum Medycyny Laserowej. Skuteczność, empatia, zaufanie.
          </p>
          <div className="flex gap-3 mt-4">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
          </div>
          <div className="premium-divider !mx-0 mt-4" />
          <ul className="space-y-2 mt-4 text-sm text-muted-foreground">
            <li><Link to="/o-nas" className={linkCls}>O nas</Link></li>
            <li><Link to="/wspolpraca" className={linkCls}>Współpraca B2B</Link></li>
            <li><Link to="/cennik" className={linkCls}>Cennik</Link></li>
            <li><Link to="/kontakt" className={linkCls}>Kontakt</Link></li>
          </ul>
        </div>

        {/* PROBLEM */}
        <div>
          <h3 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider text-primary">Problem</h3>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/dla-pacjenta/hemoroidy" className={linkCls}>Hemoroidy</Link></li>
            <li><Link to="/leczenie/szczelina" className={linkCls}>Szczelina odbytu</Link></li>
            <li><Link to="/leczenie/filac" className={linkCls}>Przetoka okołoodbytnicza</Link></li>
            <li><Link to="/leczenie/silac" className={linkCls}>Torbiel pilonidalna</Link></li>
            <li><Link to="/leczenie/anusitis" className={linkCls}>Ból i zapalenie odbytu</Link></li>
            <li><Link to="/leczenie/spazm-lonowoodbytniczy" className={linkCls}>Spazm łonowoodbytniczy</Link></li>
            <li><Link to="/dla-pacjenta/faldy-odbytu" className={linkCls}>Fałdy odbytu</Link></li>
            <li><Link to="/leczenie/flebologia" className={linkCls}>Żylaki kończyn</Link></li>
            <li><Link to="/leczenie/clacs" className={linkCls}>Pajączki naczyniowe</Link></li>
            <li><Link to="/leczenie/ginekomastia" className={linkCls}>Ginekomastia</Link></li>
          </ul>
        </div>

        {/* ZABIEG */}
        <div>
          <h3 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider text-primary">Zabieg</h3>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-foreground/80 mb-2">
                <Link to="/leczenie/proktologia" className={linkCls}>Proktologia</Link>
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><Link to="/leczenie/lhp" className={linkCls}>LHP – hemoroidy</Link></li>
                <li><Link to="/leczenie/filac" className={linkCls}>FiLaC – przetoki</Link></li>
                <li><Link to="/leczenie/silac" className={linkCls}>SiLaC – torbiel</Link></li>
                <li><Link to="/leczenie/plastyka" className={linkCls}>Plastyka odbytu</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/80 mb-2">
                <Link to="/leczenie/flebologia" className={linkCls}>Flebologia</Link>
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><Link to="/leczenie/evlt" className={linkCls}>EVLT – żylaki</Link></li>
                <li><Link to="/leczenie/skleroterapia" className={linkCls}>Skleroterapia</Link></li>
                <li><Link to="/leczenie/mikroflebektomia" className={linkCls}>Mikroflebektomia</Link></li>
                <li><Link to="/leczenie/clacs" className={linkCls}>CLaCS – pajączki</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* WIEDZA */}
        <div>
          <h3 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider text-primary">Wiedza</h3>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-foreground/80 mb-2">Edukacja</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><Link to="/dla-pacjenta" className={linkCls}>Dla Pacjenta</Link></li>
                <li><Link to="/dla-pacjenta/edukacja" className={linkCls}>Świadomy pacjent</Link></li>
                <li><Link to="/dla-pacjenta/hemoroidy" className={linkCls}>Hemoroidy A–Z</Link></li>
                <li><Link to="/dla-pacjenta/profilaktyka-zylakow" className={linkCls}>Profilaktyka żylaków</Link></li>
                <li><Link to="/dla-pacjenta/proktolog-faq" className={linkCls}>FAQ proktolog</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/80 mb-2">Przed wizytą</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><Link to="/dla-pacjenta/przygotowanie-lhp" className={linkCls}>Przygotowanie LHP</Link></li>
                <li><Link to="/dla-pacjenta/przygotowanie-evlt" className={linkCls}>Przygotowanie EVLT</Link></li>
                <li><Link to="/dla-pacjenta/pielegnacja-nog" className={linkCls}>Pielęgnacja nóg</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/80 mb-2">Materiały</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><Link to="/blog" className={linkCls}>Blog</Link></li>
                <li><Link to="/dla-pacjenta/ebook-pajaczki" className={linkCls}>E-book: Pajączki</Link></li>
                <li><Link to="/dla-pacjenta/hemoroidy-infografika" className={linkCls}>Infografika: Hemoroidy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* KLINIKA */}
        <div>
          <h3 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider text-primary">Klinika</h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="text-xs font-semibold text-foreground/80 mb-1">Warszawa Wilanów</p>
              <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/50" /><span>ul. Branickiego 10/U6</span></p>
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0 text-primary/50" /><span>+48 510 432 361</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CML – Centrum Medycyny Laserowej. Wszelkie prawa zastrzeżone.</p>
        <div className="flex gap-6">
          <Link to="/polityka-prywatnosci" className="hover:text-foreground transition-colors">Polityka prywatności</Link>
          <Link to="/regulamin" className="hover:text-foreground transition-colors">Regulamin</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
