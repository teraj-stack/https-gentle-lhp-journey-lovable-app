/**
 * Harmonogram redakcyjny bloga CML.
 *
 * Kadencja: 2 wpisy w miesiącu — 10. i 24. dnia, publikacja o 09:00
 * (czas polski). Wpis z `scheduled_at` w przyszłości jest ukryty przed
 * czytelnikami (pilnuje tego polityka dostępu w bazie) i pokazuje się sam.
 *
 * Odświeżanie: artykuł uznajemy za „nieświeży", gdy od ostatniej
 * weryfikacji (lub publikacji) minęło więcej niż `review_interval_days`.
 */

export const PUBLISH_DAYS = [10, 24] as const;
export const PUBLISH_HOUR_LOCAL = 9;
export const DEFAULT_REVIEW_INTERVAL_DAYS = 180;

/** Slot publikacyjny jako Date (przybliżenie strefy Europe/Warsaw) */
const slotDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month, day, PUBLISH_HOUR_LOCAL - 2, 0, 0));

/** Kolejne wolne sloty publikacyjne, z pominięciem już zajętych terminów */
export const getUpcomingSlots = (
  count: number,
  taken: Array<string | null | undefined> = [],
  from: Date = new Date(),
): Date[] => {
  const takenKeys = new Set(
    taken
      .filter(Boolean)
      .map((value) => new Date(value as string).toISOString().slice(0, 10)),
  );

  const slots: Date[] = [];
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();

  while (slots.length < count) {
    for (const day of PUBLISH_DAYS) {
      const candidate = slotDate(year, month, day);
      if (candidate <= from) continue;
      if (takenKeys.has(candidate.toISOString().slice(0, 10))) continue;
      slots.push(candidate);
      if (slots.length === count) break;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return slots;
};

export interface RefreshablePost {
  published_at?: string | null;
  last_reviewed_at?: string | null;
  review_interval_days?: number | null;
}

/** Dni pozostałe do wymaganego odświeżenia (ujemne = zaległość) */
export const daysUntilRefresh = (post: RefreshablePost): number | null => {
  const base = post.last_reviewed_at ?? post.published_at;
  if (!base) return null;
  const interval = post.review_interval_days ?? DEFAULT_REVIEW_INTERVAL_DAYS;
  const due = new Date(base).getTime() + interval * 24 * 60 * 60 * 1000;
  return Math.round((due - Date.now()) / (24 * 60 * 60 * 1000));
};

export const needsRefresh = (post: RefreshablePost) => {
  const days = daysUntilRefresh(post);
  return days !== null && days <= 0;
};

export const formatPl = (value: Date | string) =>
  new Date(value).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
