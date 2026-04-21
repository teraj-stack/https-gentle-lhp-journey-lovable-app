import { useMemo } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, X, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------- Types ----------------

export type StatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "needs_contact"
  | "completed";

export type LocationFilter = "all" | "wilanow" | "fimedica" | "siedlce" | "rzeszow";

export type DatePresetFilter = "today" | "week" | "all" | "custom";

export type ReminderOptOutFilter = "all" | "active" | "optedOut";

export interface BookingFilters {
  status: StatusFilter;
  location: LocationFilter;
  datePreset: DatePresetFilter;
  /** YYYY-MM-DD */
  customFrom?: string;
  /** YYYY-MM-DD */
  customTo?: string;
  reminderOptOut: ReminderOptOutFilter;
  /**
   * Closeout shortcut: dziś po godz. 18:00, status=pending.
   * Recepcja używa do zamknięcia dnia (completed/no-show) przed mailem 22:00.
   */
  closeout: boolean;
}

// ---------------- Constants ----------------

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Wszystkie statusy" },
  { value: "pending", label: "Oczekujące" },
  { value: "confirmed", label: "Potwierdzone" },
  { value: "needs_contact", label: "Wymaga kontaktu" },
  { value: "cancelled", label: "Odwołane" },
  { value: "completed", label: "Zakończone" },
];

const LOCATION_OPTIONS: Array<{
  value: LocationFilter;
  label: string;
  /** Lowercased substrings used to match against `bookings.location` text. */
  match: string[];
}> = [
  { value: "all", label: "Wszystkie lokalizacje", match: [] },
  {
    value: "wilanow",
    label: "Warszawa Wilanów",
    match: ["wilanow", "wilanów", "branickiego", "warszawa-wilanow"],
  },
  {
    value: "fimedica",
    label: "Fimedica Warszawa",
    match: ["fimedica", "gieldowa", "giełdowa"],
  },
  {
    value: "siedlce",
    label: "Beauty & Mind – Siedlce",
    match: ["siedlce", "beauty-and-mind", "beauty", "brzeska"],
  },
  {
    value: "rzeszow",
    label: "IP Cliniq – Rzeszów",
    match: ["rzeszow", "rzeszów", "ipcliniq", "ip-cliniq", "rejtana"],
  },
];

const DATE_PRESET_OPTIONS: Array<{ value: DatePresetFilter; label: string }> = [
  { value: "today", label: "Dzisiaj" },
  { value: "week", label: "Najbliższe 7 dni" },
  { value: "all", label: "Wszystkie daty" },
  { value: "custom", label: "Zakres niestandardowy…" },
];

const REMINDER_OPT_OUT_OPTIONS: Array<{ value: ReminderOptOutFilter; label: string }> = [
  { value: "all", label: "Wszyscy pacjenci" },
  { value: "active", label: "Tylko aktywne reminder’y" },
  { value: "optedOut", label: "Tylko wypisani z reminderów" },
];

// ---------------- Helpers (exported for use in AdminBookings) ----------------

/** YYYY-MM-DD in local timezone (matches DB `date` column comparisons). */
export function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface DateRange {
  from?: string;
  to?: string;
}

/** Resolve preset → concrete from/to (YYYY-MM-DD) used to filter bookings. */
export function resolveDateRange(filters: BookingFilters): DateRange {
  switch (filters.datePreset) {
    case "today": {
      const today = toIsoDate(new Date());
      return { from: today, to: today };
    }
    case "week": {
      const today = new Date();
      const inAWeek = new Date();
      inAWeek.setDate(today.getDate() + 7);
      return { from: toIsoDate(today), to: toIsoDate(inAWeek) };
    }
    case "all":
      return {};
    case "custom":
      return { from: filters.customFrom, to: filters.customTo };
  }
}

/** Returns true when `bookings.location` matches the chosen LocationFilter. */
export function matchesLocation(
  bookingLocation: string,
  filter: LocationFilter,
): boolean {
  if (filter === "all") return true;
  const opt = LOCATION_OPTIONS.find((o) => o.value === filter);
  if (!opt) return true;
  const norm = (bookingLocation || "").toLowerCase();
  return opt.match.some((m) => norm.includes(m));
}

// ---------------- URL <-> Filters codec ----------------

export const DEFAULT_FILTERS: BookingFilters = {
  status: "all",
  location: "all",
  datePreset: "today",
  reminderOptOut: "all",
  closeout: false,
};

export function filtersFromSearchParams(params: URLSearchParams): BookingFilters {
  const status = params.get("status") as StatusFilter | null;
  const location = params.get("location") as LocationFilter | null;
  const datePreset = params.get("datePreset") as DatePresetFilter | null;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const reminderOptOut = params.get("reminderOptOut") as ReminderOptOutFilter | null;
  const closeout = params.get("closeout") === "1";

  // Closeout wymusza status=pending + datePreset=today (override URL).
  if (closeout) {
    return {
      status: "pending",
      location: LOCATION_OPTIONS.some((o) => o.value === location)
        ? (location as LocationFilter)
        : DEFAULT_FILTERS.location,
      datePreset: "today",
      reminderOptOut: REMINDER_OPT_OUT_OPTIONS.some((o) => o.value === reminderOptOut)
        ? (reminderOptOut as ReminderOptOutFilter)
        : DEFAULT_FILTERS.reminderOptOut,
      closeout: true,
    };
  }

  const validStatus = STATUS_OPTIONS.some((o) => o.value === status)
    ? (status as StatusFilter)
    : DEFAULT_FILTERS.status;
  const validLocation = LOCATION_OPTIONS.some((o) => o.value === location)
    ? (location as LocationFilter)
    : DEFAULT_FILTERS.location;
  const validPreset = DATE_PRESET_OPTIONS.some((o) => o.value === datePreset)
    ? (datePreset as DatePresetFilter)
    : from || to
      ? "custom"
      : DEFAULT_FILTERS.datePreset;
  const validReminderOptOut = REMINDER_OPT_OUT_OPTIONS.some((o) => o.value === reminderOptOut)
    ? (reminderOptOut as ReminderOptOutFilter)
    : DEFAULT_FILTERS.reminderOptOut;

  return {
    status: validStatus,
    location: validLocation,
    datePreset: validPreset,
    customFrom: from,
    customTo: to,
    reminderOptOut: validReminderOptOut,
    closeout: false,
  };
}

export function filtersToSearchParams(filters: BookingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.closeout) {
    params.set("closeout", "1");
    if (filters.location !== DEFAULT_FILTERS.location) params.set("location", filters.location);
    if (filters.reminderOptOut !== DEFAULT_FILTERS.reminderOptOut) {
      params.set("reminderOptOut", filters.reminderOptOut);
    }
    return params;
  }
  if (filters.status !== DEFAULT_FILTERS.status) params.set("status", filters.status);
  if (filters.location !== DEFAULT_FILTERS.location) params.set("location", filters.location);
  if (filters.datePreset !== DEFAULT_FILTERS.datePreset) params.set("datePreset", filters.datePreset);
  if (filters.datePreset === "custom") {
    if (filters.customFrom) params.set("from", filters.customFrom);
    if (filters.customTo) params.set("to", filters.customTo);
  }
  if (filters.reminderOptOut !== DEFAULT_FILTERS.reminderOptOut) {
    params.set("reminderOptOut", filters.reminderOptOut);
  }
  return params;
}

// ---------------- Component ----------------

interface Props {
  filters: BookingFilters;
  onChange: (next: BookingFilters) => void;
  /** Optional: number of bookings matching current filters (rendered as a hint). */
  resultCount?: number;
}

const AdminBookingsFilters = ({ filters, onChange, resultCount }: Props) => {
  const isFiltered = useMemo(
    () =>
      filters.status !== DEFAULT_FILTERS.status ||
      filters.location !== DEFAULT_FILTERS.location ||
      filters.datePreset !== DEFAULT_FILTERS.datePreset ||
      filters.reminderOptOut !== DEFAULT_FILTERS.reminderOptOut ||
      filters.customFrom ||
      filters.customTo ||
      filters.closeout,
    [filters],
  );

  const toggleCloseout = () => {
    if (filters.closeout) {
      onChange({ ...DEFAULT_FILTERS, location: filters.location });
    } else {
      onChange({
        ...DEFAULT_FILTERS,
        location: filters.location,
        status: "pending",
        datePreset: "today",
        closeout: true,
      });
    }
  };

  const handleStatus = (value: StatusFilter) => onChange({ ...filters, status: value });
  const handleLocation = (value: LocationFilter) => onChange({ ...filters, location: value });
  const handleReminderOptOut = (value: ReminderOptOutFilter) =>
    onChange({ ...filters, reminderOptOut: value });
  const handlePreset = (value: DatePresetFilter) => {
    if (value === "custom") {
      onChange({
        ...filters,
        datePreset: "custom",
        customFrom: filters.customFrom ?? toIsoDate(new Date()),
        customTo: filters.customTo ?? toIsoDate(new Date()),
      });
    } else {
      onChange({
        ...filters,
        datePreset: value,
        customFrom: undefined,
        customTo: undefined,
      });
    }
  };

  const handleCustomFrom = (date: Date | undefined) => {
    if (!date) return;
    onChange({ ...filters, datePreset: "custom", customFrom: toIsoDate(date) });
  };
  const handleCustomTo = (date: Date | undefined) => {
    if (!date) return;
    onChange({ ...filters, datePreset: "custom", customTo: toIsoDate(date) });
  };

  return (
    <section
      aria-label="Filtry rezerwacji"
      className="rounded-lg border border-border bg-card/50 px-4 py-3 mb-4 flex flex-wrap items-end gap-3"
    >
      <FilterField label="Skrót">
        <Button
          type="button"
          variant={filters.closeout ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 gap-2",
            filters.closeout && "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          onClick={toggleCloseout}
          aria-pressed={filters.closeout}
          title="Dziś po 18:00, status oczekująca — do zamknięcia przed mailem 22:00"
        >
          <Moon className="w-3.5 h-3.5" />
          Po‑wizytowe
        </Button>
      </FilterField>

      <FilterField label="Status">
        <Select value={filters.status} onValueChange={(v) => handleStatus(v as StatusFilter)}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Lokalizacja">
        <Select value={filters.location} onValueChange={(v) => handleLocation(v as LocationFilter)}>
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Zakres dat">
        <Select value={filters.datePreset} onValueChange={(v) => handlePreset(v as DatePresetFilter)}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESET_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      {filters.datePreset === "custom" && (
        <>
          <FilterField label="Od">
            <DatePickerField
              value={filters.customFrom}
              onChange={handleCustomFrom}
              placeholder="Wybierz datę"
            />
          </FilterField>
          <FilterField label="Do">
            <DatePickerField
              value={filters.customTo}
              onChange={handleCustomTo}
              placeholder="Wybierz datę"
              minDate={filters.customFrom ? new Date(filters.customFrom) : undefined}
            />
          </FilterField>
        </>
      )}

      <FilterField label="Reminder">
        <Select
          value={filters.reminderOptOut}
          onValueChange={(v) => handleReminderOptOut(v as ReminderOptOutFilter)}
        >
          <SelectTrigger className="w-[230px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPT_OUT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <div className="flex items-center gap-2 ml-auto">
        {typeof resultCount === "number" && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {resultCount} {pluralizeRezerwacji(resultCount)}
          </span>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            <X className="w-3.5 h-3.5 mr-1" /> Wyczyść
          </Button>
        )}
      </div>
    </section>
  );
};

// ---------------- Sub-components ----------------

const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
    {children}
  </div>
);

const DatePickerField = ({
  value,
  onChange,
  placeholder,
  minDate,
}: {
  value?: string;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
  minDate?: Date;
}) => {
  const date = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[170px] h-9 justify-start text-left font-normal text-sm",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 mr-2" />
          {date ? format(date, "d MMM yyyy", { locale: pl }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          disabled={minDate ? (d) => d < minDate : undefined}
          initialFocus
          locale={pl}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};

function pluralizeRezerwacji(n: number): string {
  if (n === 1) return "rezerwacja";
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return "rezerwacji";
  if (last >= 2 && last <= 4) return "rezerwacje";
  return "rezerwacji";
}

export default AdminBookingsFilters;
