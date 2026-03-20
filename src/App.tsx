import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import LHP from "@/pages/LHP";
import About from "@/pages/About";
import Szczelina from "@/pages/Szczelina";
import Plastyka from "@/pages/Plastyka";
import Anusitis from "@/pages/Anusitis";
import Wspolpraca from "@/pages/Wspolpraca";
import DlaPacjenta from "@/pages/DlaPacjenta";
import EVLT from "@/pages/EVLT";

import Skleroterapia from "@/pages/Skleroterapia";
import CLaCS from "@/pages/CLaCS";
import Kontakt from "@/pages/Kontakt";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            
            <Route path="/leczenie/skleroterapia" element={<Skleroterapia />} />
            <Route path="/kontakt" element={<Kontakt />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
