---
name: Źródła EBM — profilaktyka hemoroidów
description: Kategoryzowana bibliografia EBM (8 kategorii, 22 referencje PubMed/ASCRS/ESCP/Cochrane) osadzona pod quizem ryzyka hemoroidów, we wpisie blogowym i jako PDF do pobrania
type: feature
---

Sekcja źródeł Evidence-Based Medicine wspierająca rekomendacje profilaktyki hemoroidów.

## Komponenty
- `src/components/hemoroidy/EBMSourcesSection.tsx` — reużywalny komponent z accordion (8 kategorii), CTA do PDF, prop `categoryIds` do filtrowania
- PDF: `public/downloads/zrodla-EBM-profilaktyka-hemoroidow-CML.pdf` + Storage `blog-covers/downloads/`

## Kategorie (8)
1. Wytyczne kliniczne (ASCRS 2018, ESCP 2020)
2. Błonnik i dieta (Cochrane, Alonso-Coello)
3. Nawodnienie i konsystencja stolca
4. Nawyki toaletowe i parcie (Sikirov, Johanson)
5. Aktywność fizyczna
6. Czynniki ryzyka (ciąża, wiek, BMI)
7. Diagnostyka i kiedy do lekarza
8. Leczenie laserowe LHP (RCT)

## Lokalizacje
- `/dla-pacjenta/quiz-hemoroidy` — pełen `EBMSourcesSection` pod quizem
- Wpis blogowy `seks-analny-a-hemoroidy-fakty-i-mity` — markdown na końcu (8 sekcji + link do PDF)

## URL PDF
`https://jowtjcyevactqmhqrytz.supabase.co/storage/v1/object/public/blog-covers/downloads%2Fzrodla-EBM-profilaktyka-hemoroidow-CML.pdf`

## Skrypt generujący PDF
`/tmp/make_ebm_sources_pdf.py` (DejaVu Sans, A4, ReportLab)
