

## Kompresja hero image

**Obecny stan:** `hero-clinic-fixed.webp` — 1376×768 px, 1.2 MB

**Plan:**

1. Skompresować obraz za pomocą `cwebp` z jakością 75 (dobry balans jakość/rozmiar) — oczekiwany wynik ~150–300 KB
2. Porównać wizualnie oryginał i skompresowaną wersję
3. Jeśli jakość jest akceptowalna, podmienić plik w `src/assets/`
4. Nie trzeba zmieniać żadnych importów — nazwa pliku pozostaje ta sama

**Oczekiwany efekt:** Redukcja z 1.2 MB do ~200–300 KB (75–85% mniej), co poprawi LCP o ~0.5–1s na wolniejszych łączach.

