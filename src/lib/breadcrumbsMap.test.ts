import { describe, it, expect } from "vitest";
import { resolveBreadcrumbs, BREADCRUMBS_MAP } from "./breadcrumbsMap";

describe("resolveBreadcrumbs", () => {
  it("returns null for the home path '/'", () => {
    expect(resolveBreadcrumbs("/")).toBeNull();
  });

  it("returns 3 items for /leczenie/lhp starting with 'Zabieg' (unlinked section)", () => {
    const trail = resolveBreadcrumbs("/leczenie/lhp");
    expect(trail).not.toBeNull();
    expect(trail).toHaveLength(3);
    expect(trail![0]).toEqual({ label: "Zabieg" });
    expect(trail![0].href).toBeUndefined();
    expect(trail![1]).toEqual({ label: "Proktologia", href: "/leczenie/proktologia" });
    expect(trail![2]).toEqual({ label: "Hemoroidy – LHP" });
    expect(trail![2].href).toBeUndefined();
  });

  it("returns 4 items for /dla-pacjenta/zalecenia-po-evlt with phlebology trail", () => {
    const trail = resolveBreadcrumbs("/dla-pacjenta/zalecenia-po-evlt");
    expect(trail).not.toBeNull();
    expect(trail).toHaveLength(4);
    expect(trail![0]).toEqual({ label: "Zabieg" });
    expect(trail![1]).toEqual({ label: "Flebologia", href: "/leczenie/flebologia" });
    expect(trail![2]).toEqual({ label: "EVLT", href: "/leczenie/evlt" });
    expect(trail![3]).toEqual({ label: "Zalecenia po zabiegu" });
    expect(trail![3].href).toBeUndefined();
  });

  it("returns null for admin and unsubscribe paths", () => {
    expect(resolveBreadcrumbs("/admin")).toBeNull();
    expect(resolveBreadcrumbs("/admin/bookings")).toBeNull();
    expect(resolveBreadcrumbs("/admin/dashboard")).toBeNull();
    expect(resolveBreadcrumbs("/unsubscribe")).toBeNull();
    expect(resolveBreadcrumbs("/unsubscribe/abc123")).toBeNull();
  });

  it("normalizes trailing slashes", () => {
    const a = resolveBreadcrumbs("/leczenie/lhp");
    const b = resolveBreadcrumbs("/leczenie/lhp/");
    expect(b).toEqual(a);
  });

  it("returns null for unmapped/dynamic paths", () => {
    expect(resolveBreadcrumbs("/blog/some-dynamic-slug")).toBeNull();
    expect(resolveBreadcrumbs("/nonexistent-page")).toBeNull();
  });

  it("BREADCRUMBS_MAP exposes the same trail as resolveBreadcrumbs for direct lookups", () => {
    expect(resolveBreadcrumbs("/cennik")).toEqual(BREADCRUMBS_MAP["/cennik"]);
  });
});
