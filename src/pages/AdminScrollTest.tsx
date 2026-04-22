import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import Header from "@/components/layout/Header";
import { computeRowScrollTarget } from "@/lib/scrollHelpers";
import { cn } from "@/lib/utils";

// Strona QA do ręcznej regresji scrollRowIntoView pod sticky headerem.
// 100 wierszy → łatwo testować pozycje GÓRA (1-5), ŚRODEK (~50), DÓŁ (95-100).
// Pasek Next/Prev na dole + pasek statusu na górze pokazujący czy aktywny wiersz
// jest w bezpiecznej strefie (pod headerem, nad dolnym buforem). Jeśli kiedykolwiek
// pojawi się ❌ "ZASŁONIĘTY", wiemy że scroll-helper się popsuł.

const ROW_COUNT = 100;
const ROW_HEIGHT_HINT = 64; // zgrubne, do wyliczenia approx

interface SafeAreaSnapshot {
  headerH: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  rowTop: number;
  rowBottom: number;
  status: "ok" | "hidden-top" | "hidden-bottom";
}

const AdminScrollTest = () => {
  const { isAdmin, loading: isLoading } = useIsAdmin();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [snapshot, setSnapshot] = useState<SafeAreaSnapshot | null>(null);
  const lastScrollAtRef = useRef(0);
  const rowsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const rows = useMemo(
    () => Array.from({ length: ROW_COUNT }, (_, i) => ({ id: i, label: `Wiersz #${i + 1}` })),
    []
  );

  const getHeaderH = () => {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--header-height")
      .trim();
    return cssVar ? parseFloat(cssVar) : 80;
  };

  const updateSnapshot = (idx: number) => {
    const el = rowsRef.current.get(idx);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const headerH = getHeaderH();
    const safeAreaTop = headerH + 16;
    const safeAreaBottom = window.innerHeight - 24;
    let status: SafeAreaSnapshot["status"] = "ok";
    if (rect.top < safeAreaTop) status = "hidden-top";
    else if (rect.bottom > safeAreaBottom) status = "hidden-bottom";
    setSnapshot({
      headerH,
      safeAreaTop,
      safeAreaBottom,
      rowTop: rect.top,
      rowBottom: rect.bottom,
      status,
    });
  };

  const scrollToRow = (idx: number) => {
    const el = rowsRef.current.get(idx);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const headerH = getHeaderH();
    const targetY = computeRowScrollTarget({
      rectTop: rect.top,
      rowHeight: rect.height,
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      headerHeight: headerH,
      force: true,
    });
    if (targetY === null) {
      // już widoczny, ale wymusiliśmy force=true → computeRowScrollTarget zawsze zwróci number
      return;
    }
    const now = performance.now();
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rapidRepeat = now - lastScrollAtRef.current < 250;
    const behavior: ScrollBehavior = prefersReducedMotion || rapidRepeat ? "auto" : "smooth";
    lastScrollAtRef.current = now;
    window.scrollTo({ top: targetY, left: 0, behavior });
    // Snapshot po zakończeniu scrolla — opóźnienie żeby smooth zdążył wylądować.
    window.setTimeout(() => updateSnapshot(idx), behavior === "smooth" ? 450 : 50);
  };

  const jump = (delta: number) => {
    setActiveIdx((prev) => {
      const next = Math.max(0, Math.min(ROW_COUNT - 1, prev + delta));
      scrollToRow(next);
      return next;
    });
  };

  const jumpTo = (idx: number) => {
    setActiveIdx(idx);
    scrollToRow(idx);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        jump(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        jump(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live snapshot na scroll/resize żeby user widział czy aktywny wiersz jest pod headerem
  useEffect(() => {
    const onScroll = () => updateSnapshot(activeIdx);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateSnapshot(activeIdx);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [activeIdx]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Brak dostępu</AlertTitle>
          <AlertDescription>
            Strona dostępna tylko dla administratorów.{" "}
            <Link to="/admin/login" className="underline">Zaloguj się</Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-[var(--header-height)]">
        {/* Wizualny overlay bezpiecznej strefy — pasek pod headerem + linia na dole */}
        {showSafeArea && snapshot && (
          <>
            <div
              className="fixed left-0 right-0 z-40 pointer-events-none border-y-2 border-dashed border-primary/60 bg-primary/5"
              style={{
                top: `${snapshot.safeAreaTop}px`,
                height: `${snapshot.safeAreaBottom - snapshot.safeAreaTop}px`,
              }}
              aria-hidden="true"
            >
              <span className="absolute top-1 left-2 text-[10px] uppercase tracking-wider text-primary font-mono bg-background/80 px-1 rounded">
                safe-area top {Math.round(snapshot.safeAreaTop)}px
              </span>
              <span className="absolute bottom-1 right-2 text-[10px] uppercase tracking-wider text-primary font-mono bg-background/80 px-1 rounded">
                safe-area bottom {Math.round(snapshot.safeAreaBottom)}px
              </span>
            </div>
          </>
        )}

        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Admin
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSafeArea((v) => !v)}
            >
              {showSafeArea ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showSafeArea ? "Ukryj safe-area" : "Pokaż safe-area"}
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>QA: scroll pod sticky nagłówkiem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Klikaj <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Next</kbd>/
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Prev</kbd> w pasku na dole
                lub używaj klawiszy <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">J</kbd>/
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">K</kbd>/
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">↓</kbd>/
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">↑</kbd>.
              </p>
              <p>
                Aktywny wiersz powinien <strong>zawsze</strong> wylądować w zielonej bezpiecznej strefie (między dolną
                krawędzią headera a dnem viewportu). Pasek statusu poniżej pokazuje wynik na żywo.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => jumpTo(0)}>Skok GÓRA #1</Button>
                <Button size="sm" variant="outline" onClick={() => jumpTo(2)}>Skok GÓRA #3</Button>
                <Button size="sm" variant="outline" onClick={() => jumpTo(Math.floor(ROW_COUNT / 2))}>Skok ŚRODEK #{Math.floor(ROW_COUNT / 2) + 1}</Button>
                <Button size="sm" variant="outline" onClick={() => jumpTo(ROW_COUNT - 3)}>Skok DÓŁ #{ROW_COUNT - 2}</Button>
                <Button size="sm" variant="outline" onClick={() => jumpTo(ROW_COUNT - 1)}>Skok DÓŁ #{ROW_COUNT}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista 100 wierszy */}
          <div className="space-y-2 pb-32">
            {rows.map((row) => {
              const isActive = row.id === activeIdx;
              return (
                <div
                  key={row.id}
                  ref={(el) => {
                    if (el) rowsRef.current.set(row.id, el);
                    else rowsRef.current.delete(row.id);
                  }}
                  data-row-idx={row.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    isActive
                      ? "bg-primary/15 ring-2 ring-primary border-primary"
                      : "bg-card hover:bg-muted/40"
                  )}
                  style={{ minHeight: ROW_HEIGHT_HINT }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm font-semibold">{row.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Pozycja {row.id + 1} z {ROW_COUNT}
                        {row.id === 0 && " · GÓRA listy"}
                        {row.id === Math.floor(ROW_COUNT / 2) && " · ŚRODEK listy"}
                        {row.id === ROW_COUNT - 1 && " · DÓŁ listy"}
                      </div>
                    </div>
                    {isActive && <Badge>Aktywny</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky pasek nawigatora Next/Prev + status */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-3 max-w-3xl flex items-center gap-3 flex-wrap">
            <Button size="sm" onClick={() => jump(-1)} disabled={activeIdx === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev (K)
            </Button>
            <Button size="sm" onClick={() => jump(1)} disabled={activeIdx === ROW_COUNT - 1}>
              Next (J) <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <span className="text-sm font-mono">
              {activeIdx + 1} / {ROW_COUNT}
            </span>
            {snapshot && (
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">
                  row [{Math.round(snapshot.rowTop)} → {Math.round(snapshot.rowBottom)}] vs safe [
                  {Math.round(snapshot.safeAreaTop)} → {Math.round(snapshot.safeAreaBottom)}]
                </span>
                {snapshot.status === "ok" ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">✅ W safe-area</Badge>
                ) : snapshot.status === "hidden-top" ? (
                  <Badge variant="destructive">❌ ZASŁONIĘTY przez header</Badge>
                ) : (
                  <Badge variant="destructive">❌ Pod dolną krawędzią</Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default AdminScrollTest;
