# LeetRev Test Suite

This directory contains the automated unit tests, verification suites, and execution logs for the core business logic of **LeetRev**.

## Contents

- **[`scheduling.test.ts`](file:///c:/Users/paula/Desktop/coding/projects/leet/test/scheduling.test.ts)**: Unit test suite for spaced repetition scheduling, date/calendar boundary computations, cadence preservation, and habit streak algorithms.
- **[`test_results.txt`](file:///c:/Users/paula/Desktop/coding/projects/leet/test/test_results.txt)**: Formatted raw execution log from the latest test run.

## Test Coverage Breakdown

| Test Suite | Tests | Description |
| :--- | :---: | :--- |
| **`todayInTimezone`** | 2 | Calendar date formatting (YYYY-MM-DD) across multiple IANA timezones (UTC, America/New_York, Asia/Kolkata) and empty string fallback. |
| **`addDaysToDate`** | 4 | Day arithmetic: same-month additions, month rollovers, leap year rollovers (2024 vs 2025), and year rollovers. |
| **`intervalLabel`** | 1 | Correct human-readable interval labeling (e.g. `1-day`, `7-day`, `30-day`). |
| **`daysUntil`** | 1 | Difference in calendar days between past, present, and future dates. |
| **`seedRevisionsFromSolved`** | 3 | Initial pending revision row seeding: interval deduplication, filtering out non-positive/zero numbers, and empty array handling. |
| **`nextRevisionAfterComplete`** | 1 | **Cadence Preservation Rule**: Ensures the next occurrence is calculated as `scheduled_date + interval` (not completion date) so rhythm is preserved. |
| **`isOverdue & isDueTodayOrEarlier`** | 2 | Boundary conditions for overdue detection strictly before `today` vs due today. |
| **`formatNextRevision`** | 4 | Human countdown string generation (`overdue by X days`, `today`, `in 1 day`, `in X days`, `No schedule`). |
| **`calculateStreaks`** | 5 | **Intelligent Streak Engine**: Verifies that active days increment streak, **rest days** (0 due revisions) preserve streak without breaking, and **missed days** (uncompleted due revisions) reset streak. |

## How to Run Tests

Run the test suite using npm:

```bash
npm test
```

Or using the specific scheduling script:

```bash
npm run test:scheduling
```

Direct execution using tsx:

```bash
npx tsx test/scheduling.test.ts
```

## Latest Test Run Results

```
Suites:    10
Tests:     23
Passed:    23
Failed:    0
Skipped:   0
Duration:  ~29ms
Status:    100% Pass
```
