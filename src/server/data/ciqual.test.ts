import { describe, expect, it } from "vitest";
import { decodeXml, mappingMatches, parseAlim, parseCiqualValue, parseCompo, suggestCiqualMatches } from "./ciqual";

// Fixture in the Ciqual XML format; the values are made up for the test.
const ALIM = `<?xml version="1.0" encoding="windows-1252"?>
<TABLE>
<ALIM>
<alim_code> 36018 </alim_code>
<alim_nom_fr> Poulet, filet, sans peau, cru </alim_nom_fr>
</ALIM>
</TABLE>`;

const COMPO = `<TABLE>
<COMPO><alim_code> 36018 </alim_code><const_code> 328 </const_code><teneur> 121 </teneur></COMPO>
<COMPO><alim_code> 36018 </alim_code><const_code> 25000 </const_code><teneur> 23,2 </teneur></COMPO>
<COMPO><alim_code> 36018 </alim_code><const_code> 34100 </const_code><teneur> traces </teneur></COMPO>
<COMPO><alim_code> 36018 </alim_code><const_code> 32000 </const_code><teneur> &lt; 0,5 </teneur></COMPO>
<COMPO><alim_code> 36018 </alim_code><const_code> 99999 </const_code><teneur> 1 </teneur></COMPO>
</TABLE>`;

describe("Ciqual parsing", () => {
  it("parses values without inventing anything", () => {
    expect(parseCiqualValue("23,2")).toBe(23.2);
    expect(parseCiqualValue("traces")).toBe(0);
    expect(parseCiqualValue("< 0,5")).toBeNull();
    expect(parseCiqualValue("-")).toBeNull();
  });

  it("parses foods and compositions", () => {
    expect(parseAlim(ALIM)).toEqual([{ code: "36018", nameFr: "Poulet, filet, sans peau, cru" }]);
    const c = parseCompo(COMPO).get("36018");
    expect(c?.energyKcal).toBe(121);
    expect(c?.proteinG).toBe(23.2);
    expect(c?.fiberG).toBe(0);
    expect(c?.sugarsG).toBeNull();
    expect(c?.fatG).toBeNull();
  });

  it("decodes windows-1252", () => {
    const bytes = new Uint8Array([...new TextEncoder().encode('<?xml version="1.0" encoding="windows-1252"?><a>'), 0xe9, ...new TextEncoder().encode("</a>")]);
    expect(decodeXml(bytes)).toContain("<a>é</a>");
  });
});

describe("Ciqual suggestions", () => {
  const foods = [
    { code: "1", nameFr: "Poulet, filet, sans peau, cru" },
    { code: "2", nameFr: "Poulet, filet, sans peau, rôti" },
    { code: "3", nameFr: "Blanquette de veau, plat préparé" },
    { code: "4", nameFr: "Concombre, pulpe et peau, cru" },
  ];

  it("suggests the closest raw food first, and never links by itself", () => {
    expect(suggestCiqualMatches("Blanc de poulet", foods)[0].code).toBe("1");
    expect(suggestCiqualMatches("Concombre", foods).map((f) => f.code)).toEqual(["4"]);
    expect(suggestCiqualMatches("Durian", foods)).toEqual([]);
  });

  it("refuses a mapping whose checked name no longer matches the table", () => {
    expect(mappingMatches({ code: "1", name: "Poulet, filet, sans peau, cru" }, foods[0])).toBe(true);
    expect(mappingMatches({ code: "1", name: "Poulet, cuisse, crue" }, foods[0])).toBe(false);
    expect(mappingMatches({ code: "9", name: "x" }, undefined)).toBe(false);
  });
});
