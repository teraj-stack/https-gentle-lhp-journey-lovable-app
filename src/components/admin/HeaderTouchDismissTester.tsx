import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, PlayCircle, AlertTriangle } from "lucide-react";

/**
 * Manual QA panel for the header mega-menu's tap-outside dismissal on
 * touch / coarse-pointer devices.
 *
 * What it does (no real touch hardware required):
 * 1. Detects whether the current device is touch / coarse-pointer.
 *    If not, the test still runs but we surface a warning so the result
 *    can be interpreted correctly (the production handler skips non-touch
 *    pointer events).
 * 2. Locates the first visible mega-menu trigger button in <header>.
 * 3. Programmatically opens the dropdown by dispatching a real "click"
 *    on the trigger.
 * 4. Waits for `aria-expanded="true"` on the trigger (open confirmation).
 * 5. Dispatches a synthetic `pointerdown` PointerEvent with
 *    `pointerType: "touch"` on `document.body` at coordinates that are
 *    deliberately outside <header>.
 * 6. Polls `aria-expanded` for up to 250 ms and records the time it took
 *    for the menu to close.
 * 7. Logs each step and the verdict to the console (group + table) so
 *    the developer can replay results across reloads.
 */

const HEADER_SELECTOR = "header";
const TRIGGER_SELECTOR = 'header button[aria-haspopup="menu"]';
const CLOSE_TIMEOUT_MS = 250;
const POLL_INTERVAL_MS = 10;

type StepLog = {
  step: string;
  ok: boolean;
  detail?: string;
};

type TestResult = {
  passed: boolean;
  closeTimeMs: number | null;
  isTouchEnv: boolean;
  steps: StepLog[];
  startedAt: string;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function pollUntil(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs: number,
): Promise<number | null> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (predicate()) return Math.round(performance.now() - start);
    await wait(intervalMs);
  }
  return null;
}

export function HeaderTouchDismissTester() {
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<TestResult[]>([]);

  const runTest = useCallback(async () => {
    setRunning(true);
    const steps: StepLog[] = [];
    const startedAt = new Date().toISOString();
    let passed = false;
    let closeTimeMs: number | null = null;

    // Step 1: environment check.
    const isTouchEnv = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    steps.push({
      step: "Wykryto środowisko touch/coarse",
      ok: isTouchEnv,
      detail: isTouchEnv
        ? "matchMedia(hover:none, pointer:coarse) === true"
        : "Brak — pointerdown handler w Headerze ignoruje syntetyczny touch poza warunkiem matchMedia. Test może mimo to wykazać działanie, jeśli IsTouchDevice w Headerze został wymuszony.",
    });

    // Step 2: locate elements.
    const header = document.querySelector<HTMLElement>(HEADER_SELECTOR);
    const trigger = document.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR);
    if (!header || !trigger) {
      steps.push({
        step: "Znaleziono <header> i trigger mega-menu",
        ok: false,
        detail: `header=${!!header} trigger=${!!trigger}`,
      });
      finish({ passed: false, closeTimeMs: null, steps, isTouchEnv, startedAt });
      return;
    }
    steps.push({
      step: "Znaleziono <header> i trigger mega-menu",
      ok: true,
      detail: `trigger=${trigger.textContent?.trim().slice(0, 40)}`,
    });

    // Step 3: open the dropdown.
    trigger.click();
    const openedInMs = await pollUntil(
      () => trigger.getAttribute("aria-expanded") === "true",
      300,
      POLL_INTERVAL_MS,
    );
    if (openedInMs === null) {
      steps.push({
        step: "Menu otwarte (aria-expanded=true)",
        ok: false,
        detail: "Trigger nie zareagował na click w ciągu 300 ms",
      });
      finish({ passed: false, closeTimeMs: null, steps, isTouchEnv, startedAt });
      return;
    }
    steps.push({
      step: "Menu otwarte (aria-expanded=true)",
      ok: true,
      detail: `${openedInMs} ms od click`,
    });

    // Step 4: dispatch synthetic touch pointerdown OUTSIDE the header.
    const headerRect = header.getBoundingClientRect();
    const outsideY = Math.min(window.innerHeight - 5, headerRect.bottom + 50);
    const outsideX = Math.max(5, Math.floor(window.innerWidth / 2));
    const target =
      document.elementFromPoint(outsideX, outsideY) ?? document.body;
    if (header.contains(target)) {
      steps.push({
        step: "Cel taps poza <header>",
        ok: false,
        detail: `Element pod (${outsideX}, ${outsideY}) wciąż jest w headerze (${(target as Element).tagName}). Przewiń stronę i spróbuj ponownie.`,
      });
      finish({ passed: false, closeTimeMs: null, steps, isTouchEnv, startedAt });
      return;
    }

    let pointerEventFired = false;
    try {
      const pe = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerType: "touch",
        isPrimary: true,
        clientX: outsideX,
        clientY: outsideY,
      });
      target.dispatchEvent(pe);
      pointerEventFired = true;
    } catch (err) {
      steps.push({
        step: "Dispatch syntetycznego PointerEvent (touch)",
        ok: false,
        detail: `PointerEvent niewspierany w tej przeglądarce: ${(err as Error).message}`,
      });
    }
    if (pointerEventFired) {
      steps.push({
        step: "Dispatch syntetycznego PointerEvent (touch)",
        ok: true,
        detail: `target=${(target as Element).tagName} @ (${outsideX}, ${outsideY})`,
      });
    }

    // Step 5: assert close.
    closeTimeMs = await pollUntil(
      () => trigger.getAttribute("aria-expanded") === "false",
      CLOSE_TIMEOUT_MS,
      POLL_INTERVAL_MS,
    );
    passed = closeTimeMs !== null;
    steps.push({
      step: `Menu zamknięte w ≤ ${CLOSE_TIMEOUT_MS} ms`,
      ok: passed,
      detail:
        closeTimeMs !== null
          ? `Zamknięto po ${closeTimeMs} ms`
          : "Timeout — aria-expanded pozostał true",
    });

    // Cleanup: if the menu is still open (test failed), close it manually so
    // we don't leave dev UI in an inconsistent state.
    if (!passed && trigger.getAttribute("aria-expanded") === "true") {
      trigger.click();
    }

    finish({ passed, closeTimeMs, steps, isTouchEnv, startedAt });

    function finish(result: TestResult) {
      setHistory((h) => [result, ...h].slice(0, 5));
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        `%c[HeaderTouchDismissTester] ${result.passed ? "PASS" : "FAIL"}`,
        `color: ${result.passed ? "green" : "red"}; font-weight: bold;`,
      );
      // eslint-disable-next-line no-console
      console.log("isTouchEnv:", result.isTouchEnv);
      // eslint-disable-next-line no-console
      console.log("closeTimeMs:", result.closeTimeMs);
      // eslint-disable-next-line no-console
      console.table(result.steps);
      // eslint-disable-next-line no-console
      console.groupEnd();
      setRunning(false);
    }
  }, []);

  return (
    <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-foreground">
            Test: tap poza mega-menu (touch)
          </div>
          <div className="text-xs text-muted-foreground">
            Otwiera pierwszy dropdown w nagłówku, dispatchuje syntetyczny
            <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[10px]">
              pointerdown · touch
            </code>
            poza header i mierzy czas zamknięcia.
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runTest}
          disabled={running}
          className="shrink-0 gap-1"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          {running ? "Trwa test…" : "Uruchom test"}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {history.map((r, i) => (
            <div
              key={`${r.startedAt}-${i}`}
              className={`text-xs rounded-md border p-2 ${
                r.passed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  {r.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  )}
                  {r.passed
                    ? `PASS — zamknięto po ${r.closeTimeMs} ms`
                    : "FAIL — menu nie zamknęło się w 250 ms"}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {new Date(r.startedAt).toLocaleTimeString("pl-PL")}
                </Badge>
              </div>
              {!r.isTouchEnv && (
                <div className="flex items-start gap-1 text-[11px] text-amber-600 mb-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  Środowisko nie jest touch — wynik orientacyjny.
                </div>
              )}
              <ol className="space-y-0.5 list-decimal ml-4">
                {r.steps.map((s, idx) => (
                  <li
                    key={idx}
                    className={s.ok ? "text-foreground/80" : "text-destructive"}
                  >
                    <span className="font-medium">{s.step}</span>
                    {s.detail && (
                      <span className="text-muted-foreground"> — {s.detail}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
