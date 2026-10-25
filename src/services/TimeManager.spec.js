import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

/*
 * TimeManager.js depends on a set of runtime globals that the production app
 * injects from CDN <script> tags:
 *   - JSJoda        (a subset of @js-joda/core)
 *   - JSJodaLocale  (a subset of @js-joda/locale_en)
 *   - formatCustomDateTime (a global helper)
 * It also assigns its singleton to the bare global `TimeRangeManager`.
 *
 * None of these are importable in the repo, so the test provides faithful,
 * deterministic fakes covering exactly the API surface the source touches.
 */

// ---------------------------------------------------------------------------
// Minimal faithful fake of the JSJoda API used by TimeManager.js
// ---------------------------------------------------------------------------

const pad = (n) => (n >= 10 ? "" + n : "0" + n);

class FakeLocalDate {
  // Stored as 1-based year/month/day.
  constructor(year, month, day) {
    this._year = year;
    this._month = month;
    this._day = day;
  }

  static _fromJsDate(d) {
    return new FakeLocalDate(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate()
    );
  }

  static now() {
    const d = new Date(globalThis.__FAKE_NOW__);
    return FakeLocalDate._fromJsDate(d);
  }

  _toJsDate() {
    return new Date(Date.UTC(this._year, this._month - 1, this._day));
  }

  plusDays(days) {
    const d = this._toJsDate();
    d.setUTCDate(d.getUTCDate() + days);
    return FakeLocalDate._fromJsDate(d);
  }

  minusDays(days) {
    return this.plusDays(-days);
  }

  minusMonths(months) {
    const d = this._toJsDate();
    d.setUTCMonth(d.getUTCMonth() - months);
    return FakeLocalDate._fromJsDate(d);
  }

  withDayOfMonth(day) {
    return new FakeLocalDate(this._year, this._month, day);
  }

  year() {
    return this._year;
  }

  equals(other) {
    return (
      this._year === other._year &&
      this._month === other._month &&
      this._day === other._day
    );
  }

  // Only the "yyyy-MM-dd" pattern is ever formatted from a LocalDate.
  format(formatter) {
    return formatter._render({
      year: this._year,
      month: this._month,
      day: this._day,
      hour: 0,
      minute: 0,
      second: 0,
    });
  }
}

class FakeLocalDateTime {
  constructor(year, month, day, hour, minute, second) {
    this._year = year;
    this._month = month;
    this._day = day;
    this._hour = hour;
    this._minute = minute;
    this._second = second;
  }

  static now() {
    const d = new Date(globalThis.__FAKE_NOW__);
    return new FakeLocalDateTime(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds()
    );
  }

  // Parses strictly "yyyy-MM-dd HH:mm:ss".
  static parse(str /*, formatter */) {
    const m = String(str).match(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
    );
    if (!m) {
      throw new Error("Unparseable date: " + str);
    }
    return new FakeLocalDateTime(
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6])
    );
  }

  toLocalDate() {
    return new FakeLocalDate(this._year, this._month, this._day);
  }

  _toJsDate() {
    return new Date(
      Date.UTC(
        this._year,
        this._month - 1,
        this._day,
        this._hour,
        this._minute,
        this._second
      )
    );
  }

  format(formatter) {
    return formatter._render({
      year: this._year,
      month: this._month,
      day: this._day,
      hour: this._hour,
      minute: this._minute,
      second: this._second,
    });
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

class FakeDateTimeFormatter {
  constructor(pattern) {
    this._pattern = pattern;
    this._locale = null;
  }

  static ofPattern(pattern) {
    return new FakeDateTimeFormatter(pattern);
  }

  withLocale(locale) {
    this._locale = locale;
    return this;
  }

  // Renders only the patterns that appear in TimeManager.js.
  _render(parts) {
    switch (this._pattern) {
      case "yyyy-MM-dd HH:mm:ss":
        return (
          parts.year +
          "-" +
          pad(parts.month) +
          "-" +
          pad(parts.day) +
          " " +
          pad(parts.hour) +
          ":" +
          pad(parts.minute) +
          ":" +
          pad(parts.second)
        );
      case "yyyy-MM-dd":
        return parts.year + "-" + pad(parts.month) + "-" + pad(parts.day);
      case "HH:mm":
        return pad(parts.hour) + ":" + pad(parts.minute);
      case "E dd MMM, HH:ss": {
        const jsDate = new Date(
          Date.UTC(parts.year, parts.month - 1, parts.day)
        );
        const dow = DOW[(jsDate.getUTCDay() + 6) % 7];
        return (
          dow +
          " " +
          pad(parts.day) +
          " " +
          MONTHS[parts.month - 1] +
          ", " +
          pad(parts.hour) +
          ":" +
          pad(parts.second)
        );
      }
      case "dd/MM/yyyy, HH:ss":
        return (
          pad(parts.day) +
          "/" +
          pad(parts.month) +
          "/" +
          parts.year +
          ", " +
          pad(parts.hour) +
          ":" +
          pad(parts.second)
        );
      default:
        throw new Error("Unsupported pattern: " + this._pattern);
    }
  }
}

const FakeDuration = {
  between(a, b) {
    const ms = b._toJsDate().getTime() - a._toJsDate().getTime();
    return {
      toDays() {
        // Truncates toward zero like java.time.Duration#toDays.
        return Math.trunc(ms / (24 * 60 * 60 * 1000));
      },
    };
  },
};

// `formatCustomDateTime` global used by shortenStandardDisplay — render the
// LocalDateTime with the given formatter, prefixed so we can assert it ran.
const formatCustomDateTimeFake = (dateTime, formatter) =>
  "CUSTOM:" + dateTime.format(formatter);

// ---------------------------------------------------------------------------
// Install globals and import the module under test (it reads globals + writes
// the `TimeRangeManager` global at import time).
// ---------------------------------------------------------------------------

let TimeManager;
let restoreNow;

// Fix "now" to a known instant: 2024-03-15 09:08:07 UTC (a Friday).
const FIXED_NOW = Date.UTC(2024, 2, 15, 9, 8, 7);

beforeAll(async () => {
  globalThis.__FAKE_NOW__ = FIXED_NOW;

  vi.stubGlobal("JSJoda", {
    LocalDate: FakeLocalDate,
    LocalDateTime: FakeLocalDateTime,
    DateTimeFormatter: FakeDateTimeFormatter,
    Duration: FakeDuration,
  });
  vi.stubGlobal("JSJodaLocale", { Locale: { ENGLISH: "en" } });
  vi.stubGlobal("formatCustomDateTime", formatCustomDateTimeFake);

  restoreNow = () => {
    delete globalThis.__FAKE_NOW__;
  };

  const mod = await import("@/services/TimeManager");
  TimeManager = mod.default;
});

afterAll(() => {
  vi.unstubAllGlobals();
  if (restoreNow) restoreNow();
});

// Helpers that mirror the module's expectations against FIXED_NOW.
const NOW = "2024-03-15"; // today
const TOMORROW = "2024-03-16";
const YESTERDAY = "2024-03-14";

describe("TimeManager singleton", () => {
  it("exports a TimeRangeManager instance as the default export", () => {
    expect(TimeManager).toBeDefined();
    expect(typeof TimeManager.getNow).toBe("function");
    // The default export is the singleton produced by the import-time
    // `export default TimeRangeManager = new TimeRangeManager()` statement.
    expect(TimeManager.constructor.name).toBe("TimeRangeManager");
  });

  // addIntForDate is exercised indirectly; cover both ternary branches:
  // FIXED_NOW month (3 -> "03", padded) and day (15 -> "15", not padded).
  it("pads single-digit and leaves double-digit date parts (addIntForDate branches)", () => {
    // March (3) is single digit -> padded; 15 is double digit -> not padded.
    expect(TimeManager.getNow()).toBe(NOW);
  });
});

describe("getNow / getNowMinusDays", () => {
  it("getNow returns today as yyyy-MM-dd", () => {
    expect(TimeManager.getNow()).toBe(NOW);
  });

  it("getNowMinusDays subtracts the given number of days", () => {
    expect(TimeManager.getNowMinusDays(1)).toBe(YESTERDAY);
    expect(TimeManager.getNowMinusDays(15)).toBe("2024-02-29"); // leap year
  });
});

describe("preset ranges", () => {
  it("getToday returns From=today, To=tomorrow", () => {
    expect(TimeManager.getToday()).toEqual({ From: NOW, To: TOMORROW });
  });

  it("getYesterday returns yesterday for both bounds", () => {
    expect(TimeManager.getYesterday()).toEqual({
      From: YESTERDAY,
      To: YESTERDAY,
    });
  });

  it("getLastWeek returns 7-days-ago to today", () => {
    expect(TimeManager.getLastWeek()).toEqual({
      From: "2024-03-08",
      To: NOW,
    });
  });

  it("getThisMonth returns first-of-month to today", () => {
    expect(TimeManager.getThisMonth()).toEqual({
      From: "2024-03-01",
      To: NOW,
    });
  });

  it("getPreviousMonth returns first-of-last-month to first-of-this-month", () => {
    expect(TimeManager.getPreviousMonth()).toEqual({
      From: "2024-02-01",
      To: "2024-03-01",
    });
  });

  it("getThisYear returns Jan 1st to today", () => {
    expect(TimeManager.getThisYear()).toEqual({
      From: "2024-01-01",
      To: NOW,
    });
  });
});

describe("getDateDiff / isGreaterThanTwoMonths", () => {
  it("getDateDiff returns whole-day difference", () => {
    expect(TimeManager.getDateDiff("2024-01-01", "2024-01-11")).toBe(10);
    expect(TimeManager.getDateDiff("2024-03-01", "2024-01-01")).toBe(-60);
  });

  it("isGreaterThanTwoMonths true when span >= 60 days", () => {
    expect(
      TimeManager.isGreaterThanTwoMonths({ From: "2024-01-01", To: "2024-03-15" })
    ).toBe(true); // 74 days
  });

  it("isGreaterThanTwoMonths false when span < 60 days", () => {
    expect(
      TimeManager.isGreaterThanTwoMonths({ From: "2024-01-01", To: "2024-02-01" })
    ).toBe(false); // 31 days
  });
});

describe("shortenDisplay", () => {
  it("returns Invalid Date message for falsy input (guard branch)", () => {
    expect(TimeManager.shortenDisplay("")).toBe("Invalid Date : ");
    expect(TimeManager.shortenDisplay(null)).toBe("Invalid Date : null");
    expect(TimeManager.shortenDisplay(undefined)).toBe(
      "Invalid Date : undefined"
    );
  });

  it("formats same-day dates with 'Today at' (HH:mm)", () => {
    // FIXED_NOW is 2024-03-15 09:08:07 -> Today at 09:08
    expect(TimeManager.shortenDisplay("2024-03-15 09:08:07")).toBe(
      "Today at 09:08"
    );
  });

  it("formats same-year, different-day dates with thisYearFormat", () => {
    // 2024-02-10 is a Saturday; pattern "E dd MMM, HH:ss"
    expect(TimeManager.shortenDisplay("2024-02-10 14:30:45")).toBe(
      "Sat 10 Feb, 14:45"
    );
  });

  it("formats other-year dates with otherYearFormat", () => {
    // pattern "dd/MM/yyyy, HH:ss"
    expect(TimeManager.shortenDisplay("2022-12-25 23:59:01")).toBe(
      "25/12/2022, 23:01"
    );
  });
});

describe("shortenStandardDisplay", () => {
  it("returns null for falsy input (guard branch)", () => {
    expect(TimeManager.shortenStandardDisplay("")).toBeNull();
    expect(TimeManager.shortenStandardDisplay(null)).toBeNull();
    expect(TimeManager.shortenStandardDisplay(undefined)).toBeNull();
  });

  it("replaces 'T' separator and formats same-day with 'Today at' via formatCustomDateTime", () => {
    expect(TimeManager.shortenStandardDisplay("2024-03-15T09:08:07")).toBe(
      "Today at CUSTOM:09:08"
    );
  });

  it("formats same-year, different-day via formatCustomDateTime (thisYearFormat)", () => {
    expect(TimeManager.shortenStandardDisplay("2024-02-10T14:30:45")).toBe(
      "CUSTOM:Sat 10 Feb, 14:45"
    );
  });

  it("formats other-year via formatCustomDateTime (otherYearFormat)", () => {
    expect(TimeManager.shortenStandardDisplay("2022-12-25T23:59:01")).toBe(
      "CUSTOM:25/12/2022, 23:01"
    );
  });
});

describe("shortJavaDateTimeObject", () => {
  it("builds a parsed date string and delegates to shortenDisplay (today)", () => {
    const javaObj = {
      date: { year: 2024, month: 3, day: 15 },
      time: { hour: 9, minute: 8 },
    };
    // Note: source uses time.minute for the seconds slot as well.
    expect(TimeManager.shortJavaDateTimeObject(javaObj)).toBe(
      "Today at 09:08"
    );
  });

  it("delegates to shortenDisplay for non-today dates", () => {
    const javaObj = {
      date: { year: 2022, month: 12, day: 25 },
      time: { hour: 23, minute: 1 },
    };
    expect(TimeManager.shortJavaDateTimeObject(javaObj)).toBe(
      "25/12/2022, 23:01"
    );
  });
});
