import logger from './Logger';

export type DailyTask = () => Promise<void> | void;

function parseTimeToNextDelay(timeHHMM: string): number {
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hh, mm, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/**
 * Schedule a task to run daily at the specified local time (HH:mm).
 * Returns a function to cancel the schedule.
 */
export function scheduleDaily(label: string, timeHHMM: string, task: DailyTask): () => void {
  let cancelled = false;
  let interval: NodeJS.Timeout | null = null;
  let timeout: NodeJS.Timeout | null = null;

  const scheduleNext = () => {
    const delay = parseTimeToNextDelay(timeHHMM);
    const when = new Date(Date.now() + delay);
    logger.updates(`[Scheduler:${label}] Next run at ${when.toLocaleString()}`);
    timeout = setTimeout(async () => {
      if (cancelled) return;
      try {
        logger.updates(`[Scheduler:${label}] Starting task`);
        await task();
        logger.updates(`[Scheduler:${label}] Task completed`);
      } catch (err: any) {
        logger.error(`[Scheduler:${label}] Task failed: ${err?.message ?? err}`);
      } finally {
        if (!cancelled) scheduleNext(); // schedule again for the next day
      }
    }, delay);
  };

  scheduleNext();

  return () => {
    cancelled = true;
    if (timeout) clearTimeout(timeout);
    if (interval) clearInterval(interval);
  };
}
