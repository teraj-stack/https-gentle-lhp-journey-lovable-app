/**
 * Hardkodowane defaulty alt + figcaption dla VenousInsufficiencyImage,
 * używane jako fallback (oraz źródło prawdy dla dev podglądu/overlayu).
 *
 * Wartości MUSZĄ być zsynchronizowane z propsami przekazywanymi do
 * <VenousInsufficiencyImage> na poszczególnych stronach (EVLT, Flebologia,
 * Mikroflebektomia, ProfilaktykaZylakow). CMS (vein_image_overrides) może
 * je nadpisać per-page/per-slot.
 */
import type { VeinImagePageKey } from "@/hooks/useVeinImageOverrides";

export interface VeinImagePagePreset {
  key: VeinImagePageKey;
  label: string;
  route: string;
  title: string;
  subtitle: string;
  mainAlt: string;
  mainCaption: string;
  perforatorAlt: string;
  perforatorCaption: string;
}

export const VEIN_IMAGE_PAGE_PRESETS: readonly VeinImagePagePreset[] = [
  {
    key: "evlt",
    label: "EVLT",
    route: "/leczenie/evlt",
    title: "Skąd biorą się żylaki — co dokładnie zamyka EVLT?",
    subtitle:
      "EVLT zamyka chorą żyłę odpiszczelową lub odstrzałkową od środka — eliminuje refluks, który napędza żylaki, perforatorowy zastój i stan zapalny widoczne na schemacie.",
    mainAlt:
      "Schemat porównawczy zdrowej żyły i żylaka — niedomykalność zastawek w pniu żylnym powoduje refluks (cofanie krwi), który EVLT zamyka termicznie od środka",
    mainCaption:
      "Zdrowa zastawka · Refluks w pniu żylnym · Cel EVLT · Termiczne zamknięcie żyły",
    perforatorAlt:
      "Schemat niewydolnego perforatora — żyły łączącej układ głęboki z powierzchownym; jego refluks często współistnieje z niewydolnością pnia żylnego leczonego EVLT",
    perforatorCaption:
      "Niewydolny perforator · Współistnieje z refluksem pnia · Diagnostyka USG Doppler przed EVLT",
  },
  {
    key: "mikroflebektomia",
    label: "Mikroflebektomia",
    route: "/leczenie/mikroflebektomia",
    title: "Co dokładnie usuwa mikroflebektomia?",
    subtitle:
      '„Sznury" pod skórą to żylaki bocznic — żył, w których ścianki osłabły, zastawki przestały się domykać, a krew zaczęła się cofać. Mikroflebektomia usuwa je z drobnych nakłuć, bez nacinania skóry.',
    mainAlt:
      "Schemat porównawczy zdrowej żyły i żylakowatej bocznicy — poszerzone naczynie z niedomykalnością zastawek i refluksem (cofaniem krwi), które mikroflebektomia usuwa mechanicznie z mikronakłuć",
    mainCaption:
      "Zdrowa bocznica · Żylakowata bocznica · Refluks w bocznicy · Usunięcie z mikronakłuć",
    perforatorAlt:
      "Schemat niewydolnego perforatora — często zasila żylakowate bocznice usuwane mikroflebektomią; jego ocena USG Doppler decyduje o zakresie zabiegu",
    perforatorCaption:
      "Niewydolny perforator · Zasila żylakowatą bocznicę · Ocena USG Doppler przed zabiegiem",
  },
  {
    key: "flebologia",
    label: "Flebologia (niewydolność żylna)",
    route: "/leczenie/flebologia",
    title: "Mechanika żylaków — od zastawki do widocznego naczynia",
    subtitle:
      "Każdy zabieg flebologiczny w CML celuje w konkretne ogniwo tej kaskady: laser zamyka chory pień, mikroflebektomia usuwa żylakowate bocznice, skleroterapia eliminuje resztkowe naczynia, a CLaCS — drobne pajączki. Diagnostyka USG Doppler decyduje, gdzie zaczynamy.",
    mainAlt:
      "Schemat mechaniki żylaków — niedomykalność zastawek w przewlekłej niewydolności żylnej powoduje refluks (cofanie krwi), poszerzenie naczynia i stan zapalny prowadzący do widocznych żylaków",
    mainCaption:
      "Zastawka · Refluks · Poszerzenie naczynia · Stan zapalny · Widoczny żylak",
    perforatorAlt:
      "Schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym, którego refluks dociąża powierzchowne żyły i napędza powstawanie żylaków",
    perforatorCaption:
      "Niewydolny perforator · Dociąża układ powierzchowny · Punkt diagnostyki USG Doppler",
  },
  {
    key: "profilaktyka",
    label: "Profilaktyka żylaków",
    route: "/dla-pacjenta/profilaktyka-zylakow",
    title: "Co dokładnie chronisz, dbając o nogi",
    subtitle:
      "Profilaktyka żylaków to ochrona zastawek. Gdy zaczynają się one rozszczelniać, krew cofa się ku dołowi, ścianki słabną, a wokół naczynia narasta stan zapalny — proces, który po latach trudno cofnąć.",
    mainAlt:
      "Schemat porównawczy zdrowej zastawki żylnej i niedomykalności zastawek prowadzącej do refluksu (cofania krwi) — proces, któremu zapobiega regularny ruch, kompresjoterapia i pielęgnacja nóg",
    mainCaption:
      "Zdrowa zastawka · Pierwsze rozszczelnienie · Refluks i stan zapalny · Etap, któremu zapobiegasz",
    perforatorAlt:
      "Schemat niewydolnego perforatora — pokazuje, dlaczego długie stanie i siedzenie obciąża układ żylny; czynnik ryzyka, który łagodzi aktywność i kompresjoterapia",
    perforatorCaption:
      "Niewydolny perforator · Obciążenie z długiego stania · Łagodzony ruchem i kompresją",
  },
] as const;

export const getVeinImagePreset = (
  key: VeinImagePageKey,
): VeinImagePagePreset | undefined =>
  VEIN_IMAGE_PAGE_PRESETS.find((p) => p.key === key);
