import { logSafeFailure } from "../security/http";
import type { PurgeResult } from "./store";

const PURGE_INTERVAL_MS = 5 * 60 * 1000;

interface PurgeTarget {
    purgeDue(now: Date): Promise<PurgeResult>;
}

/** Runs due deletions at startup and on an interval. Overlapping runs are skipped; one web instance is assumed. */
export function startDeletionPurgeJob(target: PurgeTarget, intervalMs = PURGE_INTERVAL_MS): () => void {
    let running = false;

    async function run(): Promise<void> {
        if (running) return;
        running = true;
        try {
            const result = await target.purgeDue(new Date());
            if (result.failed > 0) console.error("Scheduled deletions failed and will be retried", result);
        } catch (error) {
            logSafeFailure("run scheduled deletions", error);
        } finally {
            running = false;
        }
    }

    void run();
    const timer = setInterval(() => void run(), intervalMs);
    timer.unref?.();
    return () => clearInterval(timer);
}
