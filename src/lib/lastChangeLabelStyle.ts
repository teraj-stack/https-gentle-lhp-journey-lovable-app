/**
 * Pure helper opisujący wizualny stan etykiety „Ostatnia zmiana:".
 *
 * Wydzielony z `AutoSaveSettings.tsx`, żeby reguły kolorowania (zielony akcent
 * dla zdalnych synchronizacji, neutralny ton dla lokalnych kliknięć) były
 * jednoznaczne i pokryte testami jednostkowymi — bez konieczności renderowania
 * całego komponentu w jsdom.
 *
 * Reguły:
 *  - `source === "remote"` + `isRemoteSyncing` → mocny zielony (świeży puls).
 *  - `source === "remote"` + brak pulsu → przygaszony zielony (echo synchronizacji).
 *  - `source === "local"` → neutralny `text-muted-foreground` + sufiks „(lokalnie)".
 *  - `source === null` → traktujemy jak local (placeholder neutralny), nie rzucamy.
 *
 * Helper zwraca też dwa boolean-flagi (`isRemote`, `showLocalSuffix`), żeby UI
 * mogło renderować ikonę spinnera i tag „(lokalnie)" bez powielania warunków.
 */
export interface LastChangeLabelStyle {
  isRemote: boolean;
  showLocalSuffix: boolean;
  /** Klasa Tailwind dla kontenera etykiety (kolor głównego tekstu). */
  containerClass: string;
  /** Klasa dla ikony RefreshCw (kolor + spin gdy świeża synchronizacja). */
  iconClass: string;
  /** Klasa dla `<strong>` z timestampem. */
  strongClass: string;
}

export const getLastChangeLabelStyle = (
  source: "remote" | "local" | null,
  isRemoteSyncing: boolean,
): LastChangeLabelStyle => {
  const isRemote = source === "remote";
  if (isRemote) {
    return {
      isRemote: true,
      showLocalSuffix: false,
      containerClass: isRemoteSyncing ? "text-emerald-400" : "text-emerald-500/80",
      iconClass: isRemoteSyncing
        ? "animate-spin text-emerald-400"
        : "text-emerald-500/80",
      strongClass: "text-emerald-400",
    };
  }
  return {
    isRemote: false,
    showLocalSuffix: source === "local",
    containerClass: "text-muted-foreground",
    iconClass: "text-muted-foreground/70",
    strongClass: "text-foreground",
  };
};
