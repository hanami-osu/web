export const DELETION_CONFIRMATION_PHRASE = "DELETE MY DATA";
export const REAUTHENTICATION_WINDOW_MS = 15 * 60 * 1000;
export const DELETION_GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export interface DeletionScopes {
    account: boolean;
    bot: boolean;
    osuGuessr: boolean;
}

/** Deleting the Hanami account always removes Bot data, because the Bot link belongs to the account. */
export function normalizeDeletionScopes(value: unknown): DeletionScopes | null {
    if (typeof value !== "object" || value === null) return null;
    const { account, bot, osuGuessr } = value as Record<string, unknown>;
    if (typeof account !== "boolean" || typeof bot !== "boolean" || typeof osuGuessr !== "boolean") return null;
    if (!account && !bot && !osuGuessr) return null;
    return { account, bot: bot || account, osuGuessr };
}

export function normalizeConfirmationPhrase(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

export function isValidConfirmationPhrase(value: unknown): boolean {
    return typeof value === "string" && normalizeConfirmationPhrase(value) === DELETION_CONFIRMATION_PHRASE;
}

export function isFreshAuthentication(sessionCreatedAt: Date, now = Date.now()): boolean {
    const age = now - sessionCreatedAt.getTime();
    return age >= 0 && age < REAUTHENTICATION_WINDOW_MS;
}

export function createChallengeToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export async function hashChallengeToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Buffer.from(digest).toString("hex");
}
