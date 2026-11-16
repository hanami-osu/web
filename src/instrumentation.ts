export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;

    const [{ startDeletionPurgeJob }, { accountDeletionStore }] = await Promise.all([
        import("./server/deletion-requests/purge-job"),
        import("./server/deletion-requests/routes"),
    ]);
    startDeletionPurgeJob(accountDeletionStore);
}
