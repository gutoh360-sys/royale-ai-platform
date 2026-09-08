import { describe, it, expect } from "vitest";
import { parsePeriod, PERIOD_OPTIONS, periodToDays, formatPeriodLabel } from "@/lib/period";

describe("parsePeriod", () => {
  it("parses valid periods", () => {
    expect(parsePeriod("today")).toBe("today");
    expect(parsePeriod("7d")).toBe("7d");
    expect(parsePeriod("30d")).toBe("30d");
    expect(parsePeriod("90d")).toBe("90d");
    expect(parsePeriod("12m")).toBe("12m");
  });

  it("defaults to 30d for invalid", () => {
    expect(parsePeriod("invalid")).toBe("30d");
    expect(parsePeriod("")).toBe("30d");
  });
});

describe("periodToDays", () => {
  it("converts correctly", () => {
    expect(periodToDays("today")).toBe(1);
    expect(periodToDays("7d")).toBe(7);
    expect(periodToDays("30d")).toBe(30);
    expect(periodToDays("90d")).toBe(90);
    expect(periodToDays("12m")).toBe(365);
  });
});

describe("formatPeriodLabel", () => {
  it("formats labels", () => {
    expect(formatPeriodLabel("today")).toBe("Hoje");
    expect(formatPeriodLabel("7d")).toBe("7 dias");
    expect(formatPeriodLabel("30d")).toBe("30 dias");
    expect(formatPeriodLabel("90d")).toBe("90 dias");
    expect(formatPeriodLabel("12m")).toBe("12 meses");
  });
});

describe("PERIOD_OPTIONS", () => {
  it("has 5 options", () => {
    expect(PERIOD_OPTIONS).toHaveLength(5);
  });
});
