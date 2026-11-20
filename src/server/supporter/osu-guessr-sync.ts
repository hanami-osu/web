import type { PrismaClient } from "../../generated/prisma/web/client";
import { getOsuGuessrInternalConfig, type OsuGuessrDeletionConfig } from "../deletion-requests/osu-guessr";
import { logSafeFailure } from "../security/http";
import { PrismaSupporterStore, type SupporterBadgeDelivery } from "./store";

const REQUEST_TIMEOUT_MS = 10_000;

interface SyncDependencies {
    findOsuId(userId: string): Promise<string | null>;
    getConfig(): OsuGuessrDeletionConfig | null;
    fetch: typeof fetch;
}

/** Pushes supporter changes to osu!guessr so badges update without the player signing in again. */
export function createOsuGuessrSupporterSync(dependencies: SyncDependencies): SupporterBadgeDelivery {
    return async (userId: string) => {
        const config = dependencies.getConfig();
        if (!config) return false;
        const osuId = await dependencies.findOsuId(userId);
        const banchoId = Number(osuId);
        if (!osuId || !Number.isSafeInteger(banchoId) || banchoId <= 0) return false;

        const response = await dependencies.fetch(config.url, {
            method: "POST",
            headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                banchoId,
                badge: true,
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`osu!guessr supporter sync failed with status ${response.status}.`);
        return true;
    };
}

export function startSupporterSyncJob(store: PrismaSupporterStore): () => void {
    let running = false;
    async function run() {
        if (running) return;
        running = true;
        try {
            await store.retryPendingBadgeSync();
        } catch (error) {
            logSafeFailure("retry pending supporter badges", error);
        } finally {
            running = false;
        }
    }
    void run();
    const timer = setInterval(() => void run(), 60_000);
    timer.unref?.();
    return () => clearInterval(timer);
}

/** The supporter store used by the app and scripts, wired to push changes to osu!guessr when it is configured. */
export function createSupporterStore(prisma: PrismaClient): PrismaSupporterStore {
    return new PrismaSupporterStore(
        prisma,
        createOsuGuessrSupporterSync({
            findOsuId: async (userId) =>
                (await prisma.osuProfile.findUnique({ where: { userId }, select: { osuId: true } }))?.osuId ?? null,
            getConfig: () => {
                if (!process.env.OSU_GUESSR_INTERNAL_URL || !process.env.OSU_GUESSR_INTERNAL_SECRET) return null;
                return getOsuGuessrInternalConfig("/api/internal/supporter");
            },
            fetch,
        }),
    );
}
