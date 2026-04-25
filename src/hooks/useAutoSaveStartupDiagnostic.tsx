import { useEffect, useRef } from "react";
import { useAutoSave, type DegradationCause } from "@/hooks/useAutoSave";
import { toast } from "@/hooks/use-toast";

/**
 * Jednorazowa diagnostyka transportu auto-zapisu po starcie aplikacji.
 *
 * Zachowanie:
 *  - Czeka 1.5 s po mount, żeby useEffect inicjalizujący BroadcastChannel
 *    zdążył albo otworzyć kanał, albo wyłapać wyjątek konstruktora.
 *  - Jeśli `transport === "broadcast"` — nie pokazuje nic (happy path).
 *  - Jeśli zdegradowano z powodu „runtime error" (`constructor-exception`,
 *    `messageerror`, `postmessage-failure`) — pokazuje toast destructive
 *    z akcją „Odśwież stronę". Te błędy często są przejściowe (BFCache wakeup,
 *    chwilowy sandbox state) i refresh zwykle je naprawia.
 *  - Jeśli `api-missing` — pokazuje neutralny toast informacyjny (przeglądarka
 *    nie wspiera BC, ale storage-fallback działa — refresh nie pomoże).
 *  - `simulation` jest pomijana (to celowy stan zainicjowany przez użytkownika
 *    z panelu ustawień, nie potrzebuje toasta).
 *
 * Guard `diagnosticEmitted` jest module-level, żeby diagnostyka odpaliła się
 * tylko raz na sesję aplikacji — bez względu na ile razy `Layout` zostanie
 * zremountowany przez React Router.
 */

let diagnosticEmitted = false;

const RUNTIME_ERROR_CAUSES: ReadonlySet<DegradationCause> = new Set([
  "constructor-exception",
  "messageerror",
  "postmessage-failure",
]);

const STARTUP_DELAY_MS = 1500;

export const useAutoSaveStartupDiagnostic = () => {
  const { transport, degradationInfo } = useAutoSave();
  // Trzymamy aktualne wartości w refie, żeby `setTimeout` widział najświeższy snapshot
  // bez re-bindowania callback'a (effect odpala się tylko raz przy mount).
  const transportRef = useRef(transport);
  const degradationInfoRef = useRef(degradationInfo);
  transportRef.current = transport;
  degradationInfoRef.current = degradationInfo;

  useEffect(() => {
    if (diagnosticEmitted) return;
    if (typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      if (diagnosticEmitted) return;
      diagnosticEmitted = true;

      const currentTransport = transportRef.current;
      const info = degradationInfoRef.current;

      // Loguj raport startowy zawsze — pomocne przy debugowaniu produkcji,
      // nawet gdy transport działa poprawnie (potwierdza, że hook się zainicjalizował).
      // eslint-disable-next-line no-console
      console.info("[useAutoSave] Startup diagnostic:", {
        transport: currentTransport,
        degradation: info,
      });

      if (currentTransport === "broadcast") return; // happy path — bez toasta
      if (!info) return; // fallback bez przyczyny — nic do raportowania
      if (info.cause === "simulation") return; // celowy stan, nie alarmujemy

      if (RUNTIME_ERROR_CAUSES.has(info.cause)) {
        toast({
          variant: "destructive",
          title: "Synchronizacja między kartami w trybie awaryjnym",
          description: `${info.detail}. Odśwież stronę, aby spróbować przywrócić szybką synchronizację.`,
          action: (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-destructive-foreground/40 bg-transparent px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive-foreground/10 focus:outline-none focus:ring-1 focus:ring-destructive-foreground"
            >
              Odśwież stronę
            </button>
          ),
        });
        return;
      }

      // api-missing — informacyjnie, bez akcji refresh (nie pomoże).
      toast({
        title: "Synchronizacja między kartami: tryb zgodności",
        description:
          "Twoja przeglądarka nie wspiera BroadcastChannel. Auto-zapis działa, ale zmiany między kartami mogą docierać z opóźnieniem.",
      });
    }, STARTUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);
};

/** Test-only — resetuje flagę diagnostyki, żeby unit-testy mogły symulować świeży start. */
export const __resetAutoSaveStartupDiagnosticForTests = () => {
  diagnosticEmitted = false;
};