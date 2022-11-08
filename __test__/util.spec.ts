import { getDayFormat } from "../src/util";

describe("test suite", () => {
  test("getDayFormat test", () => {
    expect(getDayFormat(new Date(2020, 12 - 1, 1))).toBe("2020-12-1");
  });
});
