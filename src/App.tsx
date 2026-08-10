import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import JsonLdValidator from "@/components/dev/JsonLdValidator";
import SeoRedirect from "@/components/seo/SeoRedirect";
import { SEO_REDIRECTS } from "@/lib/seo/redirectsMap";

const Home = lazy(() => import("@/pages/Home"));
const LHP = lazy(() => import("@/pages/LHP"));
const About = lazy(() => import("@/pages/About"));
const Szczelina = lazy(() => import("@/pages/Szczelina"));
const Plastyka = lazy(() => import("@/pages/Plastyka"));
const Anusitis = lazy(() => import("@/pages/Anusitis"));
const Wspolpraca = lazy(() => import("@/pages/Wspolpraca"));
const DlaPacjenta = lazy(() => import("@/pages/DlaPacjenta"));
const EVLT = lazy(() => import("@/pages/EVLT"));
const FiLaC = lazy(() => import("@/pages/FiLaC"));
const SiLaC = lazy(() => import("@/pages/SiLaC"));
const Hemoroidy = lazy(() => import("@/pages/Hemoroidy"));
const Skleroterapia = lazy(() => import("@/pages/Skleroterapia"));
const Mikroflebektomia = lazy(() => import("@/pages/Mikroflebektomia"));
const CLaCS = lazy(() => import("@/pages/CLaCS"));
const Fototerapia = lazy(() => import("@/pages/Fototerapia"));
const Pajaczki = lazy(() => import("@/pages/Pajaczki"));
const Kontakt = lazy(() => import("@/pages/Kontakt"));
const EbookPajaczki = lazy(() => import("@/pages/EbookPajaczki"));
const ProktologFAQ = lazy(() => import("@/pages/ProktologFAQ"));
const PielegnacjaNog = lazy(() => import("@/pages/PielegnacjaNog"));
const ProfilaktykaZylakow = lazy(() => import("@/pages/ProfilaktykaZylakow"));
const EdukacjaPrzedWizyta = lazy(() => import("@/pages/EdukacjaPrzedWizyta"));
const PrzygotowanieEVLT = lazy(() => import("@/pages/PrzygotowanieEVLT"));
const PrzygotowanieLHP = lazy(() => import("@/pages/PrzygotowanieLHP"));
const PrzygotowanieFilac = lazy(() => import("@/pages/PrzygotowanieFilac"));
const PrzygotowanieSilac = lazy(() => import("@/pages/PrzygotowanieSilac"));
const PrzygotowanieClacs = lazy(() => import("@/pages/PrzygotowanieClacs"));
const PrzygotowanieSkleroterapia = lazy(() => import("@/pages/PrzygotowanieSkleroterapia"));
const PrzygotowanieMikroflebektomia = lazy(() => import("@/pages/PrzygotowanieMikroflebektomia"));
const PrzygotowaniePlastyka = lazy(() => import("@/pages/PrzygotowaniePlastyka"));
const PrzygotowanieGinekomastii = lazy(() => import("@/pages/PrzygotowanieGinekomastii"));
const PrzygotowanieGinekomastiiGruczolowa = lazy(() => import("@/pages/PrzygotowanieGinekomastiiGruczolowa"));
const PrzygotowanieGinekomastiiTluszczowa = lazy(() => import("@/pages/PrzygotowanieGinekomastiiTluszczowa"));
const PrzygotowanieGinekomastiiMieszana = lazy(() => import("@/pages/PrzygotowanieGinekomastiiMieszana"));
const PolitykaPrywatnosci = lazy(() => import("@/pages/PolitykaPrywatnosci"));
const Regulamin = lazy(() => import("@/pages/Regulamin"));
const Cennik = lazy(() => import("@/pages/Cennik"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Szukaj = lazy(() => import("@/pages/Szukaj"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminPostEditor = lazy(() => import("@/pages/AdminPostEditor"));
const AdminBookings = lazy(() => import("@/pages/AdminBookings"));
const AdminNotificationRecipients = lazy(() => import("@/pages/AdminNotificationRecipients"));
const AdminSystemHealth = lazy(() => import("@/pages/AdminSystemHealth"));
const AdminEmailDashboard = lazy(() => import("@/pages/AdminEmailDashboard"));
const AdminSecurityChecklist = lazy(() => import("@/pages/AdminSecurityChecklist"));
const AdminScrollTest = lazy(() => import("@/pages/AdminScrollTest"));
const AdminVeinImages = lazy(() => import("@/pages/AdminVeinImages"));
const DevTooltipPreview = lazy(() => import("@/pages/DevTooltipPreview"));
const DevI18nContract = lazy(() => import("@/pages/DevI18nContract"));
const DevHeaderPreview = lazy(() => import("@/pages/DevHeaderPreview"));
const DevSeoRedirects = lazy(() => import("@/pages/DevSeoRedirects"));
const AdminSeoRedirects = lazy(() => import("@/pages/AdminSeoRedirects"));
const DevVeinImagesPreview = lazy(() => import("@/pages/DevVeinImagesPreview"));

const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const ReminderOptOut = lazy(() => import("@/pages/ReminderOptOut"));
const BookingAction = lazy(() => import("@/pages/BookingAction"));
const HemoroidyInfografika = lazy(() => import("@/pages/HemoroidyInfografika"));
const QuizHemoroidy = lazy(() => import("@/pages/QuizHemoroidy"));
const EbmHemoroidy = lazy(() => import("@/pages/EbmHemoroidy"));
const DziennikHemoroidy = lazy(() => import("@/pages/DziennikHemoroidy"));
const FaldyOdbytu = lazy(() => import("@/pages/FaldyOdbytu"));
const SeksAnalnyHemoroidy = lazy(() => import("@/pages/SeksAnalnyHemoroidy"));
const Ginekomastia = lazy(() => import("@/pages/Ginekomastia"));
const GinekomastiaGruczolowa = lazy(() => import("@/pages/GinekomastiaGruczolowa"));
const GinekomastiaTluszczowa = lazy(() => import("@/pages/GinekomastiaTluszczowa"));
const GinekomastiaMieszana = lazy(() => import("@/pages/GinekomastiaMieszana"));
const SpazmLonowoodbytniczy = lazy(() => import("@/pages/SpazmLonowoodbytniczy"));
const Proktologia = lazy(() => import("@/pages/Proktologia"));
const Flebologia = lazy(() => import("@/pages/Flebologia"));
const ZaleceniaPoEVLT = lazy(() => import("@/pages/ZaleceniaPoEVLT"));
const ZaleceniaPoLHP = lazy(() => import("@/pages/ZaleceniaPoLHP"));
const ZaleceniaPoClacs = lazy(() => import("@/pages/ZaleceniaPoClacs"));
const ZaleceniaPoFilac = lazy(() => import("@/pages/ZaleceniaPoFilac"));
const ZaleceniaPoSilac = lazy(() => import("@/pages/ZaleceniaPoSilac"));
const RaportyCWV = lazy(() => import("@/pages/RaportyCWV"));
const AdminCWV = lazy(() => import("@/pages/AdminCWV"));
const AdminEditorialCalendar = lazy(() => import("@/pages/AdminEditorialCalendar"));
const ZaleceniaPoSkleroterapii = lazy(() => import("@/pages/ZaleceniaPoSkleroterapii"));
const ZaleceniaPoPlastyce = lazy(() => import("@/pages/ZaleceniaPoPlastyce"));
const ZaleceniaPoMikroflebektomii = lazy(() => import("@/pages/ZaleceniaPoMikroflebektomii"));
const ZaleceniaPoGinekomastii = lazy(() => import("@/pages/ZaleceniaPoGinekomastii"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/o-nas" element={<About />} />
              <Route path="/wspolpraca" element={<Wspolpraca />} />
              <Route path="/leczenie/lhp" element={<LHP />} />
              <Route path="/leczenie/proktologia" element={<Proktologia />} />
              <Route path="/leczenie/flebologia" element={<Flebologia />} />
              <Route path="/leczenie/szczelina" element={<Szczelina />} />
              <Route path="/leczenie/plastyka" element={<Plastyka />} />
              <Route path="/leczenie/anusitis" element={<Anusitis />} />
              <Route path="/dla-pacjenta" element={<DlaPacjenta />} />
              <Route path="/leczenie/evlt" element={<EVLT />} />
              <Route path="/leczenie/filac" element={<FiLaC />} />
              <Route path="/leczenie/silac" element={<SiLaC />} />
              <Route path="/leczenie/skleroterapia" element={<Skleroterapia />} />
              <Route path="/leczenie/mikroflebektomia" element={<Mikroflebektomia />} />
              <Route path="/leczenie/clacs" element={<CLaCS />} />
              <Route path="/leczenie/fototerapia" element={<Fototerapia />} />
              <Route path="/dla-pacjenta/pajaczki" element={<Pajaczki />} />
              <Route path="/dla-pacjenta/hemoroidy" element={<Hemoroidy />} />
              <Route path="/dla-pacjenta/ebook-pajaczki" element={<EbookPajaczki />} />
              <Route path="/dla-pacjenta/proktolog-faq" element={<ProktologFAQ />} />
              <Route path="/dla-pacjenta/pielegnacja-nog" element={<PielegnacjaNog />} />
              <Route path="/dla-pacjenta/profilaktyka-zylakow" element={<ProfilaktykaZylakow />} />
              <Route path="/dla-pacjenta/edukacja" element={<EdukacjaPrzedWizyta />} />
              <Route path="/dla-pacjenta/przygotowanie-evlt" element={<PrzygotowanieEVLT />} />
              <Route path="/dla-pacjenta/przygotowanie-lhp" element={<PrzygotowanieLHP />} />
              <Route path="/dla-pacjenta/przygotowanie-filac" element={<PrzygotowanieFilac />} />
              <Route path="/dla-pacjenta/przygotowanie-silac" element={<PrzygotowanieSilac />} />
              <Route path="/dla-pacjenta/przygotowanie-clacs" element={<PrzygotowanieClacs />} />
              <Route path="/dla-pacjenta/przygotowanie-skleroterapia" element={<PrzygotowanieSkleroterapia />} />
              <Route path="/dla-pacjenta/przygotowanie-mikroflebektomia" element={<PrzygotowanieMikroflebektomia />} />
              <Route path="/dla-pacjenta/przygotowanie-plastyka" element={<PrzygotowaniePlastyka />} />
              <Route path="/dla-pacjenta/przygotowanie-ginekomastii" element={<PrzygotowanieGinekomastii />} />
              <Route path="/dla-pacjenta/przygotowanie-ginekomastia-gruczolowa" element={<PrzygotowanieGinekomastiiGruczolowa />} />
              <Route path="/dla-pacjenta/przygotowanie-ginekomastia-tluszczowa" element={<PrzygotowanieGinekomastiiTluszczowa />} />
              <Route path="/dla-pacjenta/przygotowanie-ginekomastia-mieszana" element={<PrzygotowanieGinekomastiiMieszana />} />
              <Route path="/dla-pacjenta/zalecenia-po-evlt" element={<ZaleceniaPoEVLT />} />
              <Route path="/dla-pacjenta/zalecenia-po-lhp" element={<ZaleceniaPoLHP />} />
              <Route path="/dla-pacjenta/zalecenia-po-clacs" element={<ZaleceniaPoClacs />} />
              <Route path="/dla-pacjenta/zalecenia-po-filac" element={<ZaleceniaPoFilac />} />
              <Route path="/dla-pacjenta/zalecenia-po-silac" element={<ZaleceniaPoSilac />} />
              <Route path="/dla-pacjenta/zalecenia-po-skleroterapii" element={<ZaleceniaPoSkleroterapii />} />
              <Route path="/dla-pacjenta/zalecenia-po-plastyce" element={<ZaleceniaPoPlastyce />} />
              <Route path="/dla-pacjenta/zalecenia-po-mikroflebektomii" element={<ZaleceniaPoMikroflebektomii />} />
              <Route path="/dla-pacjenta/zalecenia-po-ginekomastii" element={<ZaleceniaPoGinekomastii />} />
              <Route path="/dla-pacjenta/hemoroidy-infografika" element={<HemoroidyInfografika />} />
              <Route path="/dla-pacjenta/quiz-hemoroidy" element={<QuizHemoroidy />} />
              <Route path="/dla-pacjenta/ebm-hemoroidy" element={<EbmHemoroidy />} />
              <Route path="/dla-pacjenta/dziennik-hemoroidy" element={<DziennikHemoroidy />} />
              <Route path="/dla-pacjenta/faldy-odbytu" element={<FaldyOdbytu />} />
              <Route path="/wiedza/seks-analny-a-hemoroidy" element={<SeksAnalnyHemoroidy />} />
              <Route path="/leczenie/ginekomastia" element={<Ginekomastia />} />
              <Route path="/leczenie/ginekomastia-gruczolowa" element={<GinekomastiaGruczolowa />} />
              <Route path="/leczenie/ginekomastia-tluszczowa" element={<GinekomastiaTluszczowa />} />
              <Route path="/leczenie/ginekomastia-mieszana" element={<GinekomastiaMieszana />} />
              <Route path="/leczenie/spazm-lonowoodbytniczy" element={<SpazmLonowoodbytniczy />} />
              <Route path="/kontakt" element={<Kontakt />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/szukaj" element={<Szukaj />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
              <Route path="/regulamin" element={<Regulamin />} />
              <Route path="/cennik" element={<Cennik />} />
              {SEO_REDIRECTS.map(({ from, to }) => (
                <Route key={from} path={from} element={<SeoRedirect to={to} />} />
              ))}
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/post/:id" element={<AdminPostEditor />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/notification-recipients" element={<AdminNotificationRecipients />} />
            <Route path="/admin/system-health" element={<AdminSystemHealth />} />
            <Route path="/admin/email-dashboard" element={<AdminEmailDashboard />} />
            <Route path="/admin/security" element={<AdminSecurityChecklist />} />
            <Route path="/admin/scroll-test" element={<AdminScrollTest />} />
            <Route path="/admin/vein-images" element={<AdminVeinImages />} />
            <Route path="/admin/seo-redirects" element={<AdminSeoRedirects />} />
            <Route path="/admin/cwv" element={<AdminCWV />} />
            <Route path="/admin/kalendarz" element={<AdminEditorialCalendar />} />
            <Route path="/raporty/cwv" element={<RaportyCWV />} />
            
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/reminder-opt-out" element={<ReminderOptOut />} />
            <Route path="/booking-action" element={<BookingAction />} />
            <Route path="/dev/tooltip-preview" element={<DevTooltipPreview />} />
            <Route path="/dev/i18n-contract" element={<DevI18nContract />} />
            <Route path="/dev/vein-images-preview" element={<DevVeinImagesPreview />} />
            <Route path="/dev/header-preview" element={<DevHeaderPreview />} />
            <Route path="/dev/seo-redirects" element={<DevSeoRedirects />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <JsonLdValidator />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
