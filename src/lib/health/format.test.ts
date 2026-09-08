import { test, expect } from "vitest";
import {
  relativeTime, toDatetimeLocal, fromDatetimeLocal, startOfToday, startOfWeek,
  initials, firstName, greeting,
} from "@/lib/health/format";

test("relativeTime buckets", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  expect(relativeTime("2026-09-08T11:59:40Z", now)).toBe("Just now");
  expect(relativeTime("2026-09-08T11:35:00Z", now)).toBe("25 min ago");
  expect(relativeTime("2026-09-08T08:00:00Z", now)).toBe("4 h ago");
  expect(relativeTime("2026-09-07T10:00:00Z", now)).toBe("Yesterday");
  expect(relativeTime("2026-09-04T10:00:00Z", now)).toBe("4 days ago");
  expect(relativeTime("2026-08-12T10:00:00Z", now)).toBe("12 Aug");
});

test("datetime-local round trip is local time", () => {
  const d = new Date(2026, 8, 8, 9, 12);
  expect(toDatetimeLocal(d)).toBe("2026-09-08T09:12");
  expect(new Date(fromDatetimeLocal("2026-09-08T09:12")).getTime()).toBe(d.getTime());
  expect(fromDatetimeLocal("")).toBe("");
});

test("startOfToday and startOfWeek (weeks start Monday)", () => {
  const wed = new Date(2026, 8, 9, 15, 30);
  expect(startOfToday(wed).getTime()).toBe(new Date(2026, 8, 9).getTime());
  expect(startOfWeek(wed).getTime()).toBe(new Date(2026, 8, 7).getTime());
  const sun = new Date(2026, 8, 13, 8);
  expect(startOfWeek(sun).getTime()).toBe(new Date(2026, 8, 7).getTime());
});

test("name helpers", () => {
  expect(initials("Stefan Gravesande")).toBe("SG");
  expect(initials("hannah")).toBe("H");
  expect(initials("")).toBe("A");
  expect(firstName("Stefan Gravesande")).toBe("Stefan");
  expect(greeting(new Date(2026, 8, 8, 9))).toBe("Good morning");
  expect(greeting(new Date(2026, 8, 8, 14))).toBe("Good afternoon");
  expect(greeting(new Date(2026, 8, 8, 19))).toBe("Good evening");
});
