declare module "./scripts/validate-ebm-anchors.mjs" {
  export function validateEbmAnchors(): {
    validIds: string[];
    refsCount: number;
    orphans: Array<{ id: string; line: number }>;
  };
}
