/**
 * Dev-only ekran diagnostyczny SEO redirectów.
 *
 * Pokazuje:
 *  1. Pełną mapę SEO_REDIRECTS z licznikiem trafień w bieżącej sesji.
 *  2. Wszystkie 404 zarejestrowane w sesji (kandydaci do dopisania do mapy).
 *  3. Surowy log zdarzeń (timestamp, referrer, search) — pomocny przy debugu kampanii.
 *
 * Trasa: /dev/seo-redirects (NIE indeksowana, NIE linkowana z UI publicznego).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEO_REDIRECTS } from "@/lib/seo/redirectsMap";
import {
  clearRedirectLog,
  getRedirectLog,
  subscribeRedirectLog,
  type RedirectLogEntry,
} from "@/lib/seo/redirectLog";

const noindexMeta = (() => {
  if (typeof document === "undefined") return null;
  const existing = document.querySelector('meta[name="robots"][data-dev-page]');
  if (existing) return existing as HTMLMetaElement;
  const m = document.createElement("meta");
  m.setAttribute("name", "robots");
  m.setAttribute("content", "noindex, nofollow");
  m.setAttribute("data-dev-page", "seo-redirects");
  document.head.appendChild(m);
  return m;
})();

function useRedirectLog(): RedirectLogEntry[] {
  const [entries, setEntries] = useState<RedirectLogEntry[]>(() => getRedirectLog());
  useEffect(() => {
    setEntries(getRedirectLog());
    const unsub = subscribeRedirectLog(setEntries);
    // Auto-poll 1s na wypadek zmian z innych zakładek (sessionStorage nie emituje
    // 'storage' w tej samej zakładce; subscribe wyłapie naszą zakładkę, polling resztę).
    const id = window.setInterval(() => setEntries(getRedirectLog()), 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);
  return entries;
}

interface RedirectStat {
  from: string;
  to: string;
  reason?: string;
  hits: number;
  lastHit?: string;
}

const Pill = ({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "muted" }) => {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : tone === "warn"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
};

const DevSeoRedirects = () => {
  void noindexMeta;
  const log = useRedirectLog();

  const redirectStats: RedirectStat[] = useMemo(() => {
    const byFrom = new Map<string, { hits: number; lastHit?: string }>();
    for (const e of log) {
      if (e.kind !== "redirect") continue;
      const cur = byFrom.get(e.from) ?? { hits: 0, lastHit: undefined };
      cur.hits += 1;
      cur.lastHit = e.timestamp;
      byFrom.set(e.from, cur);
    }
    return SEO_REDIRECTS.map((r) => ({
      from: r.from,
      to: r.to,
      reason: r.reason,
      hits: byFrom.get(r.from)?.hits ?? 0,
      lastHit: byFrom.get(r.from)?.lastHit,
    })).sort((a, b) => b.hits - a.hits);
  }, [log]);

  const notFoundAggregated = useMemo(() => {
    const map = new Map<string, { hits: number; lastHit: string; lastReferrer: string }>();
    for (const e of log) {
      if (e.kind !== "not_found") continue;
      const cur = map.get(e.from) ?? { hits: 0, lastHit: e.timestamp, lastReferrer: e.referrer };
      cur.hits += 1;
      cur.lastHit = e.timestamp;
      cur.lastReferrer = e.referrer;
      map.set(e.from, cur);
    }
    return Array.from(map.entries())
      .map(([from, v]) => ({ from, ...v }))
      .sort((a, b) => b.hits - a.hits);
  }, [log]);

  const totalRedirects = log.filter((e) => e.kind === "redirect").length;
  const totalNotFound = log.filter((e) => e.kind === "not_found").length;
  const usedRedirects = redirectStats.filter((r) => r.hits > 0).length;

  const copyTemplate = (paths: string[]) => {
    const tpl = paths
      .map((p) => `  { from: "${p}", to: "/", reason: "TODO: zmapuj na właściwy cel" },`)
      .join("\n");
    navigator.clipboard?.writeText(tpl);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Dev tool — nie indeksowany</p>
          <h1 className="text-3xl font-bold">SEO Redirects · diagnostyka</h1>
          <p className="text-muted-foreground max-w-3xl">
            Logger w pamięci sesji rejestruje każde trafienie w <code>SeoRedirect</code> i każde 404
            w aplikacji. Pozwala szybko sprawdzić, które wpisy z <code>SEO_REDIRECTS</code> są realnie
            używane oraz które stare URL-e nadal generują 404 i wymagają mapowania.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="muted">Wpisy w mapie: {SEO_REDIRECTS.length}</Pill>
            <Pill tone={usedRedirects > 0 ? "ok" : "muted"}>Aktywne (z trafieniem): {usedRedirects}</Pill>
            <Pill tone="ok">Trafień redirect: {totalRedirects}</Pill>
            <Pill tone={totalNotFound > 0 ? "warn" : "muted"}>404 w sesji: {totalNotFound}</Pill>
            <button
              type="button"
              onClick={clearRedirectLog}
              className="ml-auto inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-sm hover:bg-muted/70"
            >
              Wyczyść log
            </button>
          </div>
        </header>

        {/* ── Sekcja 1: Mapa SEO_REDIRECTS ───────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Mapa redirectów ({SEO_REDIRECTS.length})</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">From</th>
                  <th className="px-3 py-2 text-left">To</th>
                  <th className="px-3 py-2 text-left">Powód</th>
                  <th className="px-3 py-2 text-right">Trafień</th>
                  <th className="px-3 py-2 text-left">Ostatnio</th>
                  <th className="px-3 py-2 text-left">Test</th>
                </tr>
              </thead>
              <tbody>
                {redirectStats.map((r) => (
                  <tr key={r.from} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{r.from}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.to}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.reason ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.hits > 0 ? <Pill tone="ok">{r.hits}</Pill> : <Pill tone="muted">0</Pill>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.lastHit ? new Date(r.lastHit).toLocaleTimeString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to={r.from}
                        className="text-primary underline-offset-2 hover:underline text-xs"
                      >
                        Otwórz ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Sekcja 2: 404 w sesji ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                404 w aplikacji ({notFoundAggregated.length} unikalnych)
              </h2>
              <p className="text-sm text-muted-foreground">
                Każdy wpis to kandydat do dopisania w <code>SEO_REDIRECTS</code>.
              </p>
            </div>
            {notFoundAggregated.length > 0 && (
              <button
                type="button"
                onClick={() => copyTemplate(notFoundAggregated.map((n) => n.from))}
                className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-sm hover:bg-muted/70"
              >
                Skopiuj jako szablon SEO_REDIRECTS
              </button>
            )}
          </div>

          {notFoundAggregated.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              Brak 404 w bieżącej sesji. Przejdź na nieistniejący URL (np.{" "}
              <Link to="/test-404-debug" className="text-primary underline">
                /test-404-debug
              </Link>
              ), żeby zobaczyć logger w akcji.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Ścieżka 404</th>
                    <th className="px-3 py-2 text-right">Trafień</th>
                    <th className="px-3 py-2 text-left">Ostatnio</th>
                    <th className="px-3 py-2 text-left">Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {notFoundAggregated.map((n) => (
                    <tr key={n.from} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{n.from}</td>
                      <td className="px-3 py-2 text-right">
                        <Pill tone="warn">{n.hits}</Pill>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(n.lastHit).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{n.lastReferrer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Sekcja 3: Surowy log ──────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Surowy log ({log.length})</h2>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zdarzeń.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Czas</th>
                    <th className="px-3 py-2 text-left">Typ</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Referrer</th>
                    <th className="px-3 py-2 text-left">Search</th>
                  </tr>
                </thead>
                <tbody>
                  {[...log].reverse().map((e, i) => (
                    <tr key={`${e.timestamp}-${i}`} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-1.5">
                        {e.kind === "redirect" ? (
                          <Pill tone="ok">redirect</Pill>
                        ) : (
                          <Pill tone="warn">404</Pill>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono">{e.from}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{e.to ?? "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.referrer}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{e.search || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DevSeoRedirects;
