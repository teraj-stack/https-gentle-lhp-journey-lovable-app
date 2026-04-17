import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import ScrollToTop from "./ScrollToTop";
import { useScrollToHash } from "@/hooks/useScrollToHash";

const Layout = () => {
  // Globalny scroll-to-anchor dla DOWOLNEGO #hash w URL (np. /strona#sekcja).
  // Działa zarówno przy wejściu z zewnątrz, jak i przy nawigacji client-side.
  useScrollToHash();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  );
};

export default Layout;
