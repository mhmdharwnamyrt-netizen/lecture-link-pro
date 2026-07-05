// Shared sort/filter helpers so the student dashboard (break mode) and the
// full Trainings page always show the same order.

export type TrainingLike = {
  id: string;
  type: string;
  deadline?: string | null;
  created_at?: string;
  [k: string]: any;
};

export type TrainingFilter = 'all' | 'university' | 'company';

/**
 * Sort rules (soonest-first):
 *   1. Upcoming deadlines, ascending by date
 *   2. No deadline (open) records — recent first
 *   3. Already-expired deadlines last
 */
export function sortTrainings<T extends TrainingLike>(items: T[]): T[] {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const da = a.deadline ? new Date(a.deadline).getTime() : null;
    const db = b.deadline ? new Date(b.deadline).getTime() : null;
    const aUp = da !== null && da >= now;
    const bUp = db !== null && db >= now;
    if (aUp && bUp) return da! - db!;
    if (aUp) return -1;
    if (bUp) return 1;
    // Neither upcoming
    if (da === null && db === null) {
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return cb - ca;
    }
    if (da === null) return -1; // open beats expired
    if (db === null) return 1;
    return db - da; // both expired → most recently expired first
  });
}

export function filterTrainings<T extends TrainingLike>(items: T[], f: TrainingFilter): T[] {
  return f === 'all' ? items : items.filter(i => i.type === f);
}

export function deadlineMeta(deadline?: string | null) {
  if (!deadline) return { dl: null, daysLeft: null, urgent: false, expired: false };
  const dl = new Date(deadline);
  const daysLeft = Math.ceil((dl.getTime() - Date.now()) / 86400000);
  return { dl, daysLeft, urgent: daysLeft >= 0 && daysLeft <= 7, expired: daysLeft < 0 };
}
