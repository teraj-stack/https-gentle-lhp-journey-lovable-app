---
name: Breadcrumbs Mapping
description: Centralna mapa breadcrumbs zgodna z nową nawigacją Problem / Zabieg / Wiedza — single source of truth, używana przez wszystkie strony
type: feature
---

Wszystkie podstrony renderują `<Breadcrumbs items={BREADCRUMBS_MAP["/sciezka"]} />` (komponent `src/components/layout/Breadcrumbs.tsx`) z trailem zgodnym z nową strukturą nawigacji opartą o rolę pacjenta.

**Wzorce trail (po "Strona główna"):**
- **Top-level**: `O nas | Cennik | Kontakt | Współpraca | Blog | Polityka prywatności | Regulamin` — 1 element
- **Zabieg › Hub**: `Zabieg › Proktologia` lub `Zabieg › Flebologia` lub `Zabieg › Ginekomastia` (2 elementy, "Zabieg" bez href)
- **Zabieg › Procedura**: `Zabieg › Proktologia › Hemoroidy – LHP` (3 elementy)
- **Zabieg › Ginekomastia › Podtyp**: `Zabieg › Ginekomastia › Gruczołowa` (3 elementy)
- **Wiedza › Dla Pacjenta**: `Wiedza › Dla Pacjenta › <Strona>` (3 elementy)
- **Zalecenia po zabiegu** (kontekstowe): `Zabieg › <Hub> › <Procedura> › Zalecenia po zabiegu` (4 elementy) — strona zaleceń logicznie należy do procedury, nie do "Dla Pacjenta"

**Single source of truth — OBOWIĄZKOWE**: `src/lib/breadcrumbsMap.ts` zawiera `BREADCRUMBS_MAP` (Record<path, items[]>) oraz funkcję `resolveBreadcrumbs(pathname)`. **Wszystkie 45 podstron z breadcrumbs używają mapy** — `<Breadcrumbs items={BREADCRUMBS_MAP["/leczenie/lhp"]} />`. NIE wolno hardkodować inline tablic items=[…]. Wyjątek: `BlogPost.tsx` (dynamiczny slug, nie w mapie).

**Etykiety bez href**: "Zabieg" i "Wiedza" są nielinkowane — to sekcje menu (mega-dropdown), nie samodzielne strony.

**JSON-LD BreadcrumbList**: generowany automatycznie przez komponent `Breadcrumbs` (schema.org), używa absolutnego URL `https://bestcml.io`.

**Testy**: `src/lib/breadcrumbsMap.test.ts` — 7 testów Vitest pokrywających `resolveBreadcrumbs` (top-level, /, admin/unsubscribe, normalizacja slashy, ścieżki dynamiczne, spójność mapy).

**Wymagana spójność etykiet**: Skleroterapia używa "Skleroterapia żylaków" (nie "Skleroterapia"), Fototerapia używa "Fototerapia LED (PBM)" (nie "Fototerapia LED"). Mapa musi pasować 1:1 do tytułów na stronach — refaktor weryfikuje to deep-equal.
