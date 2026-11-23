import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/items";
import { getActiveSets, ITEM_SETS } from "../src/sets";

describe("B4 item sets", () => {
  it.each(ITEM_SETS)("activates $name once at two or more matching items", (set) => {
    const members = CATALOG.filter((item) => item.setId === set.id).map((item) => item.id);
    expect(new Set(members).size).toBeGreaterThanOrEqual(3);
    expect(getActiveSets(members.slice(0, 1))).toEqual([]);
    expect(getActiveSets(members.slice(0, 2))).toEqual([set]);
    expect(getActiveSets(members.slice(0, 3))).toEqual([set]);
  });

  it("counts two equipped copies of the same item", () => {
    expect(getActiveSets(["ember-torch", "ember-torch"])).toMatchObject([{ id: "fire" }]);
  });

  it("counts the two sets independently and ignores items without a set", () => {
    const mixed = ["ember-torch", "pot-lid", "bitter-root"];
    expect(getActiveSets(mixed)).toEqual([]);
    expect(getActiveSets([...mixed, "cinder-blade", "oak-buckler"]).map((set) => set.id).sort())
      .toEqual(["fire", "guard"]);
  });
});
