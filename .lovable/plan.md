## Cel

Dociągać mniejsze pliki na mobile: wygenerować kilka rozdzielczości + wariant AVIF dla najważniejszych obrazów, wpiąć je jako `<picture>` z `srcset` i `sizes`. Zysk: mobile pobiera ~50–150 KB zamiast pełnego pliku desktop, AVIF daje dodatkowo 20–40% mniej niż WebP.

## Zakres — które obrazy

Kryterium: obraz LCP-owy lub ≥600 px szerokości w kluczowej sekcji nad foldem.

1. `src/assets/dr-bujok.webp` — hero home + `/o-nas` (LCP)
2. `src/assets/led-photobiomodulation.webp` — banner PBM (nad foldem na `/fototerapia` i banner recovery boost)
3. `src/assets/ceap-classification.webp` — sekcja CEAP na `/evlt`
4. `src/assets/evlt-anatomy.webp` — anatomia EVLT
5. `src/assets/vein-anatomy.webp` — anatomia żylakowa na `/profilaktyka-zylakow` i `/pajaczki`

Reszta (małe ikony, obrazy poniżej fold z `loading="lazy"`) — bez zmian. Nie dotykamy `public/*` (te nie idą przez bundlera Vite).

## Jak to działa

1. **`vite-imagetools`** — plugin do Vite. Dodaje query stringi do importów, na których build generuje warianty:
   ```ts
   import heroSrcset from "@/assets/dr-bujok.webp?w=480;720;1080;1440&format=avif;webp&as=picture";
   ```
   Zwraca obiekt `{ sources: { avif: "...srcset...", webp: "...srcset..." }, img: { src, w, h } }` gotowy do `<picture>`.

2. **Helper komponent** `<ResponsiveImage>` w `src/components/shared/ResponsiveImage.tsx`:
   ```tsx
   <picture>
     <source type="image/avif" srcSet={picture.sources.avif} sizes={sizes} />
     <source type="image/webp" srcSet={picture.sources.webp} sizes={sizes} />
     <img src={picture.img.src} width={w} height={h} alt={...} sizes={sizes} {...priorityProps} />
   </picture>
   ```
   Przyjmuje `priority` boolean → mapuje na `loading="eager"` + `fetchPriority="high"` + `decoding="async"`. CLS chroniony przez `width`/`height` z `picture.img`.

3. **`sizes` per obraz** (dobrane pod istniejące layouty):
   - Hero doctor (grid 2-kolumnowy od md): `"(min-width: 768px) 50vw, 100vw"`
   - Banery pełnej szerokości (PBM, CEAP): `"100vw"`
   - Anatomia w kolumnie tekstowej: `"(min-width: 1024px) 560px, 100vw"`

## Kroki

1. `bun add -D vite-imagetools`
2. `vite.config.ts`: dodać `imagetools()` do `plugins`
3. Utworzyć `src/components/shared/ResponsiveImage.tsx` (helper `<picture>` z `priority`, `sizes`, `className`, `alt`, `eager`)
4. Podmienić `<img>` w 5 komponentach:
   - `src/components/home/DoctorSection.tsx` (priority)
   - `src/components/about/AboutDoctor.tsx` (priority)
   - `src/components/shared/RecoveryBoostBanner.tsx`
   - `src/components/evlt/CEAPSection.tsx`
   - `src/components/evlt/EVLTAnatomy.tsx`
   - `src/components/pajaczki/AnatomyDiagram.tsx`
5. `src/main.tsx`: preload już wskazuje pojedynczy `dr-bujok.webp`. Zaktualizować, żeby preloadował właściwy hash z `?as=picture` (import ścieżki srcset AVIF dla `w=720`).
6. `bun run build` — zweryfikować, że warianty się generują (folder `dist/assets` powinien mieć `dr-bujok-*.avif` w 4 szerokościach).

## Ryzyka i decyzje

- **Czas builda**: pierwsze `vite build` będzie ~15–30 s wolniejsze (sharp koduje AVIF). Wyniki cachowane, więc kolejne buildy tyle samo co dziś.
- **Rozmiar źródeł**: pliki źródłowe (`.webp` w `src/assets`) zostają — imagetools generuje warianty z nich. Bundle output rośnie o warianty, ale przeglądarka pobiera tylko jeden.
- **CSP**: bez zmian (pliki jadą z tej samej origin).
- **AVIF fallback**: przeglądarki bez AVIF (starsze Safari 15) użyją WebP z drugiego `<source>`, potem `<img src>`.
- **Nie ruszamy Kontakt/Blog kart** — te obrazy są w `absolute inset-0` w kontenerach o stałej wysokości, CLS = 0, pobierają się lazy poniżej foldu. Optymalizacja srcset dla nich daje minimalny zysk vs. koszt refaktoru list.

## Weryfikacja

- `bun run build` przechodzi.
- W DevTools Network na mobile viewport (390 px) hero pobiera `dr-bujok-480.avif` (~15–25 KB) zamiast pełnego 720p WebP (~60–80 KB).
- Lighthouse mobile: "Serve images in next-gen formats" i "Properly size images" przechodzą na zielono.
- Web Vitals w `/raporty/cwv` po 24–48 h ruchu pokaże spadek LCP p75 na mobile.
