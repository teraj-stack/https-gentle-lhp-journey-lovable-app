import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_RISK_THRESHOLDS,
  HEMOROIDY_QUIZ_MAX_SCORE,
  RiskThresholds,
  sanitizeRiskThresholds,
} from "@/lib/hemoroidyQuizData";

/**
 * Pacjenckie ustawienia progów kategorii ryzyka quizu hemoroidów.
 *
 * Persystencja: localStorage `cml.hemoroidy.risk-thresholds.v1`.
 * Sync między tabami: natywny `storage` event + custom event `cml:risk-thresholds-updated`
 * (analogicznie do `useDailyDiary` — by zmiana w panelu ustawień natychmiast przeliczyła
 * legendy na wszystkich osadzonych komponentach w tej samej karcie).
 *
 * Walidacja przy każdym zapisie/odczycie przez `sanitizeRiskThresholds` —
 * gwarantuje `0 ≤ lowMax < mediumMax ≤ maxScore-1`, więc 3 strefy są zawsze niepuste.
 */

const STORAGE_KEY = "cml.hemoroidy.risk-thresholds.v1";
const UPDATE_EVENT = "cml:risk-thresholds-updated";

const isBrowser = () => typeof window !== "undefined";

const readStorage = (): RiskThresholds => {
  if (!isBrowser()) return DEFAULT_RISK_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RISK_THRESHOLDS;
    const parsed = JSON.parse(raw);
    return sanitizeRiskThresholds(parsed);
  } catch {
    return DEFAULT_RISK_THRESHOLDS;
  }
};

const writeStorage = (t: RiskThresholds) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch {
    /* quota etc. */
  }
};

export const useRiskThresholds = () => {
  const [thresholds, setThresholds] = useState<RiskThresholds>(() => readStorage());

  useEffect(() => {
    if (!isBrowser()) return;
    const handler = () => setThresholds(readStorage());
    window.addEventListener("storage", handler);
    window.addEventListener(UPDATE_EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(UPDATE_EVENT, handler);
    };
  }, []);

  const update = useCallback((next: Partial<RiskThresholds>) => {
    const merged = sanitizeRiskThresholds({ ...thresholds, ...next });
    writeStorage(merged);
    setThresholds(merged);
  }, [thresholds]);

  const reset = useCallback(() => {
    writeStorage(DEFAULT_RISK_THRESHOLDS);
    setThresholds(DEFAULT_RISK_THRESHOLDS);
  }, []);

  const isCustom =
    thresholds.lowMax !== DEFAULT_RISK_THRESHOLDS.lowMax ||
    thresholds.mediumMax !== DEFAULT_RISK_THRESHOLDS.mediumMax;

  return {
    thresholds,
    update,
    reset,
    isCustom,
    maxScore: HEMOROIDY_QUIZ_MAX_SCORE,
    defaults: DEFAULT_RISK_THRESHOLDS,
  };
};
