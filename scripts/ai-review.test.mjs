import { describe, expect, it } from "vitest";
import { exitCodeFor, render } from "./ai-review.mjs";

/**
 * The merge gate, proved.
 *
 * Step three of the review pipeline is "critical issues block the merge".
 * That claim is worth exactly as much as the evidence that the gate can
 * actually go red — a gate whose failure path has never run is untested
 * code, and an automated reviewer that always passes looks identical to
 * one that is working.
 *
 * These call the same pure function the CLI's exit code is derived from,
 * so they need no API call, no network and no pull request.
 */

const finding = (severity, over = {}) => ({
  file: "src/app/page.tsx",
  line: 42,
  severity,
  category: "silent-data-loss",
  claim: "The save path reports success when patientId is null.",
  failure_scenario: "Sign in as a patient with no profile row; the toast says saved and no row is written.",
  fix: "Throw when patientId is null instead of falling through to onSaved().",
  ...over,
});

const review = (findings) => ({ findings, summary: "A change. Some risk." });

describe("merge gate", () => {
  it("blocks on a critical finding", () => {
    expect(exitCodeFor(review([finding("critical")]))).toBe(1);
  });

  it("does not block on warnings alone", () => {
    // The counterpart assertion: proving it blocks is only meaningful
    // beside proof that it does not block everything.
    expect(exitCodeFor(review([finding("warning"), finding("warning")]))).toBe(0);
  });

  it("does not block a clean review", () => {
    expect(exitCodeFor(review([]))).toBe(0);
  });

  it("blocks when one critical hides among warnings", () => {
    const mixed = [finding("warning"), finding("critical"), finding("warning")];
    expect(exitCodeFor(review(mixed))).toBe(1);
  });
});

describe("comment rendering", () => {
  it("puts critical findings before warnings", () => {
    const { md } = render(
      review([finding("warning", { file: "a.ts" }), finding("critical", { file: "b.ts" })]),
      false
    );
    expect(md.indexOf("b.ts")).toBeLessThan(md.indexOf("a.ts"));
  });

  it("carries the failure scenario into the comment", () => {
    // The evidence rule is the reason this reviewer is worth reading; if
    // the scenario is dropped from the output, every finding degrades to
    // an unfalsifiable assertion.
    const { md } = render(review([finding("critical")]), false);
    expect(md).toContain("How it fails:");
    expect(md).toContain("no row is written");
  });

  it("says so, loudly, when the diff was truncated", () => {
    // A partial review that reads as complete is the same defect class
    // the reviewer itself is written to catch.
    const { md } = render(review([]), true);
    expect(md).toMatch(/Partial review/);
    expect(md).toMatch(/not read/);
  });

  it("does not claim partial when the whole diff was read", () => {
    expect(render(review([]), false).md).not.toMatch(/Partial review/);
  });

  it("counts both severities in the header", () => {
    const { md } = render(review([finding("critical"), finding("warning")]), false);
    expect(md).toContain("1 critical · 1 warning");
  });
});
