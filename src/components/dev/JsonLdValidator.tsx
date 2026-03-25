import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, X, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface ValidationResult {
  type: string;
  raw: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  MedicalWebPage: ["name", "description", "url", "author"],
  MedicalProcedure: ["name", "description", "procedureType", "url"],
  MedicalBusiness: ["name", "address", "url"],
  MedicalClinic: ["name", "address"],
  Physician: ["name"],
  Article: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  WebPage: ["name", "url"],
  FAQPage: ["mainEntity"],
  LocalBusiness: ["name", "address"],
};

const RECOMMENDED_FIELDS: Record<string, string[]> = {
  MedicalWebPage: ["specialty", "medicalAudience", "lastReviewed", "publisher"],
  MedicalProcedure: ["bodyLocation", "preparation", "followup", "howPerformed"],
  MedicalBusiness: ["openingHours", "telephone", "geo"],
  Article: ["image", "description", "publisher"],
  FAQPage: ["name", "url"],
};

function validateSchema(schema: Record<string, unknown>): ValidationResult {
  const type = (schema["@type"] as string) || "Unknown";
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema["@context"]) {
    errors.push("Brak @context (powinien być \"https://schema.org\")");
  } else if (schema["@context"] !== "https://schema.org") {
    warnings.push(`@context = "${schema["@context"]}" — oczekiwano "https://schema.org"`);
  }

  if (!schema["@type"]) {
    errors.push("Brak @type");
  }

  const required = REQUIRED_FIELDS[type] || [];
  for (const field of required) {
    if (!schema[field]) {
      errors.push(`Brak wymaganego pola: ${field}`);
    }
  }

  const recommended = RECOMMENDED_FIELDS[type] || [];
  for (const field of recommended) {
    if (!schema[field]) {
      warnings.push(`Zalecane pole brakuje: ${field}`);
    }
  }

  // Check URL format
  if (schema["url"] && typeof schema["url"] === "string") {
    if (!schema["url"].startsWith("http")) {
      errors.push(`URL nie zaczyna się od http(s): "${schema["url"]}"`);
    }
  }

  // FAQPage deep validation
  if (type === "FAQPage") {
    const mainEntity = schema["mainEntity"];
    if (mainEntity) {
      if (!Array.isArray(mainEntity)) {
        errors.push("mainEntity powinno być tablicą obiektów Question");
      } else {
        if (mainEntity.length === 0) {
          warnings.push("mainEntity jest pustą tablicą — brak pytań");
        }
        mainEntity.forEach((item: Record<string, unknown>, idx: number) => {
          const qType = item["@type"];
          if (qType !== "Question") {
            errors.push(`mainEntity[${idx}]: @type = "${qType}" — oczekiwano "Question"`);
          }
          if (!item["name"]) {
            errors.push(`mainEntity[${idx}]: brak pola "name" (treść pytania)`);
          }
          const answer = item["acceptedAnswer"] as Record<string, unknown> | undefined;
          if (!answer) {
            errors.push(`mainEntity[${idx}]: brak pola "acceptedAnswer"`);
          } else {
            if (answer["@type"] !== "Answer") {
              errors.push(`mainEntity[${idx}].acceptedAnswer: @type = "${answer["@type"]}" — oczekiwano "Answer"`);
            }
            if (!answer["text"]) {
              errors.push(`mainEntity[${idx}].acceptedAnswer: brak pola "text"`);
            }
          }
        });
        if (mainEntity.length > 0) {
          warnings.push(`FAQPage zawiera ${mainEntity.length} pytań — Google wspiera maks. ~10 w rich results`);
        }
      }
    }
  }

  return { type, raw: schema, errors, warnings, valid: errors.length === 0 };
}

function SchemaCard({ result, index }: { result: ValidationResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const StatusIcon = result.errors.length > 0
    ? XCircle
    : result.warnings.length > 0
      ? AlertTriangle
      : CheckCircle2;

  const statusColor = result.errors.length > 0
    ? "text-red-400"
    : result.warnings.length > 0
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
        <span className="text-xs font-mono font-semibold text-white/90 flex-1 truncate">
          {index + 1}. {result.type}
        </span>
        <span className="text-[10px] text-white/40 shrink-0">
          {result.errors.length}E / {result.warnings.length}W
        </span>
        {expanded ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {result.errors.map((e, i) => (
                <div key={`e-${i}`} className="flex items-start gap-1.5 text-[11px]">
                  <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-red-300">{e}</span>
                </div>
              ))}
              {result.warnings.map((w, i) => (
                <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                  <span className="text-yellow-300">{w}</span>
                </div>
              ))}
              {result.errors.length === 0 && result.warnings.length === 0 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  <span className="text-green-300">Schemat poprawny ✓</span>
                </div>
              )}
              <details className="mt-1">
                <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">
                  Pokaż surowy JSON
                </summary>
                <pre className="mt-1 text-[10px] text-white/50 bg-black/30 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const JsonLdValidator = () => {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);

  const scan = useCallback(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const parsed: ValidationResult[] = [];
    scripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        if (Array.isArray(data)) {
          data.forEach((item) => parsed.push(validateSchema(item)));
        } else {
          parsed.push(validateSchema(data));
        }
      } catch {
        parsed.push({
          type: "Parse Error",
          raw: {},
          errors: ["Nieprawidłowy JSON w tagu <script>"],
          warnings: [],
          valid: false,
        });
      }
    });
    setResults(parsed);
  }, []);

  useEffect(() => {
    if (open) scan();
  }, [open, scan]);

  // Re-scan on route changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (open) scan();
    });
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open, scan]);

  // Only show in development
  if (import.meta.env.PROD) return null;

  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnings.length, 0);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 left-4 z-[9999] w-10 h-10 rounded-full bg-gray-900 border border-white/20 shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="JSON-LD Validator"
      >
        <Bug className="w-4 h-4 text-white/70 group-hover:text-white" />
        {results.length > 0 && totalErrors > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            {totalErrors}
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-16 left-4 z-[9999] w-80 max-h-[70vh] bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bug className="w-3.5 h-3.5 text-white/60" />
                <span className="text-xs font-semibold text-white/90">JSON-LD Validator</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={scan}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="Skanuj ponownie"
                >
                  <RefreshCw className="w-3 h-3 text-white/50" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-3 h-3 text-white/50" />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-3 text-[11px]">
              <span className="text-white/50">
                Znaleziono: <strong className="text-white/80">{results.length}</strong> schemat(ów)
              </span>
              {totalErrors > 0 && (
                <span className="text-red-400">{totalErrors} błąd(ów)</span>
              )}
              {totalWarnings > 0 && (
                <span className="text-yellow-400">{totalWarnings} ostrzeż.</span>
              )}
              {totalErrors === 0 && totalWarnings === 0 && results.length > 0 && (
                <span className="text-green-400">Wszystko OK ✓</span>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {results.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">
                  Brak schematów JSON-LD na tej stronie
                </div>
              ) : (
                results.map((r, i) => <SchemaCard key={i} result={r} index={i} />)
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-white/25 text-center">
              Widoczny tylko w trybie DEV
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default JsonLdValidator;
