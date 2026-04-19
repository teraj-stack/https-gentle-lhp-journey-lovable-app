---
name: Breadcrumbs Mapping
description: Centralna mapa breadcrumbs zgodna z nową nawigacją Problem / Zabieg / Wiedza
type: feature
---

Wszystkie podstrony renderują `<Breadcrumbs>` (komponent `src/components/layout/Breadcrumbs.tsx`) z trailem zgodnym z nową strukturą nawigacji opartą o rolę pacjenta.

**Wzorce trail (po "Strona główna"):**
- **Top-level**: `O nas | Cennik | Kontakt | Współpraca | Blog | Polityka prywatności | Regulamin` — 1 element
- **Zabieg › Hub**: `Zabieg › Proktologia` lub `Zabieg › Flebologia` lub `Zabieg › Ginekomastia` (2 elementy, "Zabieg" bez href)
- **Zabieg › Procedura**: `Zabieg › Proktologia › Hemoroidy – LHP` (3 elementy)
- **Zabieg › Ginekomastia › Podtyp**: `Zabieg › Ginekomastia › Gruczołowa` (3 elementy)
- **Wiedza › Dla Pacjenta**: `Wiedza › Dla Pacjenta › <Strona>` (3 elementy)
- **Zalecenia po zabiegu** (kontekstowe): `Zabieg › <Hub> › <Procedura> › Zalecenia po zabiegu` (4 elementy) — strona zaleceń logicznie należy do procedury, nie do "Dla Pacjenta"

**Single source of truth**: `src/lib/breadcrumbsMap.ts` zawiera `BREADCRUMBS_MAP` (Record<path, items[]>) oraz funkcję `resolveBreadcrumbs(pathname)`. Strony renderują `<Breadcrumbs>` ręcznie (z własnym layoutem/marginesami), a mapa służy jako referencja i może być wykorzystana w testach lub przyszłym `AutoBreadcrumbs`.

**Etykiety bez href**: "Zabieg" i "Wiedza" są nielinkowane — to sekcje menu (mega-dropdown), nie samodzielne strony.

**JSON-LD BreadcrumbList**: generowany automatycznie przez komponent `Breadcrumbs` (schema.org), używa absolutnego URL `https://bestcml.io`.
