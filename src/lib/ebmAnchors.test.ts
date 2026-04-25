import { describe, it, expect } from "vitest";
// @ts-expect-error — plain Node ESM script without type declarations
import { validateEbmAnchors } from "../../scripts/validate-ebm-anchors.mjs";

describe("EBM anchors contract", () => {
  it("every ebmId in RiskFactorsAccordion has a matching category in EBMSourcesSection", () => {
    const result = validateEbmAnchors() as {
      validIds: string[];
      refsCount: number;
      orphans: Array<{ id: string; line: number }>;
    };

    expect(result.validIds.length).toBeGreaterThan(0);
    expect(result.refsCount).toBeGreaterThan(0);

    if (result.orphans.length > 0) {
      const formatted = result.orphans
        .map((o) => `  • "${o.id}" at RiskFactorsAccordion.tsx:${o.line}`)
        .join("\n");
      throw new Error(
        `Found ${result.orphans.length} orphan ebmId reference(s) — broken deep-links to /dla-pacjenta/ebm-hemoroidy#ebm-<id>:\n${formatted}\n\n` +
          `Valid category ids: ${result.validIds.join(", ")}`,
      );
    }

    expect(result.orphans).toEqual([]);
  });
});
