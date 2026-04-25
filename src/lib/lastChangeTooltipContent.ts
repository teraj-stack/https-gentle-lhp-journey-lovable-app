/**
 * Pure helper budujący treść tooltipa „Ostatnia zmiana" w panelu auto-zapisu.
 *
 * Wydzielony z `AutoSaveSettings.tsx`, żeby reguły rozpoznawania źródła zmiany
 * (synchronizacja między kartami vs lokalna akcja) były pokryte testami
 * jednostkowymi — bez konieczności renderowania całego komponentu z Radix
 * Tooltip w jsdom (gdzie portal + hover/focus są kruche).
 *
 * Zwracane pola:
 *  - `heading` — krótki nagłówek (1 linia), pokazywany w `TooltipContent` jako
 *    pierwszy element pogrubiony, oraz wykorzystywany w `aria-label` triggera
 *    (jako prefiks „Źródło: …"). Musi jednoznacznie odróżniać oba przypadki,
 *    bo to JEDYNA informacja dostępna dla użytkowników screen readerów i osób
 *    z trybem high-contrast (gdzie kolorowy akcent znika).
 *  - `description` — pełniejsze zdanie wyjaśniające mechanizm (BroadcastChannel
 *    / storage vs Switch / Alt+Shift+A). Pokazywane w drugiej linii tooltipa.
 *  - `ariaHeading` — wersja `heading` z prefiksem „Źródło: ", używana w
 *    `aria-label` i atrybucie `title` (fallback dla touch). Trzymamy oddzielnie,
 *    żeby UI nie sklejało stringów inline (łatwiej testować).
 *
 * Reguły:
 *  - `source === "remote"` → wariant „Synchronizacja między kartami".
 *  - `source === "local"`  → wariant „Lokalna akcja w tej karcie".
 *  - `source === null`     → traktujemy jak local (placeholder neutralny).
 *    To zachowanie pokrywa się z `getLastChangeLabelStyle`, gdzie również
 *    `null` jest mapowane na neutralny ton — etykieta nie powinna nigdy
 *    przypadkowo „udawać" zdalnej synchronizacji.
 */
export interface LastChangeTooltipContent {
  /** Nagłówek pokazywany w TooltipContent (bez prefiksu „Źródło:"). */
  heading: string;
  /** Pełniejszy opis mechanizmu zmiany. */
  description: string;
  /** Wersja heading z prefiksem „Źródło: " — do `aria-label` i `title`. */
  ariaHeading: string;
  /** Czy source jest traktowane jako „remote" (do warunkowego stylowania). */
  isRemote: boolean;
}

export const getLastChangeTooltipContent = (
  source: "remote" | "local" | null,
): LastChangeTooltipContent => {
  const isRemote = source === "remote";
  if (isRemote) {
    return {
      isRemote: true,
      heading: "Synchronizacja między kartami",
      ariaHeading: "Źródło: Synchronizacja między kartami",
      description:
        "Zmiana auto-zapisu przyszła z innej otwartej karty (BroadcastChannel lub storage).",
    };
  }
  return {
    isRemote: false,
    heading: "Lokalna akcja w tej karcie",
    ariaHeading: "Źródło: Moja lokalna akcja w tej karcie",
    description:
      "Sam(a) przełączyłe(a)ś auto-zapis w tej karcie (Switch lub skrót Alt+Shift+A).",
  };
};
