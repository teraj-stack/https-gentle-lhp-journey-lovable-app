import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";

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
const Skleroterapia = lazy(() => import("@/pages/Skleroterapia"));
const CLaCS = lazy(() => import("@/pages/CLaCS"));
const Pajaczki = lazy(() => import("@/pages/Pajaczki"));
const Kontakt = lazy(() => import("@/pages/Kontakt"));
const EbookPajaczki = lazy(() => import("@/pages/EbookPajaczki"));
const ProktologFAQ = lazy(() => import("@/pages/ProktologFAQ"));
const PolitykaPrywatnosci = lazy(() => import("@/pages/PolitykaPrywatnosci"));
const Regulamin = lazy(() => import("@/pages/Regulamin"));
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
              <Route path="/leczenie/szczelina" element={<Szczelina />} />
              <Route path="/leczenie/plastyka" element={<Plastyka />} />
              <Route path="/leczenie/anusitis" element={<Anusitis />} />
              <Route path="/dla-pacjenta" element={<DlaPacjenta />} />
              <Route path="/leczenie/evlt" element={<EVLT />} />
              <Route path="/leczenie/filac" element={<FiLaC />} />
              <Route path="/leczenie/silac" element={<SiLaC />} />
              <Route path="/leczenie/skleroterapia" element={<Skleroterapia />} />
              <Route path="/leczenie/clacs" element={<CLaCS />} />
              <Route path="/dla-pacjenta/pajaczki" element={<Pajaczki />} />
              <Route path="/dla-pacjenta/ebook-pajaczki" element={<EbookPajaczki />} />
              <Route path="/dla-pacjenta/proktolog-faq" element={<ProktologFAQ />} />
              <Route path="/kontakt" element={<Kontakt />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
