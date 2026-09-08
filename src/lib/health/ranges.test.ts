import { test, expect } from "vitest";
import {
  bpBand, glucoseBand, cholesterolBand, ldlBand, hdlBand, triglyceridesBand,
} from "@/lib/health/ranges";

test("blood pressure bands at the AHA edges", () => {
  expect(bpBand(118, 76)).toMatchObject({ label: "Normal", tone: "good" });
  expect(bpBand(120, 79)).toMatchObject({ label: "Elevated", tone: "watch" });
  expect(bpBand(129, 79).label).toBe("Elevated");
  expect(bpBand(130, 79)).toMatchObject({ label: "High (stage 1)", tone: "high" });
  expect(bpBand(125, 80).label).toBe("High (stage 1)");
  expect(bpBand(140, 85).label).toBe("High (stage 2)");
  expect(bpBand(120, 90).label).toBe("High (stage 2)");
  expect(bpBand(181, 100)).toMatchObject({ label: "Very high", tone: "urgent" });
  expect(bpBand(150, 121).tone).toBe("urgent");
  expect(bpBand(181, 100).urgent).toContain("emergency");
});

test("glucose bands depend on context and flag lows", () => {
  expect(glucoseBand(95, "fasting").label).toBe("Normal");
  expect(glucoseBand(100, "fasting")).toMatchObject({ label: "Slightly high", tone: "watch" });
  expect(glucoseBand(126, "fasting")).toMatchObject({ label: "High", tone: "high" });
  expect(glucoseBand(130, "after_meal").label).toBe("Normal");
  expect(glucoseBand(140, "after_meal").label).toBe("Slightly high");
  expect(glucoseBand(200, "random").label).toBe("High");
  expect(glucoseBand(69, "bedtime")).toMatchObject({ label: "Low", tone: "urgent" });
  expect(glucoseBand(300, "fasting")).toMatchObject({ label: "Very high", tone: "urgent" });
});

test("cholesterol bands", () => {
  expect(cholesterolBand(199).label).toBe("Desirable");
  expect(cholesterolBand(200)).toMatchObject({ label: "Borderline", tone: "watch" });
  expect(cholesterolBand(240)).toMatchObject({ label: "High", tone: "high" });
  expect(ldlBand(99).label).toBe("Optimal");
  expect(ldlBand(130).label).toBe("Borderline");
  expect(ldlBand(190).label).toBe("Very high");
  expect(hdlBand(39).tone).toBe("watch");
  expect(hdlBand(60).label).toBe("Protective");
  expect(triglyceridesBand(149).label).toBe("Normal");
  expect(triglyceridesBand(500).label).toBe("Very high");
});
