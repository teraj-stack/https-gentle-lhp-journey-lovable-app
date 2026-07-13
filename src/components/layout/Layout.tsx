import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import ScrollToTop from "./ScrollToTop";
import { useScrollToHash } from "@/hooks/useScrollToHash";
import { useAutoSaveStartupDiagnostic } from "@/hooks/useAutoSaveStartupDiagnostic";

const Layout = () => {
  // Globalny scroll-to-anchor dla DOWOLNEGO #hash w URL (np. /strona#sekcja).
  // Działa zarówno przy wejściu z zewnątrz, jak i przy nawigacji client-side.
  useScrollToHash();
  // Jednorazowa diagnostyka transportu auto-zapisu (BroadcastChannel vs storage-fallback).
  // Po starcie aplikacji raportuje status i — jeśli BC padł z runtime error — proponuje refresh.
  useAutoSaveStartupDiagnostic();

  return (
    <div className="min-h-screen flex flex-col">
      {/*
        Skip link — WCAG 2.4.1 (Bypass Blocks). Visually hidden until focused,
        then anchors at top-left. Lets keyboard users jump past the header
        dropdowns straight into the page's <main>.
      */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Przejdź do treści
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </div>
  );
};

export default Layout;

