import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  trackEbmClick,
  readEbmAnalytics,
  resetEbmAnalytics,
} from "./ebmAnalytics";

describe("ebmAnalytics", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    resetEbmAnalytics();
    vi.restoreAllMocks();
  });

  it("starts with empty state", () => {
    const s = readEbmAnalytics();
    expect(s.totals.external_source).toBe(0);
    expect(s.totals.internal_anchor).toBe(0);
    expect(s.recent).toHaveLength(0);
  });

  it("aggregates external source clicks per host and source", () => {
    trackEbmClick({
      url: "https://pubmed.ncbi.nlm.nih.gov/12345/",
      label: "Test paper",
      source: "RiskFactorsAccordion",
      ebmId: "fiber",
    });
    trackEbmClick({
      url: "https://www.cochranelibrary.com/cdsr/x",
      label: "Cochrane review",
      source: "RiskFactorsAccordion",
      ebmId: "fiber",
    });

    const s = readEbmAnalytics();
    expect(s.totals.external_source).toBe(2);
    expect(s.perHost["pubmed.ncbi.nlm.nih.gov"]).toBe(1);
    expect(s.perHost["www.cochranelibrary.com"]).toBe(1);
    expect(s.perEbmId["fiber"]).toBe(2);
    expect(s.perSource["RiskFactorsAccordion"]).toBe(2);
    expect(s.recent).toHaveLength(2);
    // newest first
    expect(s.recent[0].url).toBe("https://www.cochranelibrary.com/cdsr/x");
  });

  it("classifies internal anchors automatically", () => {
    trackEbmClick({
      url: "/dla-pacjenta/ebm-hemoroidy#ebm-fiber",
      label: "kategoria fiber",
      source: "RiskFactorsAccordion",
      ebmId: "fiber",
    });
    const s = readEbmAnalytics();
    expect(s.totals.internal_anchor).toBe(1);
    expect(s.totals.external_source).toBe(0);
  });

  it("pushes to window.dataLayer when present", () => {
    type W = Window & { dataLayer?: Array<Record<string, unknown>> };
    (window as W).dataLayer = [];
    trackEbmClick({
      url: "https://pubmed.ncbi.nlm.nih.gov/1/",
      label: "x",
      source: "RedFlagsFAQ",
    });
    const dl = (window as W).dataLayer!;
    expect(dl).toHaveLength(1);
    expect(dl[0].event).toBe("ebm_click");
    expect(dl[0].ebm_host).toBe("pubmed.ncbi.nlm.nih.gov");
    delete (window as W).dataLayer;
  });

  it("dispatches CustomEvent on window", () => {
    const handler = vi.fn();
    window.addEventListener("cml:ebm-click", handler as EventListener);
    trackEbmClick({
      url: "https://pubmed.ncbi.nlm.nih.gov/1/",
      label: "x",
      source: "RedFlagsFAQ",
    });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("cml:ebm-click", handler as EventListener);
  });

  it("caps recent events at 200", () => {
    for (let i = 0; i < 250; i++) {
      trackEbmClick({
        url: `https://pubmed.ncbi.nlm.nih.gov/${i}/`,
        label: `paper ${i}`,
        source: "RiskFactorsAccordion",
      });
    }
    const s = readEbmAnalytics();
    expect(s.recent.length).toBe(200);
    expect(s.totals.external_source).toBe(250);
  });
});
