import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "cml-cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto glass-card p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-border shadow-[var(--shadow-elevated)]">
        <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          Używamy plików cookies, aby zapewnić prawidłowe działanie strony i&nbsp;analizować ruch.{" "}
          <Link to="/polityka-prywatnosci" className="text-primary hover:underline">
            Polityka prywatności
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleReject}>
            Odrzuć
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Akceptuję
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
