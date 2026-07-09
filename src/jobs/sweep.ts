import { sweepExpired } from "../requests/service.js";

export interface SweepRunner {
  stop(): void;
}

// Periodically marks past-SLA pending contact requests as expired.
// onSweep receives the number expired per tick (used in tests and logging).
export function startSweep(
  intervalMs: number,
  onSweep?: (expired: number) => void,
): SweepRunner {
  const timer = setInterval(async () => {
    const n = await sweepExpired();
    onSweep?.(n);
  }, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}
