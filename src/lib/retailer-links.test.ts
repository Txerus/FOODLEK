import { describe, expect, it } from "vitest";
import { RETAILER_LINKS, retailerLink, searchQueryFor } from "./retailer-links";

describe("retailer links", () => {
  it("drops parenthesised precisions from the search query", () => {
    expect(searchQueryFor("Pois chiches (conserve)")).toBe("Pois chiches");
    expect(searchQueryFor("Riz long")).toBe("Riz long");
  });

  it("encodes the query in every retailer URL", () => {
    for (const r of RETAILER_LINKS) {
      const url = r.search("crème fraîche & œufs");
      expect(url.startsWith("https://")).toBe(true);
      expect(url).not.toContain(" ");
      expect(url).toContain(encodeURIComponent("crème fraîche & œufs"));
    }
  });

  it("returns null for an unknown retailer", () => {
    expect(retailerLink("none")).toBeNull();
    expect(retailerLink("carrefour")?.name).toBe("Carrefour");
  });
});
