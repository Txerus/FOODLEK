import { describe, expect, it } from "vitest";
import { toCandidates } from "./pexels";

const photo = (over: Record<string, unknown>) => ({
  id: 1,
  width: 4000,
  height: 2667,
  url: "https://www.pexels.com/photo/curry-1/",
  photographer: "Jane Doe",
  alt: "Chicken curry in a bowl",
  src: { large2x: "https://images.pexels.com/photos/1/a.jpeg?w=1880", large: "https://images.pexels.com/photos/1/a.jpeg?w=940" },
  ...over,
});

describe("Pexels candidates", () => {
  it("keeps large landscape photos with their credit", () => {
    const c = toCandidates({ photos: [photo({}), photo({ id: 2, width: 800, height: 600 }), photo({ id: 3, width: 2000, height: 3000 })] }, "Curry");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ credit: "Photo : Jane Doe / Pexels", sourceUrl: "https://www.pexels.com/photo/curry-1/", alt: "Chicken curry in a bowl" });
  });

  it("refuses images hosted elsewhere", () => {
    const c = toCandidates({ photos: [photo({ src: { large2x: "https://evil.example/a.jpg", large: "https://evil.example/a.jpg" } })] }, "x");
    expect(c).toHaveLength(0);
  });
});
