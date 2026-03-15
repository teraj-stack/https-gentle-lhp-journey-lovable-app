import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const Footer = () => (
  <footer className="bg-foreground text-primary-foreground/80">
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <span className="text-2xl font-bold font-serif text-primary-foreground">CML</span>
          <p className="text-sm mt-3 leading-relaxed text-primary-foreground/60">
            Centrum Medycyny Laserowej. Skuteczność, empatia, zaufanie.
          </p>
          <div className="premium-divider !mx-0 mt-4 !bg-primary-foreground/20" />
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold text-primary-foreground mb-4 font-sans text-sm uppercase tracking-wider">Leczenie</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/leczenie/lhp" className="hover:text-primary-foreground transition-colors">Hemoroidy – LHP</Link></li>
            <li><Link to="/leczenie/filac" className="hover:text-primary-foreground transition-colors">Przetoki – FiLaC</Link></li>
            <li><Link to="/leczenie/silac" className="hover:text-primary-foreground transition-colors">Torbiel pilonidalna – SiLaC</Link></li>
            <li><Link to="/leczenie/evlt" className="hover:text-primary-foreground transition-colors">Żylaki – EVLT</Link></li>
            <li><Link to="/leczenie/skleroterapia" className="hover:text-primary-foreground transition-colors">Pajączki naczyniowe</Link></li>
          </ul>
        </div>

        {/* Info */}
        <div>
          <h4 className="font-semibold text-primary-foreground mb-4 font-sans text-sm uppercase tracking-wider">Informacje</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/o-nas" className="hover:text-primary-foreground transition-colors">O nas</Link></li>
            <li><Link to="/dla-pacjenta" className="hover:text-primary-foreground transition-colors">Dla Pacjenta</Link></li>
            <li><Link to="/wspolpraca" className="hover:text-primary-foreground transition-colors">Współpraca B2B</Link></li>
            <li><Link to="/kontakt" className="hover:text-primary-foreground transition-colors">Kontakt</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-primary-foreground mb-4 font-sans text-sm uppercase tracking-wider">Kontakt</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary-foreground/50" />
              <span>Warszawa Wilanów · Siedlce</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-primary-foreground/50" />
              <span>+48 XXX XXX XXX</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-primary-foreground/50" />
              <span>kontakt@mcpl.pl</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-primary-foreground/50" />
              <span>Pon–Pt: 8:00–18:00</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/40">
        <p>&copy; {new Date().getFullYear()} MCPL – Mazowieckie Centrum Proktologii Laserowej. Wszelkie prawa zastrzeżone.</p>
        <div className="flex gap-6">
          <Link to="/polityka-prywatnosci" className="hover:text-primary-foreground/60 transition-colors">Polityka prywatności</Link>
          <Link to="/regulamin" className="hover:text-primary-foreground/60 transition-colors">Regulamin</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
