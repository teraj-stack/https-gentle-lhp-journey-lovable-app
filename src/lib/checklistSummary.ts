/**
 * Auto-podsumowanie zaznaczonych czynników ryzyka hemoroidów.
 *
 * Mapuje id z RISK_FACTORS w RiskFactorsAccordion.tsx do:
 *   - kategorii (najwyższy poziom: dieta / styl życia / fizjologia / genetyka / zachowanie w toalecie)
 *   - mechanizmów patofizjologicznych (co realnie uszkadza sploty hemoroidalne)
 *
 * Daje 2 widoki w UI: dominujące kategorie i dominujące mechanizmy.
 */

export type RiskCategory =
  | "Dieta i nawodnienie"
  | "Styl życia"
  | "Fizjologia i biologia"
  | "Genetyka"
  | "Zachowanie w toalecie";

export type RiskMechanism =
  | "Wzrost ciśnienia żylnego (parcie / Valsalva)"
  | "Twardy stolec / zaparcia"
  | "Osłabienie tkanki łącznej"
  | "Zastój żylny / zaburzenia mikrokrążenia"
  | "Podrażnienie błony śluzowej";

type RiskFactorMeta = {
  category: RiskCategory;
  mechanisms: RiskMechanism[];
};

/**
 * Klucze MUSZĄ odpowiadać `id` w RISK_FACTORS w RiskFactorsAccordion.
 * Brak wpisu = czynnik nie wpłynie na statystyki (degradacja graceful).
 */
export const RISK_FACTOR_META: Record<string, RiskFactorMeta> = {
  constipation: {
    category: "Fizjologia i biologia",
    mechanisms: [
      "Wzrost ciśnienia żylnego (parcie / Valsalva)",
      "Twardy stolec / zaparcia",
      "Osłabienie tkanki łącznej",
    ],
  },
  fiber: {
    category: "Dieta i nawodnienie",
    mechanisms: ["Twardy stolec / zaparcia", "Wzrost ciśnienia żylnego (parcie / Valsalva)"],
  },
  hydration: {
    category: "Dieta i nawodnienie",
    mechanisms: ["Twardy stolec / zaparcia"],
  },
  sedentary: {
    category: "Styl życia",
    mechanisms: ["Zastój żylny / zaburzenia mikrokrążenia"],
  },
  pregnancy: {
    category: "Fizjologia i biologia",
    mechanisms: [
      "Wzrost ciśnienia żylnego (parcie / Valsalva)",
      "Zastój żylny / zaburzenia mikrokrążenia",
      "Osłabienie tkanki łącznej",
    ],
  },
  obesity: {
    category: "Styl życia",
    mechanisms: [
      "Zastój żylny / zaburzenia mikrokrążenia",
      "Wzrost ciśnienia żylnego (parcie / Valsalva)",
    ],
  },
  genetics: {
    category: "Genetyka",
    mechanisms: ["Osłabienie tkanki łącznej"],
  },
  "toilet-time": {
    category: "Zachowanie w toalecie",
    mechanisms: [
      "Wzrost ciśnienia żylnego (parcie / Valsalva)",
      "Zastój żylny / zaburzenia mikrokrążenia",
    ],
  },
  valsalva: {
    category: "Zachowanie w toalecie",
    mechanisms: [
      "Wzrost ciśnienia żylnego (parcie / Valsalva)",
      "Osłabienie tkanki łącznej",
    ],
  },
  diarrhea: {
    category: "Fizjologia i biologia",
    mechanisms: ["Podrażnienie błony śluzowej", "Wzrost ciśnienia żylnego (parcie / Valsalva)"],
  },
};

export type CountedItem<T extends string> = {
  label: T;
  count: number;
  /** % udziału względem sumy wystąpień w danym agregacie (0-100, zaokrąglone). */
  share: number;
};

export type ChecklistSummary = {
  total: number;
  categories: CountedItem<RiskCategory>[];
  mechanisms: CountedItem<RiskMechanism>[];
  /** Krótki, kontekstowy komentarz do pokazania pacjentowi (1-2 zdania). */
  comment: string;
};

const buildCounted = <T extends string>(map: Map<T, number>): CountedItem<T>[] => {
  const totalSum = Array.from(map.values()).reduce((acc, n) => acc + n, 0);
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      share: totalSum > 0 ? Math.round((count / totalSum) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pl"));
};

const buildComment = (
  total: number,
  topCategory: RiskCategory | null,
  topMechanism: RiskMechanism | null,
): string => {
  if (total === 0) {
    return "Zaznacz przynajmniej jeden czynnik powyżej, aby zobaczyć podsumowanie.";
  }
  if (!topCategory || !topMechanism) {
    return `Zaznaczono ${total} ${total === 1 ? "czynnik" : total < 5 ? "czynniki" : "czynników"} ryzyka. Pokaż listę lekarzowi na konsultacji.`;
  }
  const mechanismHint: Record<RiskMechanism, string> = {
    "Wzrost ciśnienia żylnego (parcie / Valsalva)":
      "Skupcie się z lekarzem na technice oddawania stolca i skróceniu czasu w toalecie (≤ 3 min, bez telefonu).",
    "Twardy stolec / zaparcia":
      "Pierwszy ruch to dieta i nawodnienie: 25–30 g błonnika/dobę (psyllium/babka jajowata) i 1,5–2 l wody.",
    "Osłabienie tkanki łącznej":
      "Tu liczy się prewencja drugorzędowa — ograniczanie parcia i regularna aktywność wzmacniająca powłoki.",
    "Zastój żylny / zaburzenia mikrokrążenia":
      "Pomocne są przerwy na ruch co 60–90 min, spacery i ćwiczenia typu Kegla.",
    "Podrażnienie błony śluzowej":
      "Warto zidentyfikować trigger (dieta, leki, infekcja) — czasem konieczna jest diagnostyka proktologiczna.",
  };
  return `Dominuje kategoria „${topCategory}" oraz mechanizm „${topMechanism}". ${mechanismHint[topMechanism]}`;
};

export const buildChecklistSummary = (selectedIds: string[]): ChecklistSummary => {
  const categoryMap = new Map<RiskCategory, number>();
  const mechanismMap = new Map<RiskMechanism, number>();

  selectedIds.forEach((id) => {
    const meta = RISK_FACTOR_META[id];
    if (!meta) return;
    categoryMap.set(meta.category, (categoryMap.get(meta.category) ?? 0) + 1);
    meta.mechanisms.forEach((m) => {
      mechanismMap.set(m, (mechanismMap.get(m) ?? 0) + 1);
    });
  });

  const categories = buildCounted(categoryMap);
  const mechanisms = buildCounted(mechanismMap);

  return {
    total: selectedIds.filter((id) => RISK_FACTOR_META[id]).length,
    categories,
    mechanisms,
    comment: buildComment(
      selectedIds.length,
      categories[0]?.label ?? null,
      mechanisms[0]?.label ?? null,
    ),
  };
};
