/**
 * Import postępu treningu z pliku JSON wyeksportowanego wcześniej.
 * Walidacja schematu + merge unikalnych dni (union).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type ImportedProgress = {
  days: string[]; // ISO YYYY-MM-DD, posortowane rosnąco, unikalne
  totalCompletions?: number;
  exportedAt?: string;
};

export type ImportError = {
  code:
    | "invalid-json"
    | "wrong-schema"
    | "no-days"
    | "invalid-dates"
    | "future-date"
    | "too-large";
  message: string;
};

const MAX_BYTES = 512 * 1024; // 512 KB — z dużym zapasem

const isValidISODate = (s: string): boolean => {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const parseWorkoutProgressFile = async (
  file: File,
): Promise<{ ok: true; data: ImportedProgress } | { ok: false; error: ImportError }> => {
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: {
        code: "too-large",
        message: "Plik jest zbyt duży (limit 512 KB).",
      },
    };
  }

  let raw: string;
  try {
    raw = await file.text();
  } catch {
    return {
      ok: false,
      error: { code: "invalid-json", message: "Nie udało się odczytać pliku." },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: { code: "invalid-json", message: "Plik nie jest poprawnym JSON-em." },
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      ok: false,
      error: { code: "wrong-schema", message: "Niepoprawna struktura pliku." },
    };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.schema !== "cml-workout-progress") {
    return {
      ok: false,
      error: {
        code: "wrong-schema",
        message: "To nie jest plik postępu treningu CML.",
      },
    };
  }

  const history = obj.history as Record<string, unknown> | undefined;
  const days = history?.days;
  if (!Array.isArray(days) || days.length === 0) {
    return {
      ok: false,
      error: { code: "no-days", message: "Plik nie zawiera żadnych dni treningowych." },
    };
  }

  const today = todayISO();
  const cleaned: string[] = [];
  for (const d of days) {
    if (typeof d !== "string" || !isValidISODate(d)) {
      return {
        ok: false,
        error: {
          code: "invalid-dates",
          message: "Plik zawiera niepoprawne daty (oczekiwany format YYYY-MM-DD).",
        },
      };
    }
    if (d > today) {
      return {
        ok: false,
        error: {
          code: "future-date",
          message: "Plik zawiera daty z przyszłości — odrzucono.",
        },
      };
    }
    cleaned.push(d);
  }

  const unique = Array.from(new Set(cleaned)).sort();

  const summary = obj.summary as Record<string, unknown> | undefined;
  const totalCompletions =
    typeof summary?.totalDays === "number" ? (summary.totalDays as number) : undefined;
  const exportedAt = typeof obj.exportedAt === "string" ? obj.exportedAt : undefined;

  return {
    ok: true,
    data: { days: unique, totalCompletions, exportedAt },
  };
};

/** Merge dwóch zbiorów dni — union, posortowane, unikalne. */
export const mergeDays = (current: string[], imported: string[]): string[] => {
  return Array.from(new Set([...current, ...imported])).sort();
};
