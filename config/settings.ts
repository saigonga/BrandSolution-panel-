// Operating rules for the panel. Change here, not in code.

// Working days used for fill-rate, streaks and stale flags.
// 0 = Sun, 1 = Mon ... 6 = Sat. Add 6 if Saturday is a working day.
export const WORKING_DAYS = [1, 2, 3, 4, 5];

// Daily lock, India Standard Time. After this, the day is read-only.
export const LOCK_HOUR = 23;
export const LOCK_MINUTE = 30;

// An active project untouched for this many working days is flagged stale.
export const STALE_WORKING_DAYS = 5;

// How far back a backfill request can reach.
export const BACKFILL_MAX_DAYS = 30;
