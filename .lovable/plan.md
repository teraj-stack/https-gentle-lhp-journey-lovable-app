

## Dodanie preconnect/prefetch dla zewnętrznych zasobów

**Obecny stan:** `index.html` ma już `preconnect` dla `fonts.googleapis.com` i `fonts.gstatic.com`, ale brakuje:
- Faktycznego załadowania arkusza stylów fontów (jest tylko `preload`, brak `<link rel="stylesheet">`)
- DNS-prefetch dla `www.znanylekarz.pl` (linkowany w wielu CTA na stronie)
- Preconnect dla Supabase API (używanego przez blog i admin)

**Plan — edycja jednego pliku: `index.html`**

1. Dodać `<link rel="stylesheet">` dla Google Fonts (obecnie jest `preload as="style"` ale brak faktycznego arkusza — przeglądarka pobiera plik, ale go nie stosuje bez dodatkowego kroku)
2. Dodać `<link rel="dns-prefetch" href="https://www.znanylekarz.pl">` — przyspiesza rozwiązanie DNS przy kliknięciu w CTA
3. Dodać `<link rel="preconnect" href="https://jowtjcyevactqmhqrytz.supabase.co">` — przyspiesza połączenie z backendem dla stron z blogiem

Wszystkie zmiany w `<head>` sekcji `index.html`, zero zmian w komponentach React.

