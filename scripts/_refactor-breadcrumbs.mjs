#!/usr/bin/env node
/**
 * Refaktoryzator: zamienia wszystkie hardkodowane <Breadcrumbs items=[...]/>
 * na <Breadcrumbs items={BREADCRUMBS_MAP["/path"]} /> używając centralnej mapy.
 *
 * Strategia:
 *   1) Wczytaj BREADCRUMBS_MAP (klucz → trail) przez parsowanie pliku breadcrumbsMap.ts.
 *   2) Dla każdego pliku page: zlokalizuj <Breadcrumbs items={...} ...>, wyciągnij trail,
 *      znajdź pasujący klucz w mapie (głębokie porównanie), zamień na items={BREADCRUMBS_MAP["/path"]}.
 *   3) Dodaj import BREADCRUMBS_MAP jeśli go brak.
 *   4) Pomiń BlogPost.tsx (dynamic slug — nie w mapie) — tam zostawiamy hardkod.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES_DIR = path.join(ROOT, "src/pages");
const MAP_PATH = path.join(ROOT, "src/lib/breadcrumbsMap.ts");

// 1) Załaduj mapę przez import dynamiczny — używamy tsx via vite-node? Najprościej: parsuj eval.
//    Mapa to czysty Record z literałami. Wykorzystam: skompiluję plik do JS przez tsc-like regex (ryzykowne)
//    Lepiej: importuj jako moduł — ale to TS. Użyję tsx CLI jeśli dostępny, inaczej eval.
const mapSource = fs.readFileSync(MAP_PATH, "utf8");

// Wyciągnij stałe top-level: ZABIEG, PROKTOLOGIA, FLEBOLOGIA, GINEKOMASTIA_HUB, WIEDZA, DLA_PACJENTA
const consts = {};
for (const m of mapSource.matchAll(/const (\w+):\s*BreadcrumbItem\s*=\s*({[^}]+});/g)) {
  // eslint-disable-next-line no-eval
  consts[m[1]] = eval(`(${m[2]})`);
}

// Wyciągnij ciało BREADCRUMBS_MAP = { ... };
const mapBodyMatch = mapSource.match(/export const BREADCRUMBS_MAP[^=]*=\s*({[\s\S]*?\n});/);
if (!mapBodyMatch) throw new Error("Cannot find BREADCRUMBS_MAP body");
let mapBody = mapBodyMatch[1];
// Zamień identyfikatory stałych na ich literały JSON
for (const [name, value] of Object.entries(consts)) {
  mapBody = mapBody.replace(new RegExp(`\\b${name}\\b`, "g"), JSON.stringify(value));
}
// Usuń komentarze //…
mapBody = mapBody.replace(/\/\/[^\n]*/g, "");
// eslint-disable-next-line no-eval
const BREADCRUMBS_MAP = eval(`(${mapBody})`);

console.log(`✓ Loaded ${Object.keys(BREADCRUMBS_MAP).length} breadcrumb entries from map.`);

// 2) Pomocnicza: znajdź klucz w mapie pasujący do podanego inline tablicy items
function findKey(items) {
  for (const [key, val] of Object.entries(BREADCRUMBS_MAP)) {
    if (deepEqual(items, val)) return key;
  }
  return null;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

// 3) Parser items= z JSX. Strategia: znajdź "<Breadcrumbs", potem szukaj " items=" + zbalansowane {} po znaku =.
function* findBreadcrumbsUsages(src) {
  const re = /<Breadcrumbs\b/g;
  let m;
  while ((m = re.exec(src))) {
    const tagStart = m.index;
    // Znajdź " items={"
    const propRe = /\sitems=\{/g;
    propRe.lastIndex = tagStart;
    const propMatch = propRe.exec(src);
    if (!propMatch) continue;
    // Sprawdź że propMatch jest WEWNĄTRZ tego samego tagu (przed "/>" lub ">")
    const tagEndIdx = src.indexOf(">", tagStart);
    if (propMatch.index > tagEndIdx && tagEndIdx !== -1) continue;
    const valueStart = propMatch.index + propMatch[0].length; // tuż po "{"
    // Znajdź zbalansowane "}" zaczynając od valueStart
    let depth = 1;
    let i = valueStart;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === "'" || c === '"' || c === "`") {
        // skip string
        const quote = c;
        i++;
        while (i < src.length && src[i] !== quote) {
          if (src[i] === "\\") i++;
          i++;
        }
      }
      i++;
    }
    if (depth !== 0) continue;
    const valueEnd = i - 1; // pozycja "}"
    const valueExpr = src.slice(valueStart, valueEnd).trim();
    yield {
      tagStart,
      propStart: propMatch.index + 1, // pomiń wiodący whitespace
      propEnd: i, // tuż po zamykającym "}"
      valueExpr,
    };
  }
}

// 4) Spróbuj eval wyrażenia tablicy literałów (np. [{ label: "X" }, { label: "Y", href: "/z" }])
function tryEvalArrayLiteral(expr) {
  try {
    // Dopuść tylko proste tablice obiektów z label/href stringami
    if (!/^\s*\[/.test(expr)) return null;
    // Usuń trailing comma którego nie lubi JSON.parse — eval radzi sobie OK
    // eslint-disable-next-line no-eval
    const val = eval(`(${expr})`);
    if (!Array.isArray(val)) return null;
    return val;
  } catch {
    return null;
  }
}

// 5) Refaktor pojedynczego pliku
function refactorFile(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const usages = [...findBreadcrumbsUsages(src)];
  if (usages.length === 0) return { filePath, changes: 0, skipped: "no <Breadcrumbs items=> usages" };

  let newSrc = src;
  const log = [];
  // Edytuj od końca, żeby offsety nie psuły
  for (const u of [...usages].reverse()) {
    const items = tryEvalArrayLiteral(u.valueExpr);
    if (!items) {
      log.push(`  ⚠ skipped — non-literal items expression: ${u.valueExpr.slice(0, 60)}…`);
      continue;
    }
    const key = findKey(items);
    if (!key) {
      log.push(`  ⚠ skipped — no map entry matching items: ${JSON.stringify(items)}`);
      continue;
    }
    // Zamień całe items={...}
    const replacement = `items={BREADCRUMBS_MAP["${key}"]}`;
    newSrc = newSrc.slice(0, u.propStart) + replacement + newSrc.slice(u.propEnd);
    log.push(`  ✓ ${key}`);
  }

  if (newSrc === src) return { filePath, changes: 0, log };

  // Dodaj import BREADCRUMBS_MAP jeśli brak
  if (!/from\s+["']@\/lib\/breadcrumbsMap["']/.test(newSrc)) {
    // Wstaw zaraz po imporcie Breadcrumbs (musi istnieć skoro były usages)
    const breadcrumbImportRe = /(import\s+Breadcrumbs[^;]+;\s*)/;
    if (breadcrumbImportRe.test(newSrc)) {
      newSrc = newSrc.replace(
        breadcrumbImportRe,
        `$1import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";\n`
      );
    } else {
      // Fallback: na początek pliku
      newSrc = `import { BREADCRUMBS_MAP } from "@/lib/breadcrumbsMap";\n` + newSrc;
    }
  }

  fs.writeFileSync(filePath, newSrc);
  return { filePath, changes: usages.length - log.filter((l) => l.includes("skipped")).length, log };
}

// 6) Main
const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".tsx"));
const results = [];
let totalChanges = 0;
let totalSkipped = 0;

for (const f of files) {
  const fp = path.join(PAGES_DIR, f);
  const r = refactorFile(fp);
  if (r.skipped) continue;
  console.log(`\n${path.basename(fp)}`);
  for (const line of r.log || []) {
    console.log(line);
    if (line.includes("skipped")) totalSkipped++;
  }
  totalChanges += r.changes;
  results.push(r);
}

console.log(`\n══════════════════════════════════════`);
console.log(`Files modified: ${results.filter((r) => r.changes > 0).length}`);
console.log(`Total replacements: ${totalChanges}`);
console.log(`Total skipped: ${totalSkipped}`);
console.log(`══════════════════════════════════════`);
