export type OsuGuessrDeletionAction = "hide" | "restore" | "purge";

export type OsuGuessrDeletionClient = (osuId: string, action: OsuGuessrDeletionAction) => Promise<void>;

const REQUEST_TIMEOUT_MS = 10_000;

interface OsuGuessrDeletionConfig {
    url: string;
    secret: string;
}

/** Read lazily so the Docker build, which has no osu!guessr settings, does not fail at import time. */
export function getOsuGuessrDeletionConfig(environment: NodeJS.ProcessEnv = process.env): OsuGuessrDeletionConfig {
    const baseUrl = environment.OSU_GUESSR_INTERNAL_URL;
    const secret = environment.OSU_GUESSR_INTERNAL_SECRET;
    if (!baseUrl) throw new Error("OSU_GUESSR_INTERNAL_URL environment variable is not set.");
    if (!secret) throw new Error("OSU_GUESSR_INTERNAL_SECRET environment variable is not set.");
    if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("OSU_GUESSR_INTERNAL_SECRET must contain at least 32 bytes.");
    return { url: new URL("/api/internal/account-deletion", baseUrl).toString(), secret };
}

export function createOsuGuessrDeletionClient(
    getConfig: () => OsuGuessrDeletionConfig = getOsuGuessrDeletionConfig,
    fetchImpl: typeof fetch = fetch,
): OsuGuessrDeletionClient {
    return async (osuId, action) => {
        const banchoId = Number(osuId);
        if (!Number.isSafeInteger(banchoId) || banchoId <= 0) throw new Error("Invalid osu! ID for osu!guessr deletion.");

        const { url, secret } = getConfig();
        const response = await fetchImpl(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({ banchoId, action }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`osu!guessr ${action} request failed with status ${response.status}.`);
    };
}
