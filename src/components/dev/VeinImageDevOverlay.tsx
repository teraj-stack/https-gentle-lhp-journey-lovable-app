import { useState } from "react";
import {
  useVeinImageOverridesForPage,
  type VeinImagePageKey,
} from "@/hooks/useVeinImageOverrides";

interface Props {
  pageKey: VeinImagePageKey;
}

interface Stat {
  label: string;
  value: string;
  ok: boolean;
  detail?: string;
}

const buildStats = (text: string, kind: "alt" | "caption"): Stat[] => {
  const len = text.length;
  if (kind === "alt") {
    return [
      {
        label: "Długość",
        value: `${len} znaków`,
        ok: len >= 60 && len <= 220,
        detail: "limit 60–220",
      },
    ];
  }
  const segments = text.split(/\s·\s/);
  const longest = Math.max(...segments.map((s) => s.length));
  return [
    {
      label: "Długość",
      value: `${len} znaków`,
      ok: len <= 110,
      detail: "limit ≤ 110",
    },
    {
      label: "Segmenty",
      value: `${segments.length} (max ${longest} zn.)`,
      ok: longest <= 40,
      detail: "limit segmentu ≤ 40",
    },
  ];
};

/**
 * Floating dev-only overlay pokazujący aktualnie używane alt/caption
 * dla VenousInsufficiencyImage na danej stronie + status mobile-budget.
 *
 * Renderowany TYLKO w DEV (import.meta.env.DEV). W produkcji zwraca null,
 * więc nie wpływa na bundle ani UX odwiedzających.
 */
const VeinImageDevOverlay = ({ pageKey }: Props) => {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <VeinImageDevOverlayInner pageKey={pageKey} open={open} setOpen={setOpen} />
  );
};

const VeinImageDevOverlayInner = ({
  pageKey,
  open,
  setOpen,
}: Props & { open: boolean; setOpen: (v: boolean) => void }) => {
  const { main, perforator, isLoading, error } =
    useVeinImageOverridesForPage(pageKey);

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] font-mono text-xs"
      data-testid="vein-image-dev-overlay"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-foreground/90 text-background px-3 py-2 shadow-lg hover:bg-foreground"
        >
          🩺 alt/caption ({pageKey})
        </button>
      ) : (
        <div className="w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-auto rounded-xl bg-background border border-border shadow-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground">
              VenousInsufficiencyImage
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Zamknij panel"
            >
              ✕
            </button>
          </div>

          <p className="text-muted-foreground">
            Strona: <code className="text-primary">{pageKey}</code>
            {isLoading && " · ładuję…"}
            {error && (
              <span className="text-destructive"> · błąd ładowania CMS</span>
            )}
          </p>

          {(["main", "perforator"] as const).map((slot) => {
            const row = slot === "main" ? main : perforator;
            const altSource = row?.alt;
            const capSource = row?.caption;
            return (
              <div
                key={slot}
                className="border-t border-border pt-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
                    {slot === "main" ? "Główny obraz" : "Perforator"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      row
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {row ? "z CMS" : "fallback z propsu"}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    alt
                  </div>
                  <div className="text-foreground/90 leading-snug">
                    {altSource ?? <em>(brak — używany prop default)</em>}
                  </div>
                  {altSource && (
                    <StatList stats={buildStats(altSource, "alt")} />
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    figcaption
                  </div>
                  <div className="text-foreground/90 leading-snug">
                    {capSource ?? <em>(brak — używany prop default)</em>}
                  </div>
                  {capSource && (
                    <StatList stats={buildStats(capSource, "caption")} />
                  )}
                </div>
              </div>
            );
          })}

          <div className="border-t border-border pt-2 text-[10px] text-muted-foreground">
            Edytuj w{" "}
            <a
              href="/admin/vein-images"
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              /admin/vein-images
            </a>
            . Panel widoczny tylko w trybie dev.
          </div>
        </div>
      )}
    </div>
  );
};

const StatList = ({ stats }: { stats: Stat[] }) => (
  <ul className="mt-1 space-y-0.5">
    {stats.map((s) => (
      <li
        key={s.label}
        className={`flex items-center gap-1.5 text-[10px] ${
          s.ok ? "text-emerald-400" : "text-destructive"
        }`}
      >
        <span>{s.ok ? "✓" : "⚠"}</span>
        <span className="text-muted-foreground">{s.label}:</span>
        <span>{s.value}</span>
        {s.detail && (
          <span className="text-muted-foreground">({s.detail})</span>
        )}
      </li>
    ))}
  </ul>
);

export default VeinImageDevOverlay;
