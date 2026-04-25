import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";

/**
 * Centralna mapa breadcrumbs odzwierciedlająca nową strukturę nawigacji:
 *   Strona główna › <Sekcja> › <Pod-hub> › <Strona>
 *
 * Klucze to dokładne `pathname` (bez slasha końcowego, bez query/hash).
 * Wartość: tablica `items` przekazywana do <Breadcrumbs/> (BEZ "Strona główna" — dodaje go sam komponent).
 *
 * Dynamiczne ścieżki (np. /blog/:slug) NIE są tu mapowane — strony renderują własne <Breadcrumbs/>.
 *
 * Sekcje główne wg roli pacjenta: Problem | Zabieg | Wiedza.
 * Pomocnicze huby:
 *   - Zabieg › Proktologia (/leczenie/proktologia)
 *   - Zabieg › Flebologia (/leczenie/flebologia)
 *   - Zabieg › Ginekomastia (/leczenie/ginekomastia)
 *   - Wiedza › Dla Pacjenta (/dla-pacjenta)
 */

const ZABIEG: BreadcrumbItem = { label: "Zabieg" };
const PROKTOLOGIA: BreadcrumbItem = { label: "Proktologia", href: "/leczenie/proktologia" };
const FLEBOLOGIA: BreadcrumbItem = { label: "Flebologia", href: "/leczenie/flebologia" };
const GINEKOMASTIA_HUB: BreadcrumbItem = { label: "Ginekomastia", href: "/leczenie/ginekomastia" };
const WIEDZA: BreadcrumbItem = { label: "Wiedza" };
const DLA_PACJENTA: BreadcrumbItem = { label: "Dla Pacjenta", href: "/dla-pacjenta" };

export const BREADCRUMBS_MAP: Record<string, BreadcrumbItem[]> = {
  // Top-level
  "/o-nas": [{ label: "O nas" }],
  "/cennik": [{ label: "Cennik" }],
  "/kontakt": [{ label: "Kontakt" }],
  "/wspolpraca": [{ label: "Współpraca" }],
  "/blog": [{ label: "Blog" }],
  "/polityka-prywatnosci": [{ label: "Polityka prywatności" }],
  "/regulamin": [{ label: "Regulamin" }],

  // Zabieg › huby
  "/leczenie/proktologia": [ZABIEG, { label: "Proktologia" }],
  "/leczenie/flebologia": [ZABIEG, { label: "Flebologia" }],
  "/leczenie/ginekomastia": [ZABIEG, { label: "Ginekomastia" }],

  // Zabieg › Proktologia
  "/leczenie/lhp": [ZABIEG, PROKTOLOGIA, { label: "Hemoroidy – LHP" }],
  "/leczenie/filac": [ZABIEG, PROKTOLOGIA, { label: "Przetoki – FiLaC" }],
  "/leczenie/silac": [ZABIEG, PROKTOLOGIA, { label: "Torbiel pilonidalna – SiLaC" }],
  "/leczenie/szczelina": [ZABIEG, PROKTOLOGIA, { label: "Szczelina odbytu" }],
  "/leczenie/plastyka": [ZABIEG, PROKTOLOGIA, { label: "Plastyka odbytu" }],
  "/leczenie/anusitis": [ZABIEG, PROKTOLOGIA, { label: "Zapalenie odbytu" }],
  "/leczenie/spazm-lonowoodbytniczy": [ZABIEG, PROKTOLOGIA, { label: "Spazm łonowoodbytniczy" }],

  // Zabieg › Flebologia
  "/leczenie/evlt": [ZABIEG, FLEBOLOGIA, { label: "Żylaki – EVLT" }],
  "/leczenie/skleroterapia": [ZABIEG, FLEBOLOGIA, { label: "Skleroterapia żylaków" }],
  "/leczenie/mikroflebektomia": [ZABIEG, FLEBOLOGIA, { label: "Mikroflebektomia piankowa" }],
  "/leczenie/clacs": [ZABIEG, FLEBOLOGIA, { label: "Pajączki – CLaCS" }],
  "/leczenie/fototerapia": [ZABIEG, FLEBOLOGIA, { label: "Fototerapia LED (PBM)" }],

  // Zabieg › Ginekomastia
  "/leczenie/ginekomastia-gruczolowa": [ZABIEG, GINEKOMASTIA_HUB, { label: "Gruczołowa" }],
  "/leczenie/ginekomastia-tluszczowa": [ZABIEG, GINEKOMASTIA_HUB, { label: "Tłuszczowa" }],
  "/leczenie/ginekomastia-mieszana": [ZABIEG, GINEKOMASTIA_HUB, { label: "Mieszana" }],

  // Wiedza › Dla Pacjenta (hub)
  "/dla-pacjenta": [WIEDZA, { label: "Dla Pacjenta" }],

  // Wiedza › Edukacja
  "/dla-pacjenta/edukacja": [WIEDZA, DLA_PACJENTA, { label: "Świadomy pacjent" }],
  "/dla-pacjenta/hemoroidy": [WIEDZA, DLA_PACJENTA, { label: "Hemoroidy od A do Z" }],
  "/dla-pacjenta/hemoroidy-infografika": [WIEDZA, DLA_PACJENTA, { label: "Hemoroidy – infografika" }],
  "/dla-pacjenta/quiz-hemoroidy": [WIEDZA, DLA_PACJENTA, { label: "Test ryzyka hemoroidów" }],
  "/dla-pacjenta/ebm-hemoroidy": [WIEDZA, DLA_PACJENTA, { label: "EBM hemoroidy" }],
  "/dla-pacjenta/dziennik-hemoroidy": [WIEDZA, DLA_PACJENTA, { label: "Dziennik 14 dni — hemoroidy" }],
  "/dla-pacjenta/pajaczki": [WIEDZA, DLA_PACJENTA, { label: "Odzyskaj beztroskę" }],
  "/dla-pacjenta/faldy-odbytu": [WIEDZA, DLA_PACJENTA, { label: "Fałdy okolicy odbytu" }],
  "/dla-pacjenta/profilaktyka-zylakow": [WIEDZA, DLA_PACJENTA, { label: "Profilaktyka żylaków" }],
  "/dla-pacjenta/proktolog-faq": [WIEDZA, DLA_PACJENTA, { label: "Lekarz odpowiada" }],
  "/dla-pacjenta/pielegnacja-nog": [WIEDZA, DLA_PACJENTA, { label: "Pielęgnacja nóg" }],

  // Wiedza › Przed wizytą
  "/dla-pacjenta/przygotowanie-lhp": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do LHP" }],
  "/dla-pacjenta/przygotowanie-evlt": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do EVLT" }],
  "/dla-pacjenta/przygotowanie-filac": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do FiLaC" }],
  "/dla-pacjenta/przygotowanie-silac": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do SiLaC" }],
  "/dla-pacjenta/przygotowanie-clacs": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do CLaCS" }],
  "/dla-pacjenta/przygotowanie-skleroterapia": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do skleroterapii" }],
  "/dla-pacjenta/przygotowanie-mikroflebektomia": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do mikroflebektomii" }],
  "/dla-pacjenta/przygotowanie-plastyka": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do plastyki odbytu" }],
  "/dla-pacjenta/przygotowanie-ginekomastii": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do ginekomastii" }],
  "/dla-pacjenta/przygotowanie-ginekomastia-gruczolowa": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do ginekomastii gruczołowej" }],
  "/dla-pacjenta/przygotowanie-ginekomastia-tluszczowa": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do ginekomastii tłuszczowej" }],
  "/dla-pacjenta/przygotowanie-ginekomastia-mieszana": [WIEDZA, DLA_PACJENTA, { label: "Przygotowanie do ginekomastii mieszanej" }],

  // Wiedza › Materiały
  "/dla-pacjenta/ebook-pajaczki": [WIEDZA, DLA_PACJENTA, { label: "E-book: Pajączki" }],

  // Zalecenia po zabiegach (kontekstowo do procedury)
  "/dla-pacjenta/zalecenia-po-lhp": [ZABIEG, PROKTOLOGIA, { label: "LHP", href: "/leczenie/lhp" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-filac": [ZABIEG, PROKTOLOGIA, { label: "FiLaC", href: "/leczenie/filac" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-silac": [ZABIEG, PROKTOLOGIA, { label: "SiLaC", href: "/leczenie/silac" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-plastyce": [ZABIEG, PROKTOLOGIA, { label: "Plastyka", href: "/leczenie/plastyka" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-evlt": [ZABIEG, FLEBOLOGIA, { label: "EVLT", href: "/leczenie/evlt" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-skleroterapii": [ZABIEG, FLEBOLOGIA, { label: "Skleroterapia", href: "/leczenie/skleroterapia" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-mikroflebektomii": [ZABIEG, FLEBOLOGIA, { label: "Mikroflebektomia", href: "/leczenie/mikroflebektomia" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-clacs": [ZABIEG, FLEBOLOGIA, { label: "CLaCS", href: "/leczenie/clacs" }, { label: "Zalecenia po zabiegu" }],
  "/dla-pacjenta/zalecenia-po-ginekomastii": [ZABIEG, GINEKOMASTIA_HUB, { label: "Zalecenia po zabiegu" }],
};

/**
 * Zwraca trail breadcrumbs dla danej ścieżki LUB null gdy:
 *  - to "/" (home — bez breadcrumbs)
 *  - ścieżka dynamiczna nieobsłużona (np. /blog/:slug)
 *  - ścieżka admin/unsubscribe
 */
export function resolveBreadcrumbs(pathname: string): BreadcrumbItem[] | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return null;
  if (path.startsWith("/admin") || path.startsWith("/unsubscribe")) return null;
  return BREADCRUMBS_MAP[path] ?? null;
}
