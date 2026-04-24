"""Generate the 14-day hemorrhoid prevention checklist PDF with an EBM
bibliography as the final page.

Output: public/downloads/checklista-profilaktyka-hemoroidow-CML.pdf

Brand: CML — gold (#c9a84c) on near-black anthracite background to mirror the
Dark Premium Luxury identity, with white card surfaces for legibility on print.
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# Fonts — DejaVu Sans supports the full Polish diacritics set
# ---------------------------------------------------------------------------
FONT_DIR = Path("/tmp/fonts")
pdfmetrics.registerFont(TTFont("DejaVu", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Oblique", str(FONT_DIR / "DejaVuSans-Oblique.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-BoldOblique", str(FONT_DIR / "DejaVuSans-BoldOblique.ttf")))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily(
    "DejaVu",
    normal="DejaVu",
    bold="DejaVu-Bold",
    italic="DejaVu-Oblique",
    boldItalic="DejaVu-BoldOblique",
)

FONT = "DejaVu"
FONT_BOLD = "DejaVu-Bold"

# ---------------------------------------------------------------------------
# Brand
# ---------------------------------------------------------------------------
GOLD = HexColor("#c9a84c")
GOLD_SOFT = HexColor("#e8d8a3")
INK = HexColor("#1a1a1a")
INK_SOFT = HexColor("#4a4a4a")
BG = HexColor("#fdfaf2")  # warm cream card
RULE = HexColor("#d8c98a")
DESTRUCTIVE = HexColor("#b3261e")

OUT_DIR = Path("public/downloads")
OUT_PATH = OUT_DIR / "checklista-profilaktyka-hemoroidow-CML.pdf"


# ---------------------------------------------------------------------------
# Page chrome — gold rule, footer
# ---------------------------------------------------------------------------
def draw_chrome(canvas, doc):
    canvas.saveState()
    # Top gold rule
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.4)
    canvas.line(20 * mm, A4[1] - 18 * mm, A4[0] - 20 * mm, A4[1] - 18 * mm)
    # Brand mark top-right
    canvas.setFillColor(GOLD)
    canvas.setFont(FONT_BOLD, 9)
    canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 14 * mm, "CML  ·  Centrum Medycyny Laserowej")
    # Footer
    canvas.setStrokeColor(GOLD_SOFT)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 16 * mm, A4[0] - 20 * mm, 16 * mm)
    canvas.setFillColor(INK_SOFT)
    canvas.setFont(FONT, 8)
    canvas.drawString(20 * mm, 11 * mm, "mcml.pl  ·  Profilaktyka choroby hemoroidalnej oparta na EBM")
    canvas.drawRightString(A4[0] - 20 * mm, 11 * mm, f"Strona {doc.page}")
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
base = getSampleStyleSheet()

H1 = ParagraphStyle(
    "H1",
    parent=base["Heading1"],
    fontName=FONT_BOLD,
    fontSize=24,
    leading=28,
    textColor=INK,
    spaceAfter=4,
    alignment=TA_LEFT,
)
EYEBROW = ParagraphStyle(
    "Eyebrow",
    parent=base["Normal"],
    fontName=FONT_BOLD,
    fontSize=8,
    leading=11,
    textColor=GOLD,
    spaceAfter=8,
)
LEAD = ParagraphStyle(
    "Lead",
    parent=base["Normal"],
    fontName=FONT,
    fontSize=11,
    leading=16,
    textColor=INK_SOFT,
    spaceAfter=18,
)
H2 = ParagraphStyle(
    "H2",
    parent=base["Heading2"],
    fontName=FONT_BOLD,
    fontSize=14,
    leading=18,
    textColor=INK,
    spaceBefore=14,
    spaceAfter=8,
)
H3 = ParagraphStyle(
    "H3",
    parent=base["Heading3"],
    fontName=FONT_BOLD,
    fontSize=11,
    leading=14,
    textColor=GOLD,
    spaceBefore=6,
    spaceAfter=4,
)
BODY = ParagraphStyle(
    "Body",
    parent=base["Normal"],
    fontName=FONT,
    fontSize=10,
    leading=14,
    textColor=INK,
)
BODY_SMALL = ParagraphStyle(
    "BodySmall",
    parent=BODY,
    fontSize=9,
    leading=12.5,
    textColor=INK_SOFT,
)
BIB_AUTH = ParagraphStyle(
    "BibAuth",
    parent=BODY_SMALL,
    fontName=FONT_BOLD,
    fontSize=9,
    leading=12,
    textColor=INK,
    spaceBefore=2,
)
BIB_BODY = ParagraphStyle(
    "BibBody",
    parent=BODY_SMALL,
    fontSize=9,
    leading=12,
    textColor=INK_SOFT,
    spaceAfter=4,
)
CAT_TITLE = ParagraphStyle(
    "CatTitle",
    parent=H3,
    fontSize=12,
    leading=15,
    textColor=GOLD,
    spaceBefore=10,
    spaceAfter=2,
)
DISCLAIMER = ParagraphStyle(
    "Disclaimer",
    parent=BODY_SMALL,
    fontSize=8,
    leading=11,
    textColor=INK_SOFT,
    alignment=TA_CENTER,
    spaceBefore=14,
)


# ---------------------------------------------------------------------------
# 14-day plan content
# ---------------------------------------------------------------------------
PILLARS = [
    ("Błonnik 25–35 g/dzień", "psyllium, warzywa, pełne ziarno, strączki"),
    ("Woda 2–2,5 l/dzień", "regularnie, małymi porcjami; mniej kawy/alkoholu"),
    ("Toaleta ≤3 min", "bez telefonu i parcia; podnóżek (pozycja kuczna)"),
    ("Ruch 30 min/dzień", "spacer + Kegle 3×10; przerwy w pracy siedzącej"),
]

DAYS = [
    # week 1 – wdrożenie nawyków
    ("1", "Start: pomiar i higiena", "Zważ się, zapisz typowy dzień (woda, kawa, błonnik). Kup psyllium i podnóżek do toalety."),
    ("2", "Błonnik 1×", "Dodaj 1 łyżkę psyllium do śniadania. Wypij od razu szklankę wody."),
    ("3", "Woda +500 ml", "Postaw butelkę 1 l na biurku i drugą obok łóżka. Cel: 2 l."),
    ("4", "Toaleta 3 min", "Wstań po 3 minutach niezależnie od efektu. Bez telefonu."),
    ("5", "Spacer 30 min", "Po obiedzie 30 min marszu w średnim tempie."),
    ("6", "Pełna miska warzyw", "Min. ½ talerza warzyw przy obiedzie i kolacji."),
    ("7", "Bilans tygodnia", "Ile dni po 4/4 filary? Zaznacz w tabeli poniżej. Nagroda za 5+ dni."),
    # week 2 – utrwalenie + objawy
    ("8", "Psyllium 2×", "Łyżka rano i wieczór. Obserwuj konsystencję stolca (cel: typ 3–4 Bristol)."),
    ("9", "Kegle 3×10", "Trzy serie po 10 napięć (5 s napięcie, 5 s relaks). Można w samochodzie."),
    ("10", "Bez parcia", "Wydychaj powietrze przy podnoszeniu ciężarów. Nie trzymaj oddechu."),
    ("11", "Audyt siedzenia", "Co 45 min wstań na 2 min. Ustaw przypomnienie w telefonie."),
    ("12", "Pełne ziarno", "Zamień białe pieczywo/ryż na pełnoziarniste przez cały dzień."),
    ("13", "Self-check objawów", "Czy w ostatnich 14 dniach wystąpiło: krwawienie / guzek / świąd? Zanotuj."),
    ("14", "Decyzja", "Brak objawów → kontynuuj plan. Krwawienie / guzek / wypadanie → umów konsultację proktologiczną w ciągu 7 dni."),
]

RED_FLAGS = [
    "Obfite krwawienie z odbytu lub krew ciemna / zmieszana ze stolcem",
    "Silny ból odbytu z gorączką (>38°C) lub dreszczami",
    "Wyczuwalny guzek, który nie znika po 48 h lub jest siny i bolesny",
    "Niezamierzona utrata masy ciała, niedokrwistość, zmiana rytmu wypróżnień",
]


# ---------------------------------------------------------------------------
# EBM bibliography (sync with src/components/hemoroidy/EBMSourcesSection.tsx)
# ---------------------------------------------------------------------------
CATEGORIES = [
    {
        "title": "Wytyczne kliniczne",
        "intro": "Oficjalne rekomendacje towarzystw kolorektalnych — fundament zaleceń profilaktycznych.",
        "items": [
            ("Davis B.R. et al.", "2018",
             "ASCRS Clinical Practice Guidelines for the Management of Hemorrhoids",
             "Diseases of the Colon &amp; Rectum, 61(3):284–292",
             "https://journals.lww.com/dcrjournal/Fulltext/2018/03000/The_American_Society_of_Colon_and_Rectal_Surgeons.7.aspx"),
            ("van Tol R.R. et al.", "2020",
             "European Society of ColoProctology: guideline for haemorrhoidal disease",
             "Colorectal Disease, 22(6):650–662",
             "https://onlinelibrary.wiley.com/doi/10.1111/codi.14975"),
            ("Cocorullo G. et al.", "2017",
             "Non-surgical management for hemorrhoidal disease — A systematic review",
             "G Chir, 38(1):5–14",
             "https://pubmed.ncbi.nlm.nih.gov/28460197/"),
        ],
    },
    {
        "title": "Błonnik i dieta",
        "intro": "Skuteczność błonnika rozpuszczalnego (psyllium) w redukcji objawów i krwawienia.",
        "items": [
            ("Alonso-Coello P. et al.", "2005",
             "Laxatives for the treatment of hemorrhoids — Cochrane Systematic Review",
             "Cochrane Database Syst Rev, (4):CD004649",
             "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004649.pub2/full"),
            ("Alonso-Coello P. et al.", "2006",
             "Fiber for the treatment of hemorrhoids complications: systematic review and meta-analysis",
             "Am J Gastroenterol, 101(1):181–188",
             "https://pubmed.ncbi.nlm.nih.gov/16405552/"),
            ("Moesgaard F. et al.", "1982",
             "High-fiber diet reduces bleeding and pain in patients with hemorrhoids — double-blind trial",
             "Diseases of the Colon &amp; Rectum, 25(5):454–456",
             "https://pubmed.ncbi.nlm.nih.gov/6284457/"),
        ],
    },
    {
        "title": "Nawodnienie i konsystencja stolca",
        "intro": "Związek niedostatecznej podaży płynów z zaparciami — kluczowym czynnikiem ryzyka.",
        "items": [
            ("Arnaud M.J.", "2003",
             "Mild dehydration: a risk factor of constipation?",
             "Eur J Clin Nutr, 57 Suppl 2:S88–S95",
             "https://pubmed.ncbi.nlm.nih.gov/14681719/"),
            ("Anti M. et al.", "1998",
             "Water supplementation enhances the effect of high-fiber diet on stool frequency",
             "Hepatogastroenterology, 45(21):727–732",
             "https://pubmed.ncbi.nlm.nih.gov/9684123/"),
        ],
    },
    {
        "title": "Nawyki toaletowe i parcie",
        "intro": "Rola czasu w toalecie, parcia (próby Valsalvy) i pozycji ciała w patogenezie.",
        "items": [
            ("Garg P., Singh P.", "2017",
             "Adequate dietary fiber and TONE can help avoid surgery in advanced hemorrhoids",
             "Minerva Gastroenterol Dietol, 63(2):92–96",
             "https://pubmed.ncbi.nlm.nih.gov/28206729/"),
            ("Sikirov D.", "2003",
             "Comparison of straining during defecation in three positions",
             "Dig Dis Sci, 48(7):1201–1205",
             "https://pubmed.ncbi.nlm.nih.gov/12870773/"),
            ("Johanson J.F., Sonnenberg A.", "1990",
             "The prevalence of hemorrhoids and chronic constipation — epidemiologic study",
             "Gastroenterology, 98(2):380–386",
             "https://pubmed.ncbi.nlm.nih.gov/2295392/"),
        ],
    },
    {
        "title": "Aktywność fizyczna i siedzący tryb życia",
        "intro": "Wpływ ruchu na motorykę jelit i czynniki ryzyka choroby hemoroidalnej.",
        "items": [
            ("Riss S. et al.", "2012",
             "The prevalence of hemorrhoids in adults",
             "Int J Colorectal Dis, 27(2):215–220",
             "https://pubmed.ncbi.nlm.nih.gov/21932016/"),
            ("Peery A.F. et al.", "2015",
             "Risk factors for hemorrhoids on screening colonoscopy",
             "PLoS ONE, 10(9):e0139100",
             "https://pubmed.ncbi.nlm.nih.gov/26406337/"),
            ("De Schryver A.M. et al.", "2005",
             "Effects of regular physical activity on defecation pattern in chronic constipation",
             "Scand J Gastroenterol, 40(4):422–429",
             "https://pubmed.ncbi.nlm.nih.gov/16028436/"),
        ],
    },
    {
        "title": "Czynniki ryzyka — ciąża, wiek, masa ciała",
        "intro": "Modyfikowalne i niemodyfikowalne czynniki ryzyka z badań populacyjnych.",
        "items": [
            ("Poskus T. et al.", "2014",
             "Haemorrhoids and anal fissures during pregnancy and after childbirth — cohort study",
             "BJOG, 121(13):1666–1671",
             "https://pubmed.ncbi.nlm.nih.gov/24810254/"),
            ("Lohsiriwat V.", "2012",
             "Hemorrhoids: from basic pathophysiology to clinical management",
             "World J Gastroenterol, 18(17):2009–2017",
             "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3342598/"),
        ],
    },
    {
        "title": "Diagnostyka i kiedy do lekarza",
        "intro": "Zasady różnicowania krwawień z odbytu i wskazania do oceny specjalistycznej.",
        "items": [
            ("Rex D.K. et al.", "2017",
             "Colorectal Cancer Screening: Recommendations from U.S. Multi-Society Task Force",
             "Gastroenterology, 153(1):307–323",
             "https://pubmed.ncbi.nlm.nih.gov/28600072/"),
            ("Wilkins T. et al.", "2013",
             "Diagnosis and management of acute diverticulitis",
             "Am Fam Physician, 87(9):612–620",
             "https://pubmed.ncbi.nlm.nih.gov/23668524/"),
        ],
    },
    {
        "title": "Leczenie laserowe (LHP) i małoinwazyjne",
        "intro": "Dowody skuteczności i bezpieczeństwa LHP w porównaniu z metodami klasycznymi.",
        "items": [
            ("Naderan M. et al.", "2017",
             "RCT: Laser Intra-Hemorrhoidal Coagulation vs Milligan-Morgan Hemorrhoidectomy",
             "J Invest Surg, 30(5):325–331",
             "https://pubmed.ncbi.nlm.nih.gov/27922290/"),
            ("Maloku H. et al.", "2014",
             "Laser Hemorrhoidoplasty vs Open Surgical Hemorrhoidectomy (3rd–4th degree)",
             "Acta Inform Med, 22(6):365–367",
             "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4315629/"),
            ("Brusciano L. et al.", "2020",
             "Postoperative Discomfort and Pain: Laser vs Conventional Hemorrhoidectomy",
             "Updates Surg, 72(3):851–857",
             "https://pubmed.ncbi.nlm.nih.gov/32086781/"),
        ],
    },
]


# ---------------------------------------------------------------------------
# Build flowables
# ---------------------------------------------------------------------------
def build_pillars_table() -> Table:
    rows = [[Paragraph(f"<b>{name}</b>", BODY), Paragraph(detail, BODY_SMALL)] for name, detail in PILLARS]
    t = Table(rows, colWidths=[55 * mm, 110 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def build_day_table(days: list[tuple[str, str, str]]) -> Table:
    """Day no | title | task | □ done."""
    header = [
        Paragraph("<b>Dzień</b>", BODY_SMALL),
        Paragraph("<b>Cel dnia</b>", BODY_SMALL),
        Paragraph("<b>Zadanie</b>", BODY_SMALL),
        Paragraph("<b>✓</b>", BODY_SMALL),
    ]
    rows = [header]
    for d, title, task in days:
        rows.append([
            Paragraph(f"<b>{d}</b>", BODY),
            Paragraph(title, BODY),
            Paragraph(task, BODY_SMALL),
            Paragraph("☐", BODY),
        ])
    t = Table(rows, colWidths=[18 * mm, 42 * mm, 96 * mm, 9 * mm], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), GOLD),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (3, 0), (3, -1), "CENTER"),
    ]
    # Subtle band between weeks (after row 7 which is day 7)
    style.append(("LINEABOVE", (0, 8), (-1, 8), 1.0, GOLD))
    # Alternate row colors
    for i in range(1, len(rows)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), HexColor("#fbf6e6")))
    t.setStyle(TableStyle(style))
    return t


def build_red_flags() -> Table:
    rows = [[Paragraph("⚠  <b>Czerwone flagi — pilnie do lekarza</b>", BODY)]]
    for f in RED_FLAGS:
        rows.append([Paragraph(f"•  {f}", BODY_SMALL)])
    t = Table(rows, colWidths=[165 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DESTRUCTIVE),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (-1, -1), HexColor("#fdecea")),
        ("BOX", (0, 0), (-1, -1), 0.6, DESTRUCTIVE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def build_bibliography() -> list:
    """Last page: full EBM bibliography with clickable links."""
    flowables = [
        Paragraph("Bibliografia EBM", EYEBROW),
        Paragraph("Źródła zaleceń (8 kategorii · 22 referencje)", H1),
        Paragraph(
            "Każdy element 14-dniowego planu jest poparty recenzowanymi badaniami i wytycznymi "
            "ASCRS / ESCP. Linki prowadzą do PubMed lub stron czasopism.",
            LEAD,
        ),
    ]
    for cat in CATEGORIES:
        block = [
            Paragraph(cat["title"], CAT_TITLE),
            Paragraph(f"<i>{cat['intro']}</i>", BODY_SMALL),
            Spacer(1, 4),
        ]
        for authors, year, title, journal, url in cat["items"]:
            short_url = url.replace("https://", "").replace("http://", "")
            if len(short_url) > 70:
                short_url = short_url[:67] + "…"
            block.append(Paragraph(f"{authors} ({year}).", BIB_AUTH))
            block.append(Paragraph(
                f"{title}. <i>{journal}</i>.<br/>"
                f'<link href="{url}" color="#7a6a26"><u>{short_url}</u></link>',
                BIB_BODY,
            ))
        flowables.append(KeepTogether(block))
    flowables.append(Paragraph(
        "Bibliografia ma charakter edukacyjny i nie zastępuje konsultacji lekarskiej. "
        "Aktualizacja: kwiecień 2026  ·  CML — Centrum Medycyny Laserowej  ·  mcml.pl",
        DISCLAIMER,
    ))
    return flowables


def build_pdf() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    doc = BaseDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=24 * mm,
        bottomMargin=22 * mm,
        title="Checklista profilaktyki hemoroidów — 14-dniowy plan | CML",
        author="CML — Centrum Medycyny Laserowej",
        subject="Profilaktyka choroby hemoroidalnej — plan 14-dniowy + bibliografia EBM",
        keywords="hemoroidy, profilaktyka, EBM, ASCRS, ESCP, LHP, CML",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=draw_chrome)])

    story: list = []

    # --- Page 1+: 14-day plan ---
    story.append(Paragraph("Świadomy pacjent · profilaktyka EBM", EYEBROW))
    story.append(Paragraph("Checklista profilaktyki hemoroidów", H1))
    story.append(Paragraph(
        "14-dniowy plan codziennych nawyków oparty o wytyczne ASCRS i ESCP. "
        "Wykonaj jedno małe zadanie dziennie — po dwóch tygodniach masz utrwalone "
        "4 filary profilaktyki.",
        LEAD,
    ))

    story.append(Paragraph("4 filary profilaktyki", H2))
    story.append(build_pillars_table())
    story.append(Spacer(1, 14))

    story.append(Paragraph("Plan 14-dniowy", H2))
    story.append(Paragraph(
        "Tydzień 1 — wdrożenie nawyków · Tydzień 2 — utrwalenie i ocena objawów. "
        "Zaznaczaj kolumnę ✓ codziennie.",
        BODY_SMALL,
    ))
    story.append(Spacer(1, 6))
    story.append(build_day_table(DAYS))
    story.append(Spacer(1, 14))

    story.append(build_red_flags())

    # --- Last page: bibliography ---
    story.append(PageBreak())
    story.extend(build_bibliography())

    doc.build(story)
    print(f"OK  →  {OUT_PATH}  ({OUT_PATH.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    build_pdf()
