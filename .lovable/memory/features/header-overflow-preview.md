---
name: Header Overflow Preview
description: Dev-only /dev/header-preview — desktop overflow scan + mobilny menu test (auto-klik burgera, sync 5 sekcji)
type: feature
---

Dev-only strona `src/pages/DevHeaderPreview.tsx` (route `/dev/header-preview`, lazy-loaded w `App.tsx`, nie podlinkowana w nawigacji) do QA nagłówka.

## Dwa tryby testów

**Desktop / Tablet** — iframe `/` w 4 szerokościach (375 / 390 / 768 / 1024). Skan ~800ms po loadzie:
- `scrollWidth > clientWidth` na elementach `<header>` (text-clipped)
- `documentElement.scrollWidth > viewport` (horizontal-scroll)

**Mobile menu** — iframe w 3 szerokościach < 1024 (375 / 390 / 768). Po loadzie + 1000ms:
1. `openMobilePanel(doc)` klika `button[aria-label="Menu"]`, poll co 50ms do 700ms na animację framer-motion (`height: auto`).
2. `findMobilePanel(doc)` szuka `div.lg\\:hidden.bg-card` zawierającego sentinel "Proktologia".
3. `detectMobilePanelIssues(panel, vw)` waliduje:
   - **Sync sekcji**: każda z `REQUIRED_MOBILE_SECTIONS` (Proktologia, Flebologia, Ginekomastia, Wiedza, Klinika) musi mieć nagłówek `.uppercase` matching `/(^|·\s*)Section\b/i` (Wiedza renderowana jako "Wiedza · Edukacja").
   - **section-empty**: panel musi mieć ≥ 5 linków `a[href]`.
   - **text-clipped**: przepełnienia w `a, span` panelu (truncate ucina długie etykiety).
   - **horizontal-scroll**: `panel.scrollWidth > vw`.
   - **panel-not-open**: gdy burger nie otworzył panelu.

## UI

- Status badge per panel (OK / N problem(y) / Błąd).
- W trybie mobile: chipy 5 sekcji (✓ zielony / ✗ czerwony) pod iframe.
- Lista findings z selektorem, powodem, overflowPx.
- Re-scan button per panel (manualny rerun).

Iframe height: 240px desktop, 720px mobile (musi pomieścić rozwinięty panel).
