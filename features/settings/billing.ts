export const TRIAL_DAYS = 14
const DAY = 86_400_000

/** End of the free trial: `created_at` + 14 days. */
export const trialEnd = (createdAt: string) => new Date(new Date(createdAt).getTime() + TRIAL_DAYS * DAY).toISOString()

/** Whole days left until `end` (never negative). */
export const trialDaysLeft = (end: string, now = Date.now()) => Math.max(0, Math.ceil((new Date(end).getTime() - now) / DAY))
