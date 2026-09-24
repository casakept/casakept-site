// CasaKept only serves the DFW area, so every "today"/date-range check
// needs to anchor to the business's Central calendar date, not the server
// or customer's UTC clock -- otherwise a booking for "today" locally can
// look like it's already in the past (or "tomorrow" arrives a day early)
// for several hours each evening once UTC rolls over to the next date.
const BUSINESS_TIMEZONE = "America/Chicago";

// YYYY-MM-DD as it reads on a calendar in Central time, for a given instant
// (defaults to now). Works in both server and browser code.
export function businessDateISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// A UTC-midnight Date whose calendar date matches a given instant's date in
// Central time (defaults to now). Once anchored, it's safe to do further
// day/month arithmetic on it with the UTC getters/setters (getUTCDate,
// setUTCDate, getUTCMonth, ...) without crossing timezones again.
export function businessDateAnchor(date: Date = new Date()): Date {
  const [year, month, day] = businessDateISO(date).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Human-readable "Sep 23, 2026, 4:32 PM CDT" in Central time, for stamping
// onto checklist photos so a visit's photo timing isn't disputable later.
export function businessTimestampLabel(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  const tzAbbr =
    new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIMEZONE, timeZoneName: "short" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "CT";
  return `${formatted} ${tzAbbr}`;
}
