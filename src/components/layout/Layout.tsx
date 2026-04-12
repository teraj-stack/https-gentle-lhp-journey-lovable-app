import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import ScrollToTop from "./ScrollToTop";

const Layout = () => (
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

export default Layout;
