import { useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { logNotFoundHit, logSuggestedRedirectHit } from "@/lib/seo/redirectLog";
import { suggestRedirect } from "@/lib/seo/suggestRedirect";

const NotFound = () => {
  const location = useLocation();

  // Wylicz sugestię SYNCHRONICZNIE — potrzebne, by zdecydować o auto-redirect
  // jeszcze przed renderowaniem widoku 404.
  const suggestion = useMemo(
    () => suggestRedirect(location.pathname),
    [location.pathname],
  );

  // Logowanie 404 — niezależnie od tego, czy zaraz przekierujemy.
  // Zapisuje też informację o akcji (auto/suggest/none), żeby w /dev/seo-redirects
  // od razu było widać czy fuzzy-matcher pomógł.
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      suggestion.action !== "none"
        ? `→ suggested ${suggestion.to} (score=${suggestion.score}, ${suggestion.action})`
        : "(no suggestion)",
    );
    logNotFoundHit(location.pathname);
    if (suggestion.action === "auto-redirect" && suggestion.to) {
      // Zaloguj też jako redirect — dzięki temu w /dev/seo-redirects widać
      // że fuzzy-matcher uratował ruch (kandydat na nowy wpis w SEO_REDIRECTS).
      logSuggestedRedirectHit(location.pathname, suggestion.to);
    }
  }, [location.pathname, suggestion]);

  // Auto-redirect przy wysokim score — bez czekania na klik użytkownika.
  if (suggestion.action === "auto-redirect" && suggestion.to) {
    return <Navigate to={suggestion.to} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-lg" data-testid="not-found">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Przepraszamy — nie znaleźliśmy strony{" "}
          <code className="font-mono text-base">{location.pathname}</code>.
        </p>

        {suggestion.action === "suggest" && suggestion.to && (
          <div
            data-testid="not-found-suggestion"
            className="mt-6 mb-6 rounded-lg border border-border bg-background/60 p-4 text-left"
          >
            <p className="text-sm text-muted-foreground mb-2">Czy chodziło Ci o:</p>
            <a
              href={suggestion.to}
              className="font-mono text-base text-primary underline-offset-2 hover:underline"
              data-testid="suggested-link"
              data-score={suggestion.score}
              data-source={suggestion.source ?? ""}
            >
              {suggestion.to}
            </a>
          </div>
        )}

        <a href="/" className="text-primary underline hover:text-primary/90">
          Wróć na stronę główną
        </a>
      </div>
    </div>
  );
};

export default NotFound;
