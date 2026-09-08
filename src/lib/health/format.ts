/** Small pure helpers for the app's screens. All take an optional `now`
 *  so they are testable without faking timers. */

const pad = (n: number) => String(n).padStart(2, "0");

export function relativeTime(iso: string, now: Date = new Date()): string {
  const sec = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} h ago`;
  const days = Math.floor(sec / 86_400);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
export function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local string (local time) → ISO 8601; "" when unparseable. */
export function fromDatetimeLocal(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Monday 00:00 local of the week containing `now`. */
export function startOfWeek(now: Date = new Date()): Date {
  const d = startOfToday(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
