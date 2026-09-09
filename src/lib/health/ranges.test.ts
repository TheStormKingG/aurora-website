import { test, expect } from "vitest";
import {
  bpBand, glucoseBand, cholesterolBand, ldlBand, hdlBand, triglyceridesBand, DISCLAIMER,
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

test("bpBand: 180/120 is stage 2, not urgent — urgent starts strictly above either", () => {
  expect(bpBand(119, 79)).toMatchObject({ label: "Normal", tone: "good" });
  expect(bpBand(139, 89)).toMatchObject({ label: "High (stage 1)", tone: "high" });
  expect(bpBand(180, 120)).toMatchObject({ label: "High (stage 2)", tone: "high" });
  expect(bpBand(181, 120).tone).toBe("urgent");
  expect(bpBand(180, 121).tone).toBe("urgent");
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

test("glucoseBand: 70 and 299 are the non-urgent boundaries, for both fasting and non-fasting", () => {
  expect(glucoseBand(70, "fasting")).toMatchObject({ label: "Normal", tone: "good" });
  expect(glucoseBand(70, "random")).toMatchObject({ label: "Normal", tone: "good" });
  expect(glucoseBand(299, "fasting")).toMatchObject({ label: "High", tone: "high" });
  expect(glucoseBand(299, "random")).toMatchObject({ label: "High", tone: "high" });
});

test("glucoseBand: urgent messages are specific to low vs high", () => {
  expect(glucoseBand(65, "fasting").urgent).toContain("fast-acting sugar");
  const high = glucoseBand(320, "fasting").urgent;
  expect(high).toBeDefined();
  expect(high).not.toContain("fast-acting sugar");
  expect(high).not.toBe(glucoseBand(65, "fasting").urgent);
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

test("ldlBand: near optimal and high branches", () => {
  expect(ldlBand(100).label).toBe("Near optimal");
  expect(ldlBand(129).label).toBe("Near optimal");
  expect(ldlBand(160).label).toBe("High");
  expect(ldlBand(189).label).toBe("High");
});

test("hdlBand: normal branch", () => {
  expect(hdlBand(40)).toMatchObject({ label: "Normal", tone: "good" });
  expect(hdlBand(59)).toMatchObject({ label: "Normal", tone: "good" });
});

test("triglyceridesBand: borderline and high branches", () => {
  expect(triglyceridesBand(150).label).toBe("Borderline");
  expect(triglyceridesBand(199).label).toBe("Borderline");
  expect(triglyceridesBand(200).label).toBe("High");
  expect(triglyceridesBand(499).label).toBe("High");
});

test("DISCLAIMER is a non-empty string carrying the not-a-diagnosis notice (spec §10)", () => {
  expect(typeof DISCLAIMER).toBe("string");
  expect(DISCLAIMER.length).toBeGreaterThan(0);
  expect(DISCLAIMER).toContain("not a diagnosis");
});
