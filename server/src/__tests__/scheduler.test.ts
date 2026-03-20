import { describe, it, expect } from "vitest";

// Test the cron matching logic directly
function matchField(field: string, value: number): boolean {
  if (field === "*") return true;
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }
  if (field.includes(",")) {
    return field.split(",").map(Number).includes(value);
  }
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    return step > 0 && value % step === 0;
  }
  return parseInt(field) === value;
}

describe("cron field matching", () => {
  it("matches wildcard", () => {
    expect(matchField("*", 0)).toBe(true);
    expect(matchField("*", 59)).toBe(true);
  });

  it("matches exact value", () => {
    expect(matchField("9", 9)).toBe(true);
    expect(matchField("9", 10)).toBe(false);
  });

  it("matches range", () => {
    expect(matchField("1-5", 1)).toBe(true);
    expect(matchField("1-5", 3)).toBe(true);
    expect(matchField("1-5", 5)).toBe(true);
    expect(matchField("1-5", 0)).toBe(false);
    expect(matchField("1-5", 6)).toBe(false);
  });

  it("matches list", () => {
    expect(matchField("1,15", 1)).toBe(true);
    expect(matchField("1,15", 15)).toBe(true);
    expect(matchField("1,15", 10)).toBe(false);
  });

  it("matches step values", () => {
    expect(matchField("*/5", 0)).toBe(true);
    expect(matchField("*/5", 5)).toBe(true);
    expect(matchField("*/5", 10)).toBe(true);
    expect(matchField("*/5", 3)).toBe(false);
    expect(matchField("*/15", 30)).toBe(true);
    expect(matchField("*/15", 7)).toBe(false);
  });
});
