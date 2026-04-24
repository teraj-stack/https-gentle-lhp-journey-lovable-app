---
name: Checklist PDF Generator
description: Skrypt scripts/generate-checklist-pdf.py generuje public/downloads/checklista-profilaktyka-hemoroidow-CML.pdf — 14-dniowy plan + bibliografia EBM jako ostatnia strona z klikalnymi linkami do PubMed/journal
type: feature
---

Skrypt `scripts/generate-checklist-pdf.py` (Python + reportlab) generuje 5-stronicowy PDF zapisywany do `public/downloads/checklista-profilaktyka-hemoroidow-CML.pdf`. Linkowany z komponentu HemoroidyRiskQuiz (download attribute).

Struktura:
- s. 1–2: 14-dniowy plan (4 filary profilaktyki + tabela 14 dni z checkboxami + box "Czerwone flagi")
- s. 3–5: bibliografia EBM (8 kategorii, 22 referencje), klikalne linki do PubMed/journal w kolorze złotym (#7a6a26)

Branding: złoty rule (#c9a84c), kremowe karty (#fdfaf2), DejaVu Sans (full polski Unicode — registered z `/tmp/fonts/DejaVuSans*.ttf`, źródło zip lokalnie).

Bibliografia synced ręcznie z `src/components/hemoroidy/EBMSourcesSection.tsx` (CATEGORIES const). Przy zmianie źródeł aktualizuj OBA pliki.

Regeneracja: `python scripts/generate-checklist-pdf.py` (wymaga reportlab).
