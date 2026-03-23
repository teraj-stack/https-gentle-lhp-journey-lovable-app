import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react";

const Footer = () =>
<footer className="bg-background border-t border-border">
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
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
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider">Proktologia</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/leczenie/lhp" className="hover:text-primary transition-colors">Hemoroidy – LHP</Link></li>
            <li><Link to="/leczenie/filac" className="hover:text-primary transition-colors">Przetoki – FiLaC</Link></li>
            <li><Link to="/leczenie/silac" className="hover:text-primary transition-colors">Torbiel pilonidalna – SiLaC</Link></li>
            <li><Link to="/leczenie/szczelina" className="hover:text-primary transition-colors">Szczelina odbytu</Link></li>
            <li><Link to="/leczenie/plastyka" className="hover:text-primary transition-colors">Plastyka odbytu</Link></li>
            <li><Link to="/leczenie/anusitis" className="hover:text-primary transition-colors">Zapalenie odbytu</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider">Flebologia</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/leczenie/evlt" className="hover:text-primary transition-colors">Żylaki – EVLT</Link></li>
            <li><Link to="/leczenie/skleroterapia" className="hover:text-primary transition-colors">Skleroterapia</Link></li>
            <li><Link to="/leczenie/clacs" className="hover:text-primary transition-colors">Pajączki – CLaCS</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider">Informacje</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/o-nas" className="hover:text-primary transition-colors">O nas</Link></li>
            <li><Link to="/dla-pacjenta" className="hover:text-primary transition-colors">Dla Pacjenta</Link></li>
            <li><Link to="/wspolpraca" className="hover:text-primary transition-colors">Współpraca B2B</Link></li>
            <li><Link to="/kontakt" className="hover:text-primary transition-colors">Kontakt</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 font-sans text-sm uppercase tracking-wider">Kontakt</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/50" />
              <span>Warszawa Wilanów · Siedlce</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-primary/50" />
              <span>+48 XXX XXX XXX</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-primary/50" />
              <span>kontakt@cml.pl</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-primary/50" />
              <span>Pon–Pt: 8:00–22:00</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/60">
        <p>&copy; {new Date().getFullYear()} CML – Centrum Medycyny Laserowej. Wszelkie prawa zastrzeżone.</p>
        <div className="flex gap-6">
          <Link to="/polityka-prywatnosci" className="hover:text-foreground/60 transition-colors">Polityka prywatności</Link>
          <Link to="/regulamin" className="hover:text-foreground/60 transition-colors">Regulamin</Link>
        </div>
      </div>
    </div>
  </footer>;


export default Footer;