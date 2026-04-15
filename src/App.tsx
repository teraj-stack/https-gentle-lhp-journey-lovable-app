import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import JsonLdValidator from "@/components/dev/JsonLdValidator";

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
const EdukacjaPrzedWizyta = lazy(() => import("@/pages/EdukacjaPrzedWizyta"));
const PrzygotowanieEVLT = lazy(() => import("@/pages/PrzygotowanieEVLT"));
const PrzygotowanieLHP = lazy(() => import("@/pages/PrzygotowanieLHP"));
const PolitykaPrywatnosci = lazy(() => import("@/pages/PolitykaPrywatnosci"));
const Regulamin = lazy(() => import("@/pages/Regulamin"));
const Cennik = lazy(() => import("@/pages/Cennik"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminPostEditor = lazy(() => import("@/pages/AdminPostEditor"));
const AdminBookings = lazy(() => import("@/pages/AdminBookings"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const HemoroidyInfografika = lazy(() => import("@/pages/HemoroidyInfografika"));
const FaldyOdbytu = lazy(() => import("@/pages/FaldyOdbytu"));
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
              <Route path="/dla-pacjenta/edukacja" element={<EdukacjaPrzedWizyta />} />
              <Route path="/dla-pacjenta/przygotowanie-evlt" element={<PrzygotowanieEVLT />} />
              <Route path="/dla-pacjenta/przygotowanie-lhp" element={<PrzygotowanieLHP />} />
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
              <Route path="/dla-pacjenta/faldy-odbytu" element={<FaldyOdbytu />} />
              <Route path="/leczenie/ginekomastia" element={<Ginekomastia />} />
              <Route path="/leczenie/ginekomastia-gruczolowa" element={<GinekomastiaGruczolowa />} />
              <Route path="/leczenie/ginekomastia-tluszczowa" element={<GinekomastiaTluszczowa />} />
              <Route path="/leczenie/ginekomastia-mieszana" element={<GinekomastiaMieszana />} />
              <Route path="/leczenie/spazm-lonowoodbytniczy" element={<SpazmLonowoodbytniczy />} />
              <Route path="/kontakt" element={<Kontakt />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
              <Route path="/regulamin" element={<Regulamin />} />
              <Route path="/cennik" element={<Cennik />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/post/:id" element={<AdminPostEditor />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
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
