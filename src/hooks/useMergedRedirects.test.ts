/**
 * Test czystej funkcji mergeRedirects — DB ma pierwszeństwo per `from`.
 */
import { describe, expect, it } from "vitest";
import { mergeRedirects } from "./useMergedRedirects";

describe("mergeRedirects", () => {
  const code = [
    { from: "/a", to: "/code-a" },
    { from: "/b", to: "/code-b", reason: "from code" },
  ];

  it("zachowuje wpisy z kodu gdy DB jest puste", () => {
    const out = mergeRedirects(code, []);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.origin === "code")).toBe(true);
  });

  it("DB nadpisuje kod (oznacza jako db-override)", () => {
    const out = mergeRedirects(code, [
      { id: "x", from_path: "/a", to_path: "/db-a", reason: "DB win" },
    ]);
    const a = out.find((r) => r.from === "/a")!;
    expect(a.to).toBe("/db-a");
    expect(a.origin).toBe("db-override");
    expect(a.dbId).toBe("x");
    // /b zostaje z kodu
    expect(out.find((r) => r.from === "/b")?.origin).toBe("code");
  });

  it("nowy wpis tylko-w-DB ma origin='db'", () => {
    const out = mergeRedirects(code, [
      { id: "y", from_path: "/c", to_path: "/db-c", reason: null },
    ]);
    const c = out.find((r) => r.from === "/c")!;
    expect(c.origin).toBe("db");
    expect(c.reason).toBeUndefined();
  });

  it("output jest posortowany alfabetycznie po `from`", () => {
    const out = mergeRedirects(code, [
      { id: "1", from_path: "/zzz", to_path: "/x", reason: null },
    ]);
    expect(out.map((r) => r.from)).toEqual(["/a", "/b", "/zzz"]);
  });
});
