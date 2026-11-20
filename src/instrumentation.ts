export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;

    const [{ startDeletionPurgeJob }, { accountDeletionStore }, { createSupporterStore, startSupporterSyncJob }, { webPrisma }] =
        await Promise.all([
            import("./server/deletion-requests/purge-job"),
            import("./server/deletion-requests/routes"),
            import("./server/supporter/osu-guessr-sync"),
            import("./server/database/web"),
        ]);
    startDeletionPurgeJob(accountDeletionStore);
    startSupporterSyncJob(createSupporterStore(webPrisma));
}
