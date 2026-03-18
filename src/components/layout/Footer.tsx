import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const Footer = () => (
  <footer className="bg-foreground text-background">
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <span className="text-2xl font-bold font-serif text-background">CML</span>
          <p className="text-sm mt-3 leading-relaxed text-background/60">
            Centrum Medycyny Laserowej. Skuteczność, empatia, zaufanie.
          </p>
          <div className="premium-divider !mx-0 mt-4 !bg-background/20" />
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold text-background mb-4 font-sans text-sm uppercase tracking-wider">Leczenie</h4>
          <ul className="space-y-2.5 text-sm text-background/70">
            <li><Link to="/leczenie/lhp" className="hover:text-background transition-colors">Hemoroidy – LHP</Link></li>
            <li><Link to="/leczenie/filac" className="hover:text-background transition-colors">Przetoki – FiLaC</Link></li>
            <li><Link to="/leczenie/silac" className="hover:text-background transition-colors">Torbiel pilonidalna – SiLaC</Link></li>
            <li><Link to="/leczenie/szczelina" className="hover:text-background transition-colors">Szczelina odbytu</Link></li>
            <li><Link to="/leczenie/plastyka" className="hover:text-background transition-colors">Plastyka odbytu</Link></li>
            <li><Link to="/leczenie/anusitis" className="hover:text-background transition-colors">Zapalenie odbytu</Link></li>
            <li><Link to="/leczenie/evlt" className="hover:text-background transition-colors">Żylaki – EVLT</Link></li>
            <li><Link to="/leczenie/skleroterapia" className="hover:text-background transition-colors">Pajączki naczyniowe</Link></li>
          </ul>
        </div>

        {/* Info */}
        <div>
          <h4 className="font-semibold text-background mb-4 font-sans text-sm uppercase tracking-wider">Informacje</h4>
          <ul className="space-y-2.5 text-sm text-background/70">
            <li><Link to="/o-nas" className="hover:text-background transition-colors">O nas</Link></li>
            <li><Link to="/dla-pacjenta" className="hover:text-background transition-colors">Dla Pacjenta</Link></li>
            <li><Link to="/wspolpraca" className="hover:text-background transition-colors">Współpraca B2B</Link></li>
            <li><Link to="/kontakt" className="hover:text-background transition-colors">Kontakt</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-background mb-4 font-sans text-sm uppercase tracking-wider">Kontakt</h4>
          <ul className="space-y-3 text-sm text-background/70">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-background/50" />
              <span>Warszawa Wilanów · Siedlce</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-background/50" />
              <span>+48 XXX XXX XXX</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-background/50" />
              <span>kontakt@cml.pl</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-background/50" />
              <span>Pon–Pt: 8:00–18:00</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-background/40">
        <p>&copy; {new Date().getFullYear()} CML – Centrum Medycyny Laserowej. Wszelkie prawa zastrzeżone.</p>
        <div className="flex gap-6">
          <Link to="/polityka-prywatnosci" className="hover:text-background/60 transition-colors">Polityka prywatności</Link>
          <Link to="/regulamin" className="hover:text-background/60 transition-colors">Regulamin</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
